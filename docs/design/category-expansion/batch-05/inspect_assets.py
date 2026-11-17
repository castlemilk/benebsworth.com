#!/usr/bin/env python3
"""Inspect immutable Batch 05 PNGs and render labelled review-only composites.

No original PNG is modified. Resampling and background compositing are performed
only for review sheets. This is file/pixel inspection, not browser acceptance.
Run from any working directory with Python 3 and Pillow installed.
"""
from __future__ import annotations

import hashlib
import html
import json
import math
import struct
import zlib
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

DOC = Path(__file__).resolve().parent
ROOT = DOC.parents[3]
ART = ROOT / "public/artwork/category-expansion-v1/batch-05"
REVIEW = DOC / "review"
THEMES = {"light": {"background": "#f5f1e8", "ink": "#252421", "muted": "#64615a", "rule": "#c7c1b6"}, "dark": {"background": "#171717", "ink": "#f5f1e8", "muted": "#bbb5aa", "rule": "#4a4843"}}
SIZES = (16, 24, 48, 96, 192)


def font(size: int, bold: bool = False):
    name = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
    try:
        return ImageFont.truetype(name, size)
    except OSError:
        return ImageFont.load_default()


def png_chunks(data: bytes) -> list[dict]:
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError("Invalid PNG signature")
    rows = []
    cursor = 8
    while cursor < len(data):
        if cursor + 12 > len(data):
            raise ValueError("Truncated PNG chunk")
        length = struct.unpack(">I", data[cursor:cursor + 4])[0]
        kind = data[cursor + 4:cursor + 8]
        payload = data[cursor + 8:cursor + 8 + length]
        tail = cursor + 8 + length
        if tail + 4 > len(data):
            raise ValueError("Truncated PNG chunk payload")
        stored_crc = struct.unpack(">I", data[tail:tail + 4])[0]
        computed_crc = zlib.crc32(kind + payload) & 0xffffffff
        row = {"type": kind.decode("ascii"), "data_bytes": length, "crc_valid": stored_crc == computed_crc}
        if kind == b"IHDR":
            width, height, depth, colour, compression, filtering, interlace = struct.unpack(">IIBBBBB", payload)
            row["header"] = {"width": width, "height": height, "bit_depth": depth, "colour_type": colour, "compression": compression, "filter": filtering, "interlace": interlace}
        rows.append(row)
        cursor = tail + 4
        if kind == b"IEND":
            if cursor != len(data):
                raise ValueError("Trailing bytes after IEND")
            break
    if not rows or rows[-1]["type"] != "IEND":
        raise ValueError("Missing IEND")
    if not all(row["crc_valid"] for row in rows):
        raise ValueError("PNG chunk CRC mismatch")
    return rows


def bbox_record(alpha: Image.Image, threshold: int) -> dict:
    mask = alpha.point(lambda value: 255 if value >= threshold else 0)
    bounds = mask.getbbox()
    if bounds is None:
        return {"threshold_gte": threshold, "bbox_xyxy_exclusive": None, "pixels_at_or_above": 0}
    left, top, right, bottom = bounds
    margins = {"left": left, "top": top, "right": alpha.width - right, "bottom": alpha.height - bottom}
    percentages = {key: round(value / (alpha.width if key in ("left", "right") else alpha.height) * 100, 4) for key, value in margins.items()}
    return {"threshold_gte": threshold, "bbox_xyxy_exclusive": list(bounds), "pixels_at_or_above": sum(alpha.histogram()[threshold:]), "clear_border_margins_px": margins, "clear_border_margins_percent": percentages, "minimum_clear_margin_percent": min(percentages.values())}


def inspect(path: Path, request: dict) -> dict:
    data = path.read_bytes()
    chunks = png_chunks(data)
    with Image.open(path) as image:
        image.load()
        mode = image.mode
        rgba = image.convert("RGBA")
        alpha = rgba.getchannel("A")
        histogram = alpha.histogram()
        total = rgba.width * rgba.height
        top = list(alpha.crop((0, 0, alpha.width, 1)).tobytes())
        bottom = list(alpha.crop((0, alpha.height - 1, alpha.width, alpha.height)).tobytes())
        left = list(alpha.crop((0, 1, 1, alpha.height - 1)).tobytes())
        right = list(alpha.crop((alpha.width - 1, 1, alpha.width, alpha.height - 1)).tobytes())
        border = top + bottom + left + right
        nonzero = total - histogram[0]
        cumulative_visible = 0
        median_visible_alpha = None
        for value in range(1, 256):
            cumulative_visible += histogram[value]
            if nonzero and cumulative_visible >= nonzero / 2:
                median_visible_alpha = value
                break
        row = {
            "index": request["index"], "slug": request["slug"], "label": request["label"],
            "category_status": "proposed-artwork-study-only", "concept": request["concept"],
            "path": path.relative_to(ROOT).as_posix(), "sha256": hashlib.sha256(data).hexdigest(),
            "bytes": len(data), "format": "PNG", "width": rgba.width, "height": rgba.height,
            "mode": mode, "png_chunks": chunks, "png_structure_valid": True,
            "alpha": {
                "channel_present_in_source_mode": "A" in mode,
                "minimum": alpha.getextrema()[0], "maximum": alpha.getextrema()[1],
                "histogram_0_to_255": histogram,
                "fully_transparent_pixels": histogram[0], "partially_transparent_pixels": sum(histogram[1:255]),
                "fully_opaque_pixels": histogram[255], "total_pixels": total,
                "fully_transparent_fraction": round(histogram[0] / total, 8),
                "fully_opaque_fraction": round(histogram[255] / total, 8),
                "partial_fraction_of_visible_pixels": round(sum(histogram[1:255]) / nonzero, 8) if nonzero else None,
                "median_alpha_of_visible_pixels": median_visible_alpha,
                "visible_fraction_with_alpha_gte_250": round(sum(histogram[250:]) / nonzero, 8) if nonzero else None,
                "bboxes": [bbox_record(alpha, value) for value in (1, 16, 128)],
                "outermost_border": {"unique_pixel_count": len(border), "pixels_with_alpha_gt_zero": sum(v > 0 for v in border), "maximum_alpha": max(border)},
                "requested_18_percent_all_sides_met_at_alpha_gt_zero": bbox_record(alpha, 1).get("minimum_clear_margin_percent", 0) >= 18,
            },
            "review": {"original_modified": False, "browser_checks": "unavailable; not performed", "review_composite_backgrounds": {name: colours["background"] for name, colours in THEMES.items()}, "size_strip_canvas_widths_px": list(SIZES), "resampling": "Pillow Lanczos; review images only; no crop, alpha cleanup, recolour or sharpening"},
        }
    return row


def composite(source: Image.Image, background: str, size: int) -> Image.Image:
    scaled = source.copy()
    scaled.thumbnail((size, size), Image.Resampling.LANCZOS)
    result = Image.new("RGBA", (size, size), background)
    result.alpha_composite(scaled, ((size - scaled.width) // 2, (size - scaled.height) // 2))
    return result.convert("RGB")


def render_reviews(rows: list[dict]) -> None:
    for theme, colours in THEMES.items():
        columns = min(5, len(rows)) or 1
        row_count = math.ceil(len(rows) / columns) or 1
        cell_w, cell_h, header = 304, 360, 82
        sheet = Image.new("RGB", (columns * cell_w + 32, row_count * cell_h + header + 24), colours["background"])
        draw = ImageDraw.Draw(sheet)
        draw.text((20, 15), f"BATCH 05  /  {theme.upper()} REVIEW", font=font(22, True), fill=colours["ink"])
        draw.text((20, 48), f"{len(rows)}/10 original studies · rendered full canvas · no browser acceptance", font=font(14), fill=colours["muted"])
        strip_width, strip_row, strip_header = 720, 264, 76
        strip = Image.new("RGB", (strip_width, strip_header + max(1, len(rows)) * strip_row + 20), colours["background"])
        strip_draw = ImageDraw.Draw(strip)
        strip_draw.text((20, 12), f"BATCH 05  /  {theme.upper()} SIZE REVIEW", font=font(22, True), fill=colours["ink"])
        strip_draw.text((20, 46), "Whole-image canvas widths: 16, 24, 48, 96 and 192 px. Labels remain separate.", font=font(13), fill=colours["muted"])
        for index, row in enumerate(rows):
            source = Image.open(ROOT / row["path"]).convert("RGBA")
            single = composite(source, colours["background"], 768)
            single.save(REVIEW / f"{row['slug']}-{theme}.png")
            x = 16 + (index % columns) * cell_w
            y = header + (index // columns) * cell_h
            sheet.paste(composite(source, colours["background"], 280), (x + 12, y))
            draw.text((x + 12, y + 289), row["label"], font=font(17, True), fill=colours["ink"])
            draw.text((x + 12, y + 316), "Proposed artwork study", font=font(13), fill=colours["muted"])
            strip_y = strip_header + index * strip_row
            strip_draw.line((20, strip_y, strip_width - 20, strip_y), fill=colours["rule"], width=1)
            strip_draw.text((20, strip_y + 9), row["label"], font=font(15, True), fill=colours["ink"])
            positions = (40, 112, 204, 332, 500)
            for size, x_pos in zip(SIZES, positions):
                top = strip_y + 49 + (192 - size) // 2
                strip.paste(composite(source, colours["background"], size), (x_pos, top))
                strip_draw.text((x_pos, strip_y + 241), f"{size}px", font=font(12), fill=colours["muted"])
        sheet.save(REVIEW / f"contact-sheet-{theme}.png")
        strip.save(REVIEW / f"size-review-{theme}.png")


def render_gallery(rows: list[dict]) -> None:
    sections = []
    for theme in THEMES:
        figures = []
        for row in rows:
            src = "../../../../" + row["path"]
            bounds = row["alpha"]["bboxes"]
            margins = ", ".join(f"α≥{b['threshold_gte']}: {b['minimum_clear_margin_percent']:.2f}%" for b in bounds)
            figures.append(f'<figure><div class="art"><img src="{html.escape(src)}" alt="{html.escape(row["concept"])}" width="{row["width"]}" height="{row["height"]}"></div><figcaption><h3>{html.escape(row["label"])}</h3><p>Proposed artwork study</p><p class="technical">{row["width"]} × {row["height"]} px · PNG {row["mode"]}<br>Minimum margins: {margins}</p><a href="{html.escape(src)}">Original PNG</a></figcaption></figure>')
        sections.append(f'<section class="{theme}"><h2>{theme.title()} composite context</h2><p>Background {THEMES[theme]["background"]}. Native alpha preserved. Additional review-container clearance is not baked into the PNG.</p><div class="gallery">{"".join(figures)}</div></section>')
    document = '''<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Batch 05 physical worlds and invention artwork review</title><style>
:root{color-scheme:light dark}*{box-sizing:border-box}body{margin:0;background:#f5f1e8;color:#252421;font:16px/1.5 system-ui,sans-serif}header,section,footer{padding:28px max(24px,calc((100vw - 1500px)/2))}header{max-width:1000px}h1{font:36px/1.15 Georgia,serif;margin:0 0 18px}h2{font:28px/1.2 Georgia,serif;margin:0 0 12px}h3{font-size:17px;margin:0 0 5px}p{margin:0 0 12px}.light{background:#f5f1e8;color:#252421}.dark{background:#171717;color:#f5f1e8}.gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:28px 20px}.art{aspect-ratio:1;display:grid;place-items:center;padding:10%}figure{margin:0}.art img{width:100%;height:auto;display:block;object-fit:contain}figcaption{border-top:1px solid currentColor;padding-top:12px}.technical{font-size:12px;overflow-wrap:anywhere}a{color:inherit;text-decoration-thickness:1px;text-underline-offset:.18em}a:focus-visible{outline:2px solid currentColor;outline-offset:4px}.links{display:flex;gap:18px;flex-wrap:wrap}@media(max-width:520px){h1{font-size:28px}.gallery{grid-template-columns:1fr}header,section,footer{padding:24px}}@media(forced-colors:active){.art{background:Canvas}img{forced-color-adjust:none}}@media print{header,section,footer{padding:20px}.gallery{grid-template-columns:repeat(2,minmax(0,1fr))}figure{break-inside:avoid}.dark{background:#171717;color:#f5f1e8;print-color-adjust:exact}}
</style></head><body><header><h1>Physical worlds and invention</h1><p>Batch 05: ''' + str(len(rows)) + ' of 10 separate original raster studies. All labels are proposed expansions, not approved taxonomy. Engraved objects are metaphors, not scientific evidence, measured data or diagrams.</p><p>Original files are unchanged. This offline gallery is a review specimen with labelled light and dark contexts; browser rendering, production consumers and accessibility behavior are unverified.</p><nav class="links" aria-label="Review sheets"><a href="review/contact-sheet-light.png">Light contact sheet</a><a href="review/contact-sheet-dark.png">Dark contact sheet</a><a href="review/size-review-light.png">Light size review</a><a href="review/size-review-dark.png">Dark size review</a><a href="manifest-alpha.json">Alpha inspection</a></nav></header>' + ''.join(sections) + '<footer><p>Use the separate proposed labels and explanatory text. These detailed images are not accepted replacements for the current 16–24 px symbols. No JavaScript, network request, font download or animation is used by this specimen.</p></footer></body></html>\n'
    (DOC / "gallery.html").write_text(document, encoding="utf-8")


def main() -> None:
    REVIEW.mkdir(exist_ok=True)
    requests = json.loads((DOC / "generation-requests.json").read_text())
    rows = [inspect(ART / request["filename"], request) for request in requests if (ART / request["filename"]).exists()]
    manifest = {"schema_version": 1, "target_count": len(requests), "completed_original_count": len(rows), "inspection_scope": "PNG bytes, dimensions, alpha, borders, CRC and review-only composites. Not browser acceptance.", "bbox_convention": "x0,y0,x1,y1 with right/bottom exclusive; alpha thresholds distinguish nearly invisible residue from substantial subject bounds; no thresholding applied to originals", "entries": rows, "missing_slugs": [r["slug"] for r in requests if not (ART / r["filename"]).exists()]}
    (DOC / "manifest-alpha.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    render_reviews(rows)
    render_gallery(rows)
    print(json.dumps({"completed_original_count": len(rows), "target_count": len(requests), "missing": manifest["missing_slugs"], "entries": [{"slug": r["slug"], "sha256": r["sha256"], "dimensions": [r["width"], r["height"]], "minimum_margin_percent_by_alpha_threshold": {str(b["threshold_gte"]): b.get("minimum_clear_margin_percent") for b in r["alpha"]["bboxes"]}, "border": r["alpha"]["outermost_border"]} for r in rows]}, indent=2))


if __name__ == "__main__":
    main()
