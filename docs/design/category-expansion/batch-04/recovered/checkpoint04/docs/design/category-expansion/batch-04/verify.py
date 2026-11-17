#!/usr/bin/env python3
"""Inspect Batch 04 originals without rewriting them.

Run from any directory. --partial permits not-yet-generated planned files.
--json writes measurements; --compare checks hashes against an earlier report.
Exit 0: requested integrity inspection completed; 1: errors; 2: pixels unavailable.
Warnings are observations, not artistic, scientific, accessibility or halo approval.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import struct
import sys
import zlib
from pathlib import Path

PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"
ART_PATH = Path("public/artwork/category-expansion-v1/batch-04/originals")
DOC_PATH = Path("docs/design/category-expansion/batch-04")


def inspect_chunks(data: bytes) -> dict:
    if not data.startswith(PNG_SIGNATURE):
        raise ValueError("Invalid PNG signature")
    offset = len(PNG_SIGNATURE)
    chunks = []
    header = None
    idat_seen = False
    ended = False
    while offset < len(data):
        if len(data) - offset < 12:
            raise ValueError(f"Truncated chunk at byte {offset}")
        length = struct.unpack_from(">I", data, offset)[0]
        kind = data[offset + 4 : offset + 8]
        end = offset + length + 12
        if end > len(data):
            raise ValueError(f"Truncated {kind!r} chunk at byte {offset}")
        payload = data[offset + 8 : offset + 8 + length]
        actual_crc = zlib.crc32(payload, zlib.crc32(kind)) & 0xFFFFFFFF
        expected_crc = struct.unpack_from(">I", data, offset + 8 + length)[0]
        if actual_crc != expected_crc:
            raise ValueError(f"CRC mismatch for {kind!r} at byte {offset}")
        if not chunks and kind != b"IHDR":
            raise ValueError("First chunk is not IHDR")
        if kind == b"IHDR":
            if header is not None or length != 13:
                raise ValueError("Duplicate or malformed IHDR")
            width, height, depth, colour, comp, filt, interlace = struct.unpack(">IIBBBBB", payload)
            if width == 0 or height == 0 or comp != 0 or filt != 0 or interlace not in (0, 1):
                raise ValueError("Invalid IHDR dimensions or methods")
            header = {"width": width, "height": height, "bit_depth": depth,
                      "colour_type": colour, "compression": comp,
                      "filter_method": filt, "interlace": interlace}
        if kind == b"IDAT":
            idat_seen = True
        chunks.append({"type": kind.decode("ascii", "replace"), "bytes": length})
        offset = end
        if kind == b"IEND":
            if length != 0 or offset != len(data):
                raise ValueError("Malformed IEND or trailing bytes")
            ended = True
            break
    if header is None or not idat_seen or not ended:
        raise ValueError("Missing IHDR, IDAT or IEND")
    return {"signature_valid": True, "all_chunk_crcs_valid": True,
            "clean_iend": True, "ihdr": header, "chunks": chunks}


def bbox_record(alpha, threshold: int) -> dict:
    mask = alpha.point(lambda value: 255 if value >= threshold else 0)
    bounds = mask.getbbox()
    width, height = alpha.size
    if bounds is None:
        return {"threshold_inclusive": threshold, "bbox_xyxy_exclusive": None,
                "margins_pixels": None, "margins_percent": None,
                "minimum_margin_percent": None}
    left, top, right, bottom = bounds
    margins = {"left": left, "top": top, "right": width - right, "bottom": height - bottom}
    percentages = {"left": round(100 * left / width, 6),
                   "top": round(100 * top / height, 6),
                   "right": round(100 * (width - right) / width, 6),
                   "bottom": round(100 * (height - bottom) / height, 6)}
    return {"threshold_inclusive": threshold, "bbox_xyxy_exclusive": list(bounds),
            "margins_pixels": margins, "margins_percent": percentages,
            "minimum_margin_percent": min(percentages.values())}


def inspect_pixels(path: Path, header: dict) -> dict:
    from PIL import Image, __version__

    with Image.open(path) as source:
        source.load()
        if source.size != (header["width"], header["height"]):
            raise ValueError("Decoded dimensions differ from IHDR")
        source_mode = source.mode
        alpha_encoded = "A" in source.getbands() or "transparency" in source.info
        frame_count = getattr(source, "n_frames", 1)
        alpha = source.convert("RGBA").getchannel("A")
    width, height = alpha.size
    total = width * height
    histogram = alpha.histogram()
    zero, opaque = histogram[0], histogram[255]
    partial = total - zero - opaque
    border_coordinates = {(x, 0) for x in range(width)} | {(x, height - 1) for x in range(width)}
    border_coordinates |= {(0, y) for y in range(height)} | {(width - 1, y) for y in range(height)}
    values = [alpha.getpixel(point) for point in border_coordinates]
    warnings = []
    if not alpha_encoded:
        warnings.append("No encoded alpha or transparency information")
    if zero == 0:
        warnings.append("No fully transparent pixels")
    if zero == total:
        warnings.append("Image is entirely transparent")
    if any(values):
        warnings.append("Nonzero alpha touches the image border; crop/margin review required")
    if frame_count != 1:
        warnings.append("Multiple frames are present; report measures the first frame only")
    return {
        "decoder": f"Pillow {__version__}", "mode": source_mode,
        "frame_count": frame_count, "encoded_transparency": alpha_encoded,
        "actual_transparency_confirmed": bool(alpha_encoded and 0 < zero < total),
        "pixels": total, "alpha_min": min(i for i, n in enumerate(histogram) if n),
        "alpha_max": max(i for i, n in enumerate(histogram) if n),
        "alpha_counts": {"zero": zero, "partial_1_to_254": partial, "opaque_255": opaque},
        "alpha_percent": {"zero": round(100 * zero / total, 6),
                          "partial_1_to_254": round(100 * partial / total, 6),
                          "opaque_255": round(100 * opaque / total, 6)},
        "alpha_distinct_values": sum(n > 0 for n in histogram),
        "alpha_weighted_coverage_percent": round(100 * sum(i * n for i, n in enumerate(histogram)) / (255 * total), 6),
        "bounds": {str(t): bbox_record(alpha, t) for t in (1, 16, 128, 254)},
        "border": {"unique_pixels": len(values), "nonzero_alpha_pixels": sum(v > 0 for v in values),
                   "maximum_alpha": max(values)},
        "warnings": warnings,
        "edge_interpretation": "Alpha statistics cannot establish absence of a halo or colour fringe. Inspect light/dark composites and the consuming surface.",
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[4], help="Repository or source-packet root")
    parser.add_argument("--partial", action="store_true", help="Permit planned originals that have not been saved yet")
    parser.add_argument("--json", type=Path, help="Write audit JSON outside the originals directory; stdout always contains the same JSON")
    parser.add_argument("--compare", type=Path, help="Earlier verify.py JSON whose recorded file hashes must match")
    args = parser.parse_args()
    root = args.root.resolve()
    original_dir = root / ART_PATH
    plan = json.loads((root / DOC_PATH / "generation-plan.json").read_text(encoding="utf-8"))
    calls = plan["calls"]
    expected = [call["filename"] for call in calls]
    if len(expected) != len(set(expected)) or any(Path(name).name != name or not name.endswith(".png") for name in expected):
        raise ValueError("Invalid or duplicate filename in generation plan")
    inventory = sorted(p.name for p in original_dir.iterdir()) if original_dir.exists() else []
    missing = [name for name in expected if name not in inventory]
    unexpected = [name for name in inventory if name not in expected]
    errors = []
    records = []
    unavailable = False
    prior = {}
    if args.compare:
        comparison = json.loads(args.compare.read_text(encoding="utf-8"))
        prior = {item["filename"]: item["sha256"] for item in comparison["files"] if "sha256" in item}
    for call in calls:
        name = call["filename"]
        if name in missing:
            continue
        path = original_dir / name
        record = {"index": call["index"], "slug": call["slug"], "label": call["label"],
                  "filename": name, "path": (ART_PATH / name).as_posix()}
        try:
            if path.is_symlink() or not path.is_file():
                raise ValueError("Original must be a regular file, not a symlink or directory")
            data = path.read_bytes()
            record.update(bytes=len(data), sha256=hashlib.sha256(data).hexdigest())
            record["png"] = inspect_chunks(data)
            if name in prior and record["sha256"] != prior[name]:
                raise ValueError("SHA-256 differs from comparison report")
            try:
                record["pixel_inspection"] = inspect_pixels(path, record["png"]["ihdr"])
            except ImportError:
                record["pixel_inspection"] = {"status": "unavailable", "reason": "Pillow is not installed; no alpha claim is made"}
                unavailable = True
            record["integrity"] = "checked"
        except (ValueError, OSError, struct.error) as error:
            record["integrity"] = "error"
            record["error"] = str(error)
            errors.append(f"{name}: {error}")
        records.append(record)
    if missing and not args.partial:
        errors.append(f"Missing {len(missing)} planned originals")
    if unexpected:
        errors.append(f"Unexpected files in originals directory: {', '.join(unexpected)}")
    missing_prior = [name for name in prior if name not in inventory]
    if missing_prior:
        errors.append(f"Comparison originals are missing: {', '.join(missing_prior)}")
    report = {
        "schema_version": 1, "batch": "04", "base_revision": plan.get("base_revision"),
        "target_originals": plan["target"], "saved_originals": len(records),
        "partial_mode": args.partial, "missing_originals": missing, "unexpected_files": unexpected,
        "pixel_inspection_available": not unavailable,
        "scope": "Read-only original byte, PNG structure, decoded dimension and alpha inspection. This is not browser, scientific, artistic or accessibility acceptance.",
        "bbox_convention": "[left, top, right, bottom], right and bottom exclusive. Threshold 1 includes every nonzero-alpha pixel, including very faint fringe.",
        "files": records, "errors": errors,
    }
    output = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    if args.json:
        destination = args.json.resolve()
        if destination.is_relative_to(original_dir.resolve()):
            raise ValueError("Audit output cannot be written inside originals directory")
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(output, encoding="utf-8")
    sys.stdout.write(output)
    return 1 if errors else 2 if unavailable else 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (ValueError, OSError, KeyError, json.JSONDecodeError) as error:
        print(f"Verification could not complete: {error}", file=sys.stderr)
        raise SystemExit(1)
