#!/usr/bin/env python3
"""Compose review-only PNG sheets from unmodified Batch 03 originals.

Pillow composites/resizes copies in memory; source bytes are never changed.
Contact sheets preserve the full original canvas. Size boards render at the
stated pixel sizes. Edge sheets explicitly magnify sampled source crops and
are NOT replacement assets or browser screenshots. Missing files are skipped.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


HERE = Path(__file__).resolve().parent
REPO = HERE.parents[3]
ORIGINALS = REPO / "public/artwork/category-expansion-v1/batch-03/originals"
THEMES = {"light": ("#f4f0e8", "#262522", "#6c655d"),
          "dark": ("#191a1c", "#eee8dc", "#b6afa3")}


def font(size: int):
    for path in ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
                 "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf"):
        if Path(path).is_file():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def contain(source: Image.Image, pixels: int) -> Image.Image:
    ratio = min(pixels / source.width, pixels / source.height)
    size = (max(1, round(source.width * ratio)), max(1, round(source.height * ratio)))
    result = source.resize(size, Image.Resampling.LANCZOS)
    square = Image.new("RGBA", (pixels, pixels))
    square.alpha_composite(result, ((pixels - result.width) // 2, (pixels - result.height) // 2))
    return square


def contact(assets: list, output: Path, stem: str) -> list[str]:
    names = []
    columns = min(5, max(2, len(assets)))
    rows = math.ceil(len(assets) / columns)
    cell_w, cell_h, inset, header = 288, 316, 16, 72
    for theme, (background, ink, quiet) in THEMES.items():
        board = Image.new("RGBA", (columns * cell_w, header + rows * cell_h + 28), background)
        draw = ImageDraw.Draw(board)
        draw.text((20, 14), "Batch 03  Computing systems", fill=ink, font=font(22))
        draw.text((20, 44), f"{len(assets)} original studies · {theme} composite · full canvas contained at 256 px", fill=quiet, font=font(13))
        for index, (spec, source) in enumerate(assets):
            x, y = (index % columns) * cell_w, header + (index // columns) * cell_h
            board.alpha_composite(contain(source, 256), (x + inset, y))
            draw.text((x + inset, y + 266), f"{spec['number']:02d}  {spec['label']}", fill=ink, font=font(15))
            draw.text((x + inset, y + 289), "Proposed artwork study", fill=quiet, font=font(12))
        name = f"{stem}contact-{theme}.png"
        board.convert("RGB").save(output / name)
        names.append(name)
    return names


def size_board(assets: list, output: Path, stem: str, sizes: list[int]) -> list[str]:
    names = []
    label_width, gap, header = 238, 24, 94
    width = label_width + sum(sizes) + gap * (len(sizes) + 1)
    row_height = max(sizes) + 30
    for theme, (background, ink, quiet) in THEMES.items():
        board = Image.new("RGBA", (width, header + row_height * len(assets) + 20), background)
        draw = ImageDraw.Draw(board)
        draw.text((20, 16), f"Actual pixel sizes · {theme} composite", fill=ink, font=font(22))
        draw.text((20, 48), "Inspect at 100% zoom. Full canvas retained; labels are separate from generated art.", fill=quiet, font=font(13))
        x = label_width + gap
        for size in sizes:
            draw.text((x, 75), f"{size} px", fill=quiet, font=font(12))
            x += size + gap
        for index, (spec, source) in enumerate(assets):
            y = header + index * row_height
            draw.text((20, y + 12), f"{spec['number']:02d}  {spec['label']}", fill=ink, font=font(15))
            draw.text((20, y + 36), "Proposed study", fill=quiet, font=font(12))
            x = label_width + gap
            for size in sizes:
                board.alpha_composite(contain(source, size), (x, y))
                x += size + gap
        name = f"{stem}sizes-{theme}.png"
        board.convert("RGB").save(output / name)
        names.append(name)
    return names


def edge_points(source: Image.Image) -> list[tuple[str, int, int]]:
    alpha = source.getchannel("A")
    mask = alpha.point(lambda value: 255 if value > 16 else 0)
    box = mask.getbbox()
    if box is None:
        return []
    left, top, right, bottom = box
    pixels = mask.load()
    top_x = [x for x in range(left, right) if pixels[x, top]]
    bottom_x = [x for x in range(left, right) if pixels[x, bottom - 1]]
    left_y = [y for y in range(top, bottom) if pixels[left, y]]
    right_y = [y for y in range(top, bottom) if pixels[right - 1, y]]
    return [("top", top_x[len(top_x) // 2], top),
            ("right", right - 1, right_y[len(right_y) // 2]),
            ("bottom", bottom_x[len(bottom_x) // 2], bottom - 1),
            ("left", left, left_y[len(left_y) // 2])]


def edge_board(spec: dict, source: Image.Image, output: Path, crop_size: int) -> tuple[str | None, list]:
    points = edge_points(source)
    if not points:
        return None, []
    scale, gutter, header = 3, 18, 88
    display = crop_size * scale
    cell_width, row_height = display + gutter * 2, display + 58
    board = Image.new("RGBA", (len(points) * cell_width, header + row_height * 2), "#f4f0e8")
    draw = ImageDraw.Draw(board)
    draw.text((18, 14), f"{spec['number']:02d}  {spec['label']} · sampled edge review", fill="#262522", font=font(22))
    draw.text((18, 46), f"{crop_size} × {crop_size} source crops at 3× nearest-neighbour; alpha >16 extreme points. Visual sample only.", fill="#6c655d", font=font(13))
    samples = []
    for column, (side, cx, cy) in enumerate(points):
        x0, y0 = cx - crop_size // 2, cy - crop_size // 2
        box = (x0, y0, x0 + crop_size, y0 + crop_size)
        patch = source.crop(box).resize((display, display), Image.Resampling.NEAREST)
        samples.append({"edge": side, "source_crop_xyxy_exclusive": list(box), "scale": scale})
        for row, (theme, (background, ink, quiet)) in enumerate(THEMES.items()):
            x, y = column * cell_width, header + row * row_height
            draw.rectangle((x, y, x + cell_width, y + row_height), fill=background)
            board.alpha_composite(patch, (x + gutter, y + 8))
            draw.text((x + gutter, y + display + 16), f"{side} · {theme} · ({cx}, {cy})", fill=ink, font=font(13))
    name = f"{spec['number']:02d}-{spec['slug']}-edges.png"
    board.convert("RGB").save(output / name)
    return name, samples


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--prompts", type=Path, default=HERE / "prompts.json")
    parser.add_argument("--originals", type=Path, default=ORIGINALS)
    parser.add_argument("--output-dir", type=Path, default=HERE / "review")
    parser.add_argument("--pair", type=int, choices=range(1, 6), help="Select the numbered pair: 1=images 1–2, through 5=images 9–10.")
    parser.add_argument("--sizes", default="256,96,48,24", help="Comma-separated actual pixel sizes, default 256,96,48,24.")
    parser.add_argument("--edge-crop", type=int, default=96, help="Source patch size, shown at 3×. Default 96.")
    args = parser.parse_args()
    if args.originals.resolve() == args.output_dir.resolve() or args.originals.resolve() in args.output_dir.resolve().parents:
        parser.error("Review outputs must not be within originals")
    try:
        sizes = [int(size) for size in args.sizes.split(",")]
        if not sizes or any(size < 16 or size > 512 for size in sizes) or not 16 <= args.edge_crop <= 256:
            raise ValueError("Sizes must be 16–512 px and edge crops 16–256 px")
        specs = json.loads(args.prompts.read_text())["assets"]
        if args.pair:
            specs = specs[(args.pair - 1) * 2:args.pair * 2]
        assets, hashes, skipped = [], {}, []
        for spec in specs:
            path = args.originals / spec["filename"]
            if not path.is_file():
                skipped.append(spec["filename"])
                continue
            hashes[path] = hashlib.sha256(path.read_bytes()).hexdigest()
            with Image.open(path) as opened:
                opened.load()
                assets.append((spec, opened.convert("RGBA")))
        if not assets:
            raise ValueError("No originals exist for the selected inventory")
        args.output_dir.mkdir(parents=True, exist_ok=True)
        stem = f"pair-{args.pair:02d}-" if args.pair else ""
        outputs = contact(assets, args.output_dir, stem) + size_board(assets, args.output_dir, stem, sizes)
        samples = {}
        for spec, source in assets:
            name, coordinates = edge_board(spec, source, args.output_dir, args.edge_crop)
            if name:
                outputs.append(name)
                samples[name] = coordinates
        for path, before in hashes.items():
            if hashlib.sha256(path.read_bytes()).hexdigest() != before:
                raise ValueError(f"Original changed during review generation: {path.name}")
        receipt = {"generated_count": len(assets), "skipped": skipped,
                   "themes": {name: value[0] for name, value in THEMES.items()},
                   "sizes_px": sizes, "originals_unchanged": True,
                   "source_sha256": {path.name: digest for path, digest in hashes.items()},
                   "edge_samples": samples,
                   "outputs": [{"filename": name, "sha256": hashlib.sha256((args.output_dir / name).read_bytes()).hexdigest()} for name in outputs],
                   "evidence_boundary": "Review composites, never browser screenshots or additional original artworks. Visual inspection is still required."}
        (args.output_dir / f"{stem}review-receipt.json").write_text(json.dumps(receipt, indent=2) + "\n")
        print(json.dumps({"generated_count": len(assets), "skipped": skipped,
                          "output_dir": str(args.output_dir), "outputs": outputs, "originals_unchanged": True}))
        return 0
    except (OSError, ValueError, KeyError, TypeError) as exc:
        parser.exit(2, f"Review input error: {exc}\n")


if __name__ == "__main__":
    raise SystemExit(main())
