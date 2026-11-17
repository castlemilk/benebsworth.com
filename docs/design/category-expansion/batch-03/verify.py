#!/usr/bin/env python3
"""Inspect unmodified Batch 03 PNGs; optionally compare an exact final manifest.

Requires Pillow. Checkpoint: --allow-incomplete --output checkpoint.json
Final: --manifest manifest.json --output verification.json
Manifest assets require filename, sha256 and byte_size; width/height/mode, when
present, are checked too. Alpha bounds use exclusive right/bottom coordinates.
This script reads originals only; alpha statistics do not certify halo quality.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import struct
import sys
import zlib

from PIL import Image


HERE = Path(__file__).resolve().parent
REPO = HERE.parents[3]
ORIGINALS = REPO / "public/artwork/category-expansion-v1/batch-03/originals"
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"


def png_structure(raw: bytes) -> dict:
    """Validate every chunk CRC, critical chunk order and clean termination."""
    if not raw.startswith(PNG_SIGNATURE):
        raise ValueError("PNG signature missing")
    offset, kinds, header = 8, [], None
    idat_ended = False
    while offset < len(raw):
        if offset + 12 > len(raw):
            raise ValueError("Truncated PNG chunk")
        length = struct.unpack_from(">I", raw, offset)[0]
        kind = raw[offset + 4:offset + 8]
        end = offset + 12 + length
        if end > len(raw):
            raise ValueError("PNG chunk length exceeds file")
        payload = raw[offset + 8:offset + 8 + length]
        expected_crc = struct.unpack_from(">I", raw, offset + 8 + length)[0]
        if zlib.crc32(kind + payload) & 0xFFFFFFFF != expected_crc:
            raise ValueError(f"CRC mismatch in {kind!r}")
        if not kinds and kind != b"IHDR":
            raise ValueError("IHDR must be the first chunk")
        if kind == b"IHDR":
            if kinds or length != 13:
                raise ValueError("Invalid or repeated IHDR")
            width, height, depth, color, compression, filtering, interlace = struct.unpack(">IIBBBBB", payload)
            header = {"width": width, "height": height, "bit_depth": depth,
                      "color_type": color, "compression": compression,
                      "filter_method": filtering, "interlace": interlace}
        if kind == b"IDAT" and idat_ended:
            raise ValueError("Nonconsecutive IDAT chunks")
        if b"IDAT" in kinds and kind != b"IDAT":
            idat_ended = True
        if kind not in (b"IHDR", b"PLTE", b"IDAT", b"IEND") and not kind[0] & 32:
            raise ValueError(f"Unknown critical PNG chunk: {kind!r}")
        kinds.append(kind)
        offset = end
        if kind == b"IEND":
            if length or offset != len(raw):
                raise ValueError("Invalid IEND or bytes after IEND")
            break
    if not kinds or kinds[-1] != b"IEND" or b"IDAT" not in kinds:
        raise ValueError("PNG requires IDAT and final IEND")
    return {"crc_check": "passed", "clean_termination": True,
            "chunks": [kind.decode("ascii") for kind in kinds], **header}


def bounds(alpha: Image.Image, threshold: int) -> dict:
    box = alpha.point(lambda value: 255 if value > threshold else 0).getbbox()
    if box is None:
        return {"bbox_xyxy_exclusive": None, "clear_margins_px": None,
                "clear_margins_fraction": None}
    width, height = alpha.size
    left, top, right, bottom = box
    margins = {"left": left, "top": top, "right": width - right,
               "bottom": height - bottom}
    fractions = {key: round(value / (width if key in ("left", "right") else height), 6)
                 for key, value in margins.items()}
    return {"bbox_xyxy_exclusive": list(box), "clear_margins_px": margins,
            "clear_margins_fraction": fractions}


def inspect(path: Path, spec: dict) -> dict:
    raw = path.read_bytes()
    structure = png_structure(raw)
    with Image.open(path) as opened:
        opened.verify()
    with Image.open(path) as opened:
        opened.load()
        mode, format_name, size = opened.mode, opened.format, opened.size
        if format_name != "PNG" or mode != "RGBA":
            raise ValueError(f"Expected an actual RGBA PNG; got {format_name}/{mode}")
        if structure["bit_depth"] != 8 or structure["color_type"] != 6:
            raise ValueError("Expected 8-bit RGBA encoding (PNG colour type 6)")
        alpha = opened.getchannel("A")
        histogram = alpha.histogram()
        width, height = size
        total = width * height
        border = bytearray(alpha.crop((0, 0, width, 1)).tobytes())
        if height > 1:
            border.extend(alpha.crop((0, height - 1, width, height)).tobytes())
        if height > 2:
            border.extend(alpha.crop((0, 1, 1, height - 1)).tobytes())
            if width > 1:
                border.extend(alpha.crop((width - 1, 1, width, height - 1)).tobytes())
        try:
            source_path = path.relative_to(REPO).as_posix()
        except ValueError:
            source_path = str(path)
        return {
            "number": spec["number"], "slug": spec["slug"], "label": spec["label"],
            "taxonomy_status": spec.get("taxonomy_status", "proposed_study_label"),
            "filename": path.name, "path": source_path,
            "sha256": hashlib.sha256(raw).hexdigest(), "byte_size": len(raw),
            "width": width, "height": height, "mode": mode, "format": format_name,
            "png_integrity": structure,
            "alpha": {
                "minimum": alpha.getextrema()[0], "maximum": alpha.getextrema()[1],
                "transparent_pixels": histogram[0], "opaque_pixels": histogram[255],
                "partial_alpha_pixels": total - histogram[0] - histogram[255],
                "near_opaque_alpha_ge_250_pixels": sum(histogram[250:]),
                "very_low_alpha_1_to_16_pixels": sum(histogram[1:17]),
                "dominant_values": [{"alpha": value, "pixels": count}
                                    for value, count in sorted(enumerate(histogram), key=lambda pair: pair[1], reverse=True)[:8]],
                "transparent_fraction": round(histogram[0] / total, 6),
                "opaque_fraction": round(histogram[255] / total, 6),
                "partial_fraction": round((total - histogram[0] - histogram[255]) / total, 6),
                "has_transparency": histogram[0] > 0,
                "unique_values": sum(value > 0 for value in histogram),
                "border_total_pixels": len(border),
                "border_nonzero_alpha_pixels": sum(value > 0 for value in border),
                "border_above_16_pixels": sum(value > 16 for value in border),
                "border_above_128_pixels": sum(value > 128 for value in border),
                "threshold_bounds": {f"gt_{threshold}": bounds(alpha, threshold)
                                     for threshold in (0, 16, 128)},
            },
            "visual_review": "Required separately; numeric alpha checks cannot certify no halo or legibility.",
        }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--prompts", type=Path, default=HERE / "prompts.json")
    parser.add_argument("--originals", type=Path, default=ORIGINALS)
    parser.add_argument("--allow-incomplete", action="store_true", help="Permit missing planned images for a checkpoint; unexpected files still fail.")
    parser.add_argument("--manifest", type=Path, help="Compare final assets against filename, sha256, byte_size and optional width/height/mode.")
    parser.add_argument("--output", type=Path, help="Write the computed JSON report; stdout otherwise. Never place inside originals.")
    args = parser.parse_args()
    if args.output and (args.output.resolve() == args.originals.resolve() or args.originals.resolve() in args.output.resolve().parents):
        parser.error("Report output must not be within the originals directory")
    if args.manifest and args.allow_incomplete:
        parser.error("Final manifest comparison cannot allow incomplete input")
    try:
        plan = json.loads(args.prompts.read_text())
        specs = plan["assets"]
        expected = [item["filename"] for item in specs]
        if len(expected) != len(set(expected)) or len(expected) != plan["target_count"]:
            raise ValueError("Prompt inventory must contain target_count unique filenames")
        if any(Path(name).name != name or not name.endswith(".png") for name in expected):
            raise ValueError("Prompt filenames must be plain .png basenames")
        actual = {path.name for path in args.originals.iterdir()} if args.originals.is_dir() else set()
        missing = [name for name in expected if name not in actual]
        unexpected = sorted(actual - set(expected))
        errors, records = [], []
        if missing and not args.allow_incomplete:
            errors.append(f"Missing originals: {', '.join(missing)}")
        if unexpected:
            errors.append(f"Unexpected originals: {', '.join(unexpected)}")
        for spec in specs:
            path = args.originals / spec["filename"]
            if path.name in actual:
                try:
                    records.append(inspect(path, spec))
                except (OSError, ValueError, struct.error) as exc:
                    errors.append(f"{path.name}: {exc}")
        manifest_status = "not_requested"
        if args.manifest:
            manifest = json.loads(args.manifest.read_text())
            entries = manifest["assets"]
            names = [item["filename"] for item in entries]
            if len(names) != len(set(names)) or set(names) != set(expected):
                errors.append("Manifest inventory differs from the complete prompt inventory")
            indexed = {item["filename"]: item for item in entries}
            for record in records:
                saved = indexed.get(record["filename"], {})
                for field in ("sha256", "byte_size"):
                    if saved.get(field) != record[field]:
                        errors.append(f"{record['filename']}: manifest {field} mismatch")
                for field in ("width", "height", "mode"):
                    if field in saved and saved[field] != record[field]:
                        errors.append(f"{record['filename']}: manifest {field} mismatch")
            manifest_status = "failed" if errors else "passed"
        report = {
            "schema_version": 1, "batch": "03", "target_count": plan["target_count"],
            "completed_count": len(records), "complete": not missing and len(records) == plan["target_count"],
            "status": "failed" if errors else ("checkpoint" if missing else "passed"),
            "manifest_comparison": manifest_status, "missing": missing,
            "unexpected": unexpected, "errors": errors, "assets": records,
            "evidence_boundary": "PNG integrity and pixel measurements only. Browser, semantic, edge-fringe and visual acceptance are separate.",
        }
        output = json.dumps(report, indent=2) + "\n"
        if args.output:
            args.output.parent.mkdir(parents=True, exist_ok=True)
            args.output.write_text(output)
            print(json.dumps({"status": report["status"], "completed_count": len(records),
                              "target_count": plan["target_count"], "report": str(args.output), "errors": errors}))
        else:
            print(output, end="")
        return 1 if errors else 0
    except (OSError, ValueError, KeyError, TypeError) as exc:
        print(f"Verification input error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
