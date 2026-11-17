#!/usr/bin/env python3
"""Verify Batch 02 packet integrity without third-party dependencies.

Run from any directory. Default mode requires all ten originals;
--allow-partial accepts completed pairs (2, 4, 6 or 8) as checkpoints.
An optional refinement manifest is checked separately after all ten originals;
refinements never increase the completed concept count.
This checks recorded identity and PNG structure, not artistic acceptance,
decoded alpha statistics, rights, browser appearance or deployment.
Absolute source_file provenance strings are compared as metadata only;
they are never opened. Every packet file actually opened must be a safe,
repository-relative, nonsymlink path within this batch's owned folders.
"""

import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import stat
import struct
import sys
import zlib


EXPECTED_KEYS = (
    "kubernetes", "istio", "tekton", "kustomize", "minikube", "gcp",
    "react", "technology", "general", "hiking",
)
DOC = "docs/design/category-expansion/batch-02"
ORIGINALS = "public/artwork/category-expansion-v1/batch-02/originals"
REFINEMENTS = "public/artwork/category-expansion-v1/batch-02/refinements"
ROOT = Path(__file__).absolute().parents[4]
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"
SHA256 = re.compile(r"^[0-9a-f]{64}$")


class VerificationError(ValueError):
    """The packet is incomplete, inconsistent or structurally invalid."""


def require(condition, message):
    if not condition:
        raise VerificationError(message)


def integer(value, label, minimum=0):
    require(type(value) is int and value >= minimum,
            f"{label}: expected integer >= {minimum}")
    return value


def object_value(value, label):
    require(isinstance(value, dict), f"{label}: expected object")
    return value


def array_value(value, label):
    require(isinstance(value, list), f"{label}: expected array")
    return value


def hash_value(value, label):
    require(isinstance(value, str) and SHA256.fullmatch(value) is not None,
            f"{label}: expected lowercase SHA-256")
    return value


def safe_file(relative, prefix):
    """Resolve a regular packet file without following symlinks."""
    require(isinstance(relative, str) and bool(relative), "file path must be nonempty")
    parts = relative.split("/")
    require(not relative.startswith("/") and "\\" not in relative
            and ":" not in relative and "\x00" not in relative
            and all(part not in ("", ".", "..") for part in parts),
            f"unsafe packet path: {relative!r}")
    rel = PurePosixPath(relative)
    require(not rel.is_absolute() and rel.is_relative_to(PurePosixPath(prefix)),
            f"path is outside allowed folder {prefix}: {relative!r}")
    require(ROOT.resolve() == ROOT, "repository root or its parent is a symlink")
    cursor = ROOT
    for part in rel.parts:
        cursor = cursor / part
        mode = cursor.lstat().st_mode
        require(not stat.S_ISLNK(mode), f"symlink is forbidden: {relative}")
    require(stat.S_ISREG(cursor.lstat().st_mode), f"not a regular file: {relative}")
    require(cursor.resolve().is_relative_to(ROOT), f"path escapes repository: {relative}")
    return cursor


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        require(key not in result, f"duplicate JSON property: {key}")
        result[key] = value
    return result


def read_json(filename):
    path = safe_file(f"{DOC}/{filename}", DOC)
    return json.loads(path.read_text(encoding="utf-8"), object_pairs_hook=unique_object)


def index_records(records, key_field, label):
    result = {}
    for number, value in enumerate(array_value(records, label), start=1):
        record = object_value(value, f"{label}[{number}]")
        key = record.get(key_field)
        require(isinstance(key, str) and key in EXPECTED_KEYS,
                f"{label}[{number}]: unknown topic key {key!r}")
        require(key not in result, f"{label}: duplicate topic key {key}")
        result[key] = record
    return result


def inspect_png(data, label):
    """Validate chunk boundaries/CRCs and the RGBA IHDR/IEND contract."""
    require(data.startswith(PNG_SIGNATURE), f"{label}: invalid PNG signature")
    offset = len(PNG_SIGNATURE)
    dimensions = None
    seen_idat = False
    idat_ended = False
    idat_bytes = 0
    seen_plte = False
    while offset < len(data):
        require(offset + 12 <= len(data), f"{label}: truncated chunk header")
        length = struct.unpack_from(">I", data, offset)[0]
        require(length <= 0x7fffffff, f"{label}: invalid chunk length")
        kind = data[offset + 4:offset + 8]
        require(len(kind) == 4 and all(65 <= b <= 90 or 97 <= b <= 122 for b in kind),
                f"{label}: invalid chunk type")
        end = offset + 12 + length
        require(end <= len(data), f"{label}: truncated {kind.decode()} chunk")
        payload = data[offset + 8:offset + 8 + length]
        crc = struct.unpack_from(">I", data, offset + 8 + length)[0]
        require((zlib.crc32(kind + payload) & 0xffffffff) == crc,
                f"{label}: {kind.decode()} CRC mismatch")
        require(dimensions is not None or kind == b"IHDR", f"{label}: IHDR must be first")
        if kind == b"IHDR":
            require(dimensions is None and length == 13, f"{label}: invalid/duplicate IHDR")
            width, height, depth, colour, compression, filtering, interlace = struct.unpack(
                ">IIBBBBB", payload)
            require(0 < width <= 0x7fffffff and 0 < height <= 0x7fffffff,
                    f"{label}: invalid dimensions")
            require(colour == 6 and depth in (8, 16), f"{label}: expected RGBA PNG")
            require(compression == 0 and filtering == 0 and interlace in (0, 1),
                    f"{label}: invalid PNG encoding methods")
            dimensions = (width, height)
        elif kind == b"PLTE":
            require(not seen_plte and not seen_idat and 0 < length <= 768 and length % 3 == 0,
                    f"{label}: invalid PLTE")
            seen_plte = True
        elif kind == b"IDAT":
            require(not idat_ended, f"{label}: noncontiguous IDAT chunks")
            seen_idat = True
            idat_bytes += length
        elif kind == b"IEND":
            require(length == 0 and seen_idat and idat_bytes > 0, f"{label}: invalid IEND/data")
            require(end == len(data), f"{label}: bytes after IEND")
            return dimensions
        else:
            require(kind[0] & 0x20, f"{label}: unsupported critical chunk {kind.decode()}")
        if seen_idat and kind != b"IDAT":
            idat_ended = True
        offset = end
    raise VerificationError(f"{label}: missing IEND")


def verify_refinements(originals):
    """Check optional generated edits without treating them as new concepts."""
    manifest_path = ROOT / DOC / "refinement-manifest.json"
    require(not manifest_path.is_symlink(), "refinement manifest must not be a symlink")
    if not manifest_path.exists():
        return 0
    manifest = object_value(read_json("refinement-manifest.json"), "refinement manifest")
    require(manifest.get("schema_version") == 1, "unsupported refinement schema_version")
    require(len(originals) == 10, "refinements require the complete 10/10 original concept inventory")
    records = array_value(manifest.get("images"), "refinement images")
    count = integer(manifest.get("completed_refinement_count"), "completed_refinement_count", 1)
    require(count == len(records), "declared refinement count does not equal refinement image count")
    expected = set()
    for number, value in enumerate(records, start=1):
        record = object_value(value, f"refinements[{number}]")
        key = record.get("key")
        require(isinstance(key, str) and key in originals, f"refinement {number}: unknown original key")
        label = f"{key} refinement {number}"
        filename = record.get("filename")
        require(isinstance(filename, str) and "/" not in filename and "\\" not in filename
                and ":" not in filename and filename.endswith(".png") and filename not in expected,
                f"{label}: unsafe or duplicate refinement filename")
        relative = f"{REFINEMENTS}/{filename}"
        require(record.get("path") == relative, f"{label}: output path/filename mismatch")
        path = safe_file(record["path"], REFINEMENTS)
        expected.add(filename)
        original = originals[key]
        require(record.get("input_file") == original["path"], f"{label}: input is not the matching original")
        input_path = safe_file(record["input_file"], ORIGINALS)
        if "input" in record:
            require(record["input"] == input_path.name, f"{label}: input filename mismatch")
        input_digest = hash_value(record.get("input_sha256"), f"{label} input_sha256")
        require(input_digest == original["sha256"]
                and hashlib.sha256(input_path.read_bytes()).hexdigest() == input_digest,
                f"{label}: input original SHA-256 mismatch")
        prompt = record.get("prompt")
        require(isinstance(prompt, str) and bool(prompt), f"{label}: missing exact prompt")
        request = object_value(record.get("exact_request"), f"{label} exact request")
        require(request.get("prompt") == prompt, f"{label}: exact_request.prompt mismatch")
        require(hash_value(record.get("prompt_sha256"), f"{label} prompt_sha256")
                == hashlib.sha256(prompt.encode("utf-8")).hexdigest(), f"{label}: prompt hash mismatch")
        settings = object_value(record.get("settings"), f"{label} settings")
        for setting, setting_value in settings.items():
            require(setting in request and request[setting] == setting_value,
                    f"{label}: exact request setting mismatch for {setting}")
        digest = hash_value(record.get("sha256"), f"{label} sha256")
        require(hash_value(record.get("source_sha256"), f"{label} source_sha256") == digest,
                f"{label}: output/source SHA-256 mismatch")
        data = path.read_bytes()
        require(integer(record.get("bytes"), f"{label} bytes", 1) == len(data), f"{label}: byte count mismatch")
        require(hashlib.sha256(data).hexdigest() == digest, f"{label}: file SHA-256 mismatch")
        require(record.get("format") == "PNG" and record.get("mode") == "RGBA",
                f"{label}: expected recorded PNG RGBA")
        dimensions = inspect_png(data, label)
        require(dimensions == (integer(record.get("width"), f"{label} width", 1),
                               integer(record.get("height"), f"{label} height", 1)),
                f"{label}: IHDR dimensions disagree with manifest")
        print(f"Verified {label}: {dimensions[0]} x {dimensions[1]} RGBA, {len(data)} bytes")
    actual = set()
    for entry in (ROOT / REFINEMENTS).iterdir():
        require(not entry.is_symlink(), f"symlink is forbidden in refinements: {entry.name}")
        require(not entry.is_dir(), f"unexpected subdirectory in refinements: {entry.name}")
        if entry.suffix.lower() == ".png":
            safe_file(entry.relative_to(ROOT).as_posix(), REFINEMENTS)
            actual.add(entry.name)
    require(actual == expected, "PNG refinement inventory differs from refinement manifest")
    return count


def verify(allow_partial=False):
    safe_file(f"{DOC}/verify.py", DOC)
    manifest = object_value(read_json("manifest.json"), "manifest")
    spec = object_value(read_json("prompts.json"), "prompts")
    require(manifest.get("schema_version") == 1, "unsupported manifest schema_version")
    require(manifest.get("batch") == 2 and spec.get("batch") == 2, "expected batch 02")
    require(integer(manifest.get("target_image_count"), "target_image_count") == 10
            and integer(spec.get("target"), "prompt target") == 10, "target must be 10")
    count = integer(manifest.get("completed_original_image_count"), "completed_original_image_count")
    if "completed_image_count" in manifest:
        require(integer(manifest["completed_image_count"], "completed_image_count") == count,
                "completed image count aliases disagree")
    require(count in ((2, 4, 6, 8, 10) if allow_partial else (10,)),
            f"incomplete/invalid count: {count}/10; --allow-partial accepts completed pairs")
    require(manifest.get("originals_are_unmodified") is True, "original-byte preservation not declared")
    require(manifest.get("base_revision") == spec.get("base_revision"), "source revisions disagree")
    prompts = index_records(spec.get("prompts"), "key", "prompts")
    require(set(prompts) == set(EXPECTED_KEYS), "prompts must contain all ten exact topic keys")
    images = index_records(manifest.get("images"), "topic_key", "images")
    receipts = index_records(read_json("generation-receipts.json"), "key", "receipts")
    require(len(images) == count, "declared count does not equal manifest image count")
    require(set(receipts) == set(images), "receipt keys do not match completed image keys")
    filenames = set()
    for order, key in enumerate(EXPECTED_KEYS, start=1):
        prompt = prompts[key]
        require(integer(prompt.get("order"), f"{key} prompt order", 1) == order,
                f"{key}: incorrect requested order")
        filename = prompt.get("filename")
        require(isinstance(filename, str) and "/" not in filename and "\\" not in filename
                and ":" not in filename and filename.endswith(".png") and filename not in filenames,
                f"{key}: unsafe or duplicate original filename")
        filenames.add(filename)
        require(isinstance(prompt.get("prompt"), str) and bool(prompt["prompt"]),
                f"{key}: missing exact prompt")
        if key not in images:
            continue
        record = images[key]
        receipt = receipts[key]
        source = object_value(record.get("source_identity"), f"{key} source identity")
        relative = f"{ORIGINALS}/{filename}"
        require(record.get("path") == relative and source.get("original_path") == relative
                and receipt.get("original_path") == relative, f"{key}: original paths disagree")
        path = safe_file(record["path"], ORIGINALS)
        require(source.get("key") == key, f"{key}: source key mismatch")
        require(integer(record.get("order"), f"{key} image order", 1) == order,
                f"{key}: image order mismatch")
        require(record.get("taxonomy_status") == "existing" and prompt.get("taxonomy_status") == "existing",
                f"{key}: incorrect taxonomy status")
        require(record.get("existing_label") == prompt.get("existing_label"), f"{key}: label mismatch")
        require(record.get("settings") == prompt.get("settings"), f"{key}: settings mismatch")
        require(record.get("format") == "PNG" and record.get("mode") == "RGBA",
                f"{key}: expected recorded PNG RGBA")
        require(source.get("method") == "unmodified byte copy"
                and receipt.get("method") == "unmodified byte copy", f"{key}: original method mismatch")
        for field in ("source_file", "output_hint", "date"):
            require(source.get(field) == receipt.get(field), f"{key}: {field} provenance mismatch")
        digest = hash_value(record.get("sha256"), f"{key} sha256")
        require(hash_value(source.get("source_sha256"), f"{key} embedded source_sha256") == digest
                and hash_value(receipt.get("source_sha256"), f"{key} receipt source_sha256") == digest,
                f"{key}: original and generated-source digests disagree")
        expected_prompt_hash = hashlib.sha256(prompt["prompt"].encode("utf-8")).hexdigest()
        require(hash_value(record.get("prompt_sha256"), f"{key} prompt_sha256") == expected_prompt_hash,
                f"{key}: exact prompt hash mismatch")
        data = path.read_bytes()
        require(integer(record.get("bytes"), f"{key} bytes", 1) == len(data), f"{key}: byte count mismatch")
        require(hashlib.sha256(data).hexdigest() == digest, f"{key}: file SHA-256 mismatch")
        dimensions = inspect_png(data, key)
        require(dimensions == (integer(record.get("width"), f"{key} width", 1),
                               integer(record.get("height"), f"{key} height", 1)),
                f"{key}: IHDR dimensions disagree with manifest")
        print(f"Verified {key}: {dimensions[0]} x {dimensions[1]} RGBA, {len(data)} bytes")
    original_dir = ROOT / ORIGINALS
    actual = set()
    for entry in original_dir.iterdir():
        require(not entry.is_symlink(), f"symlink is forbidden in originals: {entry.name}")
        require(not entry.is_dir(), f"unexpected subdirectory in originals: {entry.name}")
        if entry.suffix.lower() == ".png":
            safe_file(entry.relative_to(ROOT).as_posix(), ORIGINALS)
            actual.add(entry.name)
    expected = {prompts[key]["filename"] for key in images}
    require(actual == expected, "PNG file inventory differs from completed manifest originals")
    refinement_count = verify_refinements(images)
    state = "complete inventory" if count == 10 else "partial checkpoint"
    print(f"PASS: packet integrity, {count}/10 original images ({state}).")
    if refinement_count:
        print(f"PASS: {refinement_count} additional refinements; original concept count remains {count}/10.")
    print("Visual acceptance, decoded alpha observations and browser checks are separate gates.")
    return count


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--allow-partial", action="store_true", help="accept 2/4/6/8-image checkpoints")
    args = parser.parse_args()
    try:
        verify(args.allow_partial)
    except (VerificationError, OSError, ValueError, KeyError, TypeError) as error:
        print(f"FAIL: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
