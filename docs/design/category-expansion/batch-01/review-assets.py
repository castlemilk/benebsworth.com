#!/usr/bin/env python3
"""Read-only original integrity and deterministic raster presentation review.

This script never edits or re-encodes the generated originals. The emitted
PNGs are explicitly secondary review composites, not additional artwork.
Alpha statistics establish transparency only; halo and artistic acceptance
require looking at the review images. No browser acceptance is implied.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[4]
DEFAULT_ORIGINALS = ROOT / "public/artwork/category-expansion-v1/batch-01/originals"
DEFAULT_OUTPUT = Path(__file__).resolve().parent / "review"
THEMES = {"light": "#f4efe6", "dark": "#181a19"}
INKS = {"light": "#302f2b", "dark": "#eee9df"}
LABELS = {
    "maths": ("Mathematics", "existing topic"),
    "chemistry": ("Chemistry", "existing topic"),
    "biology": ("Life Sciences", "existing topic"),
    "earth": ("Earth & Space", "existing topic"),
    "geology": ("Geology", "proposed study"),
    "oceanography": ("Oceanography", "proposed study"),
    "meteorology": ("Meteorology", "proposed study"),
    "ecology": ("Ecology", "proposed study"),
    "genetics": ("Genetics", "proposed study"),
    "neuroscience": ("Neuroscience", "proposed study"),
}
FONT_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"


def font(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT_PATH, size)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def key_for(path: Path) -> str:
    return path.stem.split("-")[1]


def revision_for(path: Path) -> int:
    match = re.search(r"-r(\d+)$", path.stem)
    return int(match.group(1)) if match else 0


def bbox_record(alpha: Image.Image, threshold: int) -> dict:
    mask = alpha.point(lambda a: 255 if a > threshold else 0)
    bbox = mask.getbbox()
    width, height = alpha.size
    if bbox is None:
        return {"threshold_exclusive": threshold, "bbox": None, "margins_px": None}
    left, top, right, bottom = bbox
    margins = {"left": left, "top": top, "right": width - right, "bottom": height - bottom}
    fractions = {"left": left / width, "top": top / height,
                 "right": (width - right) / width, "bottom": (height - bottom) / height}
    return {
        "threshold_exclusive": threshold,
        "bbox": list(bbox),
        "bbox_convention": "left and top inclusive; right and bottom exclusive",
        "margins_px": margins,
        "margin_fractions": {k: round(v, 6) for k, v in fractions.items()},
        "minimum_margin_fraction": round(min(fractions.values()), 6),
        "meets_prompt_16_percent_all_sides": min(fractions.values()) >= 0.16,
    }


def border_nonzero(alpha: Image.Image, threshold: int = 0) -> int:
    width, height = alpha.size
    strips = [alpha.crop((0, 0, width, 1))]
    if height > 1:
        strips.append(alpha.crop((0, height - 1, width, height)))
    if height > 2:
        strips.append(alpha.crop((0, 1, 1, height - 1)))
        if width > 1:
            strips.append(alpha.crop((width - 1, 1, width, height - 1)))
    return sum(sum(strip.histogram()[threshold + 1:]) for strip in strips)


def measure(path: Path) -> tuple[dict, Image.Image]:
    with Image.open(path) as source:
        source.load()
        rgba = source.convert("RGBA")
        alpha = rgba.getchannel("A")
        histogram = alpha.histogram()
        pixels = source.width * source.height
        row = {
            "filename": path.name,
            "key": key_for(path),
            "revision": revision_for(path),
            "sha256": sha256(path),
            "bytes": path.stat().st_size,
            "format": source.format,
            "mode": source.mode,
            "width": source.width,
            "height": source.height,
            "alpha_channel_present": "A" in source.getbands(),
            "alpha_extrema": list(alpha.getextrema()),
            "alpha_counts": {
                "zero": histogram[0],
                "partial_1_to_254": sum(histogram[1:255]),
                "opaque_255": histogram[255],
                "total": pixels,
            },
            "transparent_fraction": round(histogram[0] / pixels, 6),
            "partial_alpha_fraction": round(sum(histogram[1:255]) / pixels, 6),
            "border_nonzero_alpha_pixels": border_nonzero(alpha),
            "border_alpha_above_16_pixels": border_nonzero(alpha, 16),
            "border_alpha_maximum": max(
                alpha.crop(box).getextrema()[1] for box in [
                    (0, 0, source.width, 1),
                    (0, source.height - 1, source.width, source.height),
                    (0, 0, 1, source.height),
                    (source.width - 1, 0, source.width, source.height),
                ]
            ),
            "bbox_alpha_gt_0": bbox_record(alpha, 0),
            "bbox_alpha_gt_16": bbox_record(alpha, 16),
            "transparency_verified": "A" in source.getbands() and histogram[0] > 0 and histogram[255] > 0,
            "visual_halo_status": "requires visual inspection; not inferred from alpha statistics",
        }
    return row, rgba


def paste_scaled(canvas: Image.Image, rgba: Image.Image, xy: tuple[int, int], size: int) -> None:
    thumbnail = rgba.copy()
    thumbnail.thumbnail((size, size), Image.Resampling.LANCZOS)
    left = xy[0] + (size - thumbnail.width) // 2
    top = xy[1] + (size - thumbnail.height) // 2
    canvas.alpha_composite(thumbnail, (left, top))


def write_overview(rows: list[tuple[dict, Image.Image]], output: Path, theme: str) -> str:
    columns = min(5, max(1, len(rows)))
    cell_width, cell_height = 280, 326
    canvas = Image.new("RGBA", (columns * cell_width + 48, math.ceil(len(rows) / columns) * cell_height + 112), THEMES[theme])
    draw = ImageDraw.Draw(canvas)
    ink = INKS[theme]
    draw.text((24, 18), f"Batch 01 · {len(rows)} separate originals · {theme} review", fill=ink, font=font(20))
    draw.text((24, 51), "256 px full-canvas previews. Secondary review composite; originals remain unchanged.", fill=ink, font=font(13))
    for index, (row, rgba) in enumerate(rows):
        left, top = 24 + (index % columns) * cell_width, 90 + (index // columns) * cell_height
        paste_scaled(canvas, rgba, (left + 12, top), 256)
        title, status = LABELS.get(row["key"], (row["key"], "study"))
        draw.text((left + 12, top + 264), f"{index + 1:02d}  {title}", fill=ink, font=font(16))
        draw.text((left + 12, top + 289), status, fill=ink, font=font(13))
    name = f"contact-{theme}.png"
    canvas.convert("RGB").save(output / name)
    return name


def write_size_reviews(rows: list[tuple[dict, Image.Image]], output: Path, theme: str) -> list[str]:
    written = []
    for page, start in enumerate(range(0, len(rows), 5), 1):
        portion = rows[start:start + 5]
        canvas = Image.new("RGBA", (800, 86 + 302 * len(portion)), THEMES[theme])
        draw = ImageDraw.Draw(canvas)
        ink = INKS[theme]
        draw.text((24, 16), f"Batch 01 · {theme} · actual-size review {page}", fill=ink, font=font(20))
        draw.text((24, 48), "Full source canvas displayed at 256 / 128 / 64 px. No crop, glow, inversion or recolouring.", fill=ink, font=font(13))
        for local_index, (row, rgba) in enumerate(portion):
            top = 86 + local_index * 302
            title, status = LABELS.get(row["key"], (row["key"], "study"))
            for left, size in [(24, 256), (344, 128), (572, 64)]:
                paste_scaled(canvas, rgba, (left, top), size)
                draw.text((left, top + 264), f"{size} px", fill=ink, font=font(13))
            draw.text((344, top + 170), f"{start + local_index + 1:02d}  {title}", fill=ink, font=font(17))
            draw.text((344, top + 199), status, fill=ink, font=font(13))
        name = f"size-review-{theme}-{page:02d}.png"
        canvas.convert("RGB").save(output / name)
        written.append(name)
    return written


def write_edges(row: dict, rgba: Image.Image, output: Path) -> str | None:
    alpha = rgba.getchannel("A")
    bbox = row["bbox_alpha_gt_16"]["bbox"]
    if bbox is None:
        return None
    left, top, right, bottom = bbox
    top_x = max(range(left, right), key=lambda x: alpha.getpixel((x, top)))
    left_y = max(range(top, bottom), key=lambda y: alpha.getpixel((left, y)))
    samples = [("upper edge", top_x, top), ("left edge", left, left_y)]
    size = 192
    canvas = Image.new("RGBA", (4 * size + 40, size + 88), "#b9b7b0")
    draw = ImageDraw.Draw(canvas)
    draw.text((12, 12), f"{row['filename']} · 100% edge samples", fill="#20211f", font=font(16))
    for index, (sample_label, center_x, center_y) in enumerate(samples):
        crop = rgba.crop((center_x - size // 2, center_y - size // 2, center_x + size // 2, center_y + size // 2))
        for theme_index, theme in enumerate(THEMES):
            pos_x = 8 + (index * 2 + theme_index) * (size + 8)
            tile = Image.new("RGBA", (size, size), THEMES[theme])
            tile.alpha_composite(crop)
            canvas.alpha_composite(tile, (pos_x, 48))
            draw.text((pos_x, 248), f"{sample_label} · {theme}", fill="#20211f", font=font(12))
    name = f"edge-review-{row['key']}.png"
    canvas.convert("RGB").save(output / name)
    return name


def write_revision_review(key: str, rows: list[tuple[dict, Image.Image]], output: Path) -> str:
    """Compare preserved revisions on both backgrounds without cropping."""
    cell_width, cell_height = 288, 314
    canvas = Image.new("RGBA", (cell_width * len(rows) + 32, cell_height * 2 + 94), "#b9b7b0")
    draw = ImageDraw.Draw(canvas)
    draw.text((16, 16), f"{LABELS[key][0]} · preserved revision comparison", fill="#20211f", font=font(20))
    draw.text((16, 49), "256 px full-canvas views. Earlier originals remain unmodified.", fill="#20211f", font=font(13))
    for theme_index, theme in enumerate(THEMES):
        for index, (row, rgba) in enumerate(rows):
            left, top = 16 + index * cell_width, 86 + theme_index * cell_height
            tile = Image.new("RGBA", (272, 300), THEMES[theme])
            paste_scaled(tile, rgba, (8, 8), 256)
            tile_draw = ImageDraw.Draw(tile)
            tile_draw.text((12, 271), f"r{row['revision']} · {theme}", fill=INKS[theme], font=font(14))
            canvas.alpha_composite(tile, (left, top))
    name = f"revision-review-{key}.png"
    canvas.convert("RGB").save(output / name)
    return name


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--originals", type=Path, default=DEFAULT_ORIGINALS)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    paths = sorted(args.originals.glob("*.png"))
    if not paths:
        raise SystemExit("No original PNGs found; no outputs written.")
    args.out.mkdir(parents=True, exist_ok=True)
    all_rows = [measure(path) for path in paths]
    by_key = {}
    for row, rgba in all_rows:
        by_key.setdefault(row["key"], []).append((row, rgba))
    selected_by_key = {
        key: max(variants, key=lambda pair: (pair[0]["revision"], pair[0]["filename"]))
        for key, variants in by_key.items()
    }
    rows = sorted(selected_by_key.values(), key=lambda pair: pair[0]["filename"])
    selected_filenames = {row["filename"] for row, _ in rows}
    for row, _ in all_rows:
        row["selected_for_review"] = row["filename"] in selected_filenames
    outputs = []
    for theme in THEMES:
        outputs.append(write_overview(rows, args.out, theme))
        outputs.extend(write_size_reviews(rows, args.out, theme))
    outputs.extend(name for row, rgba in rows if (name := write_edges(row, rgba, args.out)))
    outputs.extend(write_revision_review(key, variants, args.out) for key, variants in by_key.items() if len(variants) > 1)
    for path, (row, _) in zip(paths, all_rows):
        if sha256(path) != row["sha256"]:
            raise RuntimeError(f"Original changed during review: {path.name}")
    report = {
        "schema_version": 1,
        "batch": "01",
        "target_original_count": 10,
        "target_concept_count": 10,
        "actual_original_count": len(all_rows),
        "original_file_count": len(all_rows),
        "distinct_concept_count": len(by_key),
        "selected_review_count": len(rows),
        "selection_rule": "Highest numeric rN revision per category key; earlier generated files remain preserved.",
        "selected_original_filenames": [row["filename"] for row, _ in rows],
        "originals_modified": False,
        "source_path": "public/artwork/category-expansion-v1/batch-01/originals",
        "backgrounds": THEMES,
        "preview_sizes_px": [256, 128, 64],
        "edge_crop_display_scale": "1 image pixel per output pixel",
        "preview_resampling": "Pillow LANCZOS; originals untouched",
        "browser_checks": "unavailable; these are deterministic image composites, not browser captures",
        "visual_acceptance": "not inferred from integrity or alpha metrics",
        "files": [row for row, _ in all_rows],
        "secondary_review_outputs": [{"filename": name, "sha256": sha256(args.out / name), "bytes": (args.out / name).stat().st_size} for name in outputs],
    }
    (args.out / "alpha-metrics.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    for row, _ in rows:
        (args.out / f"{row['key']}-metrics.json").write_text(json.dumps(row, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"original_file_count": len(all_rows), "distinct_concept_count": len(by_key), "target_concept_count": 10,
                      "selected_review_count": len(rows),
                      "transparent_originals": sum(row["transparency_verified"] for row, _ in all_rows),
                      "clear_outer_border": all(row["border_nonzero_alpha_pixels"] == 0 for row, _ in all_rows),
                      "minimum_margins_percent": {row["key"]: round(100 * row["bbox_alpha_gt_16"].get("minimum_margin_fraction", 0), 2) for row, _ in rows},
                      "report": str(args.out / "alpha-metrics.json"),
                      "secondary_outputs": len(outputs)}, indent=2))


if __name__ == "__main__":
    main()
