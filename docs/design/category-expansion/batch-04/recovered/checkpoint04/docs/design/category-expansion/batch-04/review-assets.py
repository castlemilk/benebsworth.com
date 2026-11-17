#!/usr/bin/env python3
"""Create whole-frame QA composites; never modify generated originals.

Outputs: contact-light.png, contact-dark.png, sizes-light.png, sizes-dark.png.
No crop, recolour, retouching or enlargement; only downsample and alpha composite.
Size columns show the full original canvas at 48, 96 and 192 pixels maximum.
These are image-space specimens, not browser screenshots or consumer approval.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, __version__

ART_PATH = Path("public/artwork/category-expansion-v1/batch-04/originals")
DOC_PATH = Path("docs/design/category-expansion/batch-04")
THEMES = {"light": {"background": "#f4f0e7", "ink": "#242427", "muted": "#5c5b5a", "rule": "#c9c5bc"},
          "dark": {"background": "#171819", "ink": "#f4f0e7", "muted": "#b6b4af", "rule": "#4a4b4b"}}


def font(size: int, requested: str):
    return ImageFont.truetype(requested, size)


def wrapped(draw, text, position, max_width, face, colour, line_height=23):
    x, y = position
    current = ""
    for word in text.split():
        candidate = word if not current else current + " " + word
        if current and draw.textlength(candidate, font=face) > max_width:
            draw.text((x, y), current, font=face, fill=colour)
            y += line_height
            current = word
        else:
            current = candidate
    if current:
        draw.text((x, y), current, font=face, fill=colour)
        y += line_height
    return y


def place_contained(sheet, source, left, top, width, height):
    sample = source.copy()
    sample.thumbnail((width, height), Image.Resampling.LANCZOS, reducing_gap=None)
    x = left + (width - sample.width) // 2
    y = top + (height - sample.height) // 2
    sheet.alpha_composite(sample, (x, y))
    return list(sample.size)


def save(sheet, path):
    sheet.convert("RGB").save(path, format="PNG", compress_level=9, optimize=False)
    data = path.read_bytes()
    return {"filename": path.name, "width": sheet.width, "height": sheet.height,
            "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}


def contact(entries, theme, out_dir, requested_font):
    colours = THEMES[theme]
    margin, columns, cell_width, cell_height = 32, 2, 500, 540
    width = margin * 2 + columns * cell_width
    top = 142
    height = top + math.ceil(len(entries) / columns) * cell_height + 50
    sheet = Image.new("RGBA", (width, height), colours["background"])
    draw = ImageDraw.Draw(sheet)
    title, label, note = font(27, requested_font), font(20, requested_font), font(15, requested_font)
    draw.text((margin, 24), "Batch 04 | Quantitative foundations", font=title, fill=colours["ink"])
    draw.text((margin, 65), f"{len(entries)}/10 saved originals | {theme} {colours['background']} | proposed artwork studies", font=note, fill=colours["muted"])
    draw.text((margin, 91), "Whole frames contained at up to 440px. Labels are outside art. No browser acceptance implied.", font=note, fill=colours["muted"])
    for i, entry in enumerate(entries):
        x = margin + (i % columns) * cell_width
        y = top + (i // columns) * cell_height
        draw.line((x, y, x + cell_width - 24, y), fill=colours["rule"], width=1)
        draw.text((x, y + 12), f"{entry['index']:02d}  {entry['label']}", font=label, fill=colours["ink"])
        place_contained(sheet, entry["image"], x + 18, y + 45, 440, 440)
        draw.text((x, y + 493), f"{entry['image'].width} × {entry['image'].height}px source | {entry['bytes']:,} bytes", font=note, fill=colours["muted"])
    draw.text((margin, height - 31), "Generated metaphors. Raster originals remain unchanged; no new categories or scientific evidence are asserted.", font=note, fill=colours["muted"])
    return save(sheet, out_dir / f"contact-{theme}.png")


def size_board(entries, theme, out_dir, requested_font):
    colours = THEMES[theme]
    margin, width, row_height, top = 28, 1056, 240, 140
    height = top + len(entries) * row_height + 50
    sheet = Image.new("RGBA", (width, height), colours["background"])
    draw = ImageDraw.Draw(sheet)
    title, label, note = font(27, requested_font), font(18, requested_font), font(15, requested_font)
    draw.text((margin, 22), "Batch 04 | Actual image-space size specimens", font=title, fill=colours["ink"])
    draw.text((margin, 64), f"{len(entries)}/10 saved originals | {theme} {colours['background']} | no crop or enlargement", font=note, fill=colours["muted"])
    columns = [(390, 48), (590, 96), (830, 192)]
    for centre, size in columns:
        draw.text((centre - 30, 104), f"{size}px", font=label, fill=colours["ink"])
    for i, entry in enumerate(entries):
        y = top + i * row_height
        draw.line((margin, y, width - margin, y), fill=colours["rule"], width=1)
        next_y = wrapped(draw, f"{entry['index']:02d}  {entry['label']}", (margin, y + 33), 285, label, colours["ink"])
        draw.text((margin, next_y + 8), f"Source {entry['image'].width} × {entry['image'].height}px", font=note, fill=colours["muted"])
        wrapped(draw, "Full canvas is preserved. Subject occupies less than its canvas.", (margin, next_y + 38), 285, note, colours["muted"], 21)
        for centre, size in columns:
            place_contained(sheet, entry["image"], centre - size // 2, y + (row_height - size) // 2, size, size)
    draw.text((margin, height - 31), "Inspect at 100% image scale. Viewer fit-to-width can rescale this board. Browser/theme/focus checks remain separate.", font=note, fill=colours["muted"])
    return save(sheet, out_dir / f"sizes-{theme}.png")


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[4], help="Repository or source-packet root")
    parser.add_argument("--out-dir", type=Path, help="Default: docs/design/category-expansion/batch-04/review")
    parser.add_argument("--partial", action="store_true", help="Allow a checkpoint containing fewer than ten originals")
    parser.add_argument("--font", default="DejaVuSans.ttf", help="Installed TrueType font name or path; never downloaded")
    args = parser.parse_args()
    root = args.root.resolve()
    original_dir = (root / ART_PATH).resolve()
    out_dir = (args.out_dir or root / DOC_PATH / "review").resolve()
    if out_dir == original_dir or out_dir.is_relative_to(original_dir):
        raise ValueError("Review output must be outside the originals directory")
    plan = json.loads((root / DOC_PATH / "generation-plan.json").read_text(encoding="utf-8"))
    entries, missing = [], []
    for call in plan["calls"]:
        name = call["filename"]
        if Path(name).name != name:
            raise ValueError("Invalid planned filename")
        path = original_dir / name
        if not path.exists():
            missing.append(name)
            continue
        if path.is_symlink() or not path.is_file():
            raise ValueError("Original must be a regular file")
        data = path.read_bytes()
        with Image.open(path) as image:
            image.load()
            rgba = image.convert("RGBA")
        entries.append({"index": call["index"], "label": call["label"], "image": rgba,
                        "filename": name, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()})
    if missing and not args.partial:
        raise ValueError(f"Missing {len(missing)} originals; use --partial for a saved checkpoint")
    if not entries:
        raise ValueError("No originals available; no empty review sheets were written")
    resolved_font = font(18, args.font).path
    font_hash = hashlib.sha256(Path(resolved_font).read_bytes()).hexdigest() if Path(resolved_font).is_file() else None
    out_dir.mkdir(parents=True, exist_ok=True)
    outputs = []
    for theme in THEMES:
        outputs.append(contact(entries, theme, out_dir, args.font))
        outputs.append(size_board(entries, theme, out_dir, args.font))
    after = {entry["filename"]: hashlib.sha256((original_dir / entry["filename"]).read_bytes()).hexdigest() for entry in entries}
    if any(after[entry["filename"]] != entry["sha256"] for entry in entries):
        raise ValueError("An original changed during review generation")
    print(json.dumps({"schema_version": 1, "saved_originals": len(entries), "target_originals": plan["target"],
                      "missing_originals": missing, "original_hashes_unchanged": True,
                      "pillow": __version__, "font": str(resolved_font), "font_sha256": font_hash,
                      "themes": THEMES, "review_output_directory": str(out_dir), "outputs": outputs,
                      "scope": "QA composites only. Downsampled whole canvas, no crop, recolour or enlargement; originals unchanged. Pixel sizes are exact in the output file, not guaranteed in a scaled viewer."},
                     ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
