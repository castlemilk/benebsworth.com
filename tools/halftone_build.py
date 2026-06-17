"""Build a halftone dot-pattern PNG from a cropped portrait.

Renders the source as a grid of small filled circles whose radius scales
with local darkness. The result is the static "rasterised" default layer
for the about-page hero plate (see components/about/halftone-hero.tsx).

Usage: python3 tools/halftone_build.py

Inputs:  <repo>/public/about/portrait-2.jpg   (the cropped source)
Outputs: <repo>/public/about/portrait-2-halftone.png

The script resolves paths relative to itself so it works from any cwd.
Run it from the project root (or anywhere) — no arguments needed.

To use a different source photo, edit SRC below or pass an env var:
    PORTRAIT_SRC=public/about/portrait-3.jpg python3 tools/halftone_build.py
"""
import os
import sys
from PIL import Image, ImageDraw

# Resolve project root from this script's location: tools/halftone_build.py
# -> tools/ -> project root
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SRC = os.environ.get(
    "PORTRAIT_SRC",
    os.path.join(ROOT, "public", "about", "portrait-2.jpg"),
)
DST = os.environ.get(
    "PORTRAIT_DST",
    os.path.join(ROOT, "public", "about", "portrait-2-halftone.png"),
)

# Grid parameters — see references/halftone-hero-pattern.md for the
# design rationale behind these specific values.
DOT_SPACING = 7  # pixels between dot centers; smaller = denser
MAX_DOT_RADIUS = DOT_SPACING * 0.85
MIN_DOT_RADIUS = 1.6  # every grid point gets a visible dot, even in highlights

src = Image.open(SRC).convert("L")
w, h = src.size
print(f"source: {SRC} ({w}x{h})", flush=True)

out = Image.new("L", (w, h), 255)
draw = ImageDraw.Draw(out)

# Pre-load pixels as a list for speed (~3-4x faster than getpixel in a tight loop)
pixels = list(src.getdata())

for gy in range(0, h, DOT_SPACING):
    for gx in range(0, w, DOT_SPACING):
        # Sample a small window around the grid point
        total = 0
        count = 0
        for dy in range(0, DOT_SPACING, 2):
            py = min(h - 1, gy + dy)
            for dx in range(0, DOT_SPACING, 2):
                px = min(w - 1, gx + dx)
                total += pixels[py * w + px]
                count += 1
        avg = total / count
        darkness = 1.0 - (avg / 255.0)
        r = MIN_DOT_RADIUS + darkness * (MAX_DOT_RADIUS - MIN_DOT_RADIUS)
        if r < 1:
            continue
        draw.ellipse((gx - r, gy - r, gx + r, gy + r), fill=0)

out.save(DST, optimize=True)
print(f"wrote: {DST} ({os.path.getsize(DST)} bytes)", flush=True)
