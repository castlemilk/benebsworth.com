#!/usr/bin/env python3
"""Author three original illustrative vector counterparts; no raster tracing.

Run from any working directory. Geometry is explicit and deterministic; palettes
change resolved colors only. These are art specimens, not physical models.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parents[4]
OUT = ROOT / "public/artwork/editorial-illustration-v1/companions"
HERE = Path(__file__).resolve().parent
PALETTES = {
    "light": {"ink": "#28343b", "paper": "#f4f1e8", "side": "#d8d4c9", "accent": "#b32624"},
    "dark": {"ink": "#f4f1e8", "paper": "#394850", "side": "#263239", "accent": "#ffaaa5"},
    "mono": {"ink": "#28343b", "paper": "#f4f1e8", "side": "#dedbd2", "accent": "#28343b"},
}


def n(value):
    return f"{value:.2f}".rstrip("0").rstrip(".")


def polygon(points):
    return "M" + " L".join(f"{n(x)} {n(y)}" for x, y in points) + " Z"


def shape(identifier, path, fill="paper", width=4.6, stroke="ink"):
    return {"id": identifier, "d": path, "fill": fill, "stroke": stroke, "width": width}


def hatch(identifier, segments, width=2.4):
    d = " ".join(f"M{n(a)} {n(b)} L{n(c)} {n(e)}" for a, b, c, e in segments)
    return shape(identifier, d, "none", width)


def interface():
    def p(u, v, z=0):
        return (350 + u - 0.62*v, 215 + 0.28*u + 0.42*v + z)

    left = [(0, 0), (370, 0), (370, 90), (300, 90), (300, 180), (370, 180), (370, 260), (0, 260)]
    right = [(475, 0), (670, 0), (670, 260), (475, 260), (475, 180), (405, 180), (405, 90), (475, 90)]
    a = []
    for k, points, visible in [("receiver", left, [1, 2, 3, 4, 5, 6]), ("insert", right, [1, 2, 3, 4, 5, 6])]:
        for i in visible:
            x, y = points[i], points[(i+1) % len(points)]
            a.append(shape(f"{k}-side-{i}", polygon([p(*x), p(*y), p(*y, 94), p(*x, 94)]), "side", 4.2))
        a.append(shape(f"{k}-top", polygon([p(*q) for q in points])))
    a.append(shape("shim-side", polygon([p(310, 115, 0), p(344, 115, 0), p(344, 150, 0), p(310, 150, 0)]), "accent", 3.8))
    a.append(shape("shim-crown", polygon([p(310, 115, -15), p(344, 115, -15), p(344, 150, -15), p(310, 150, -15)]), "accent", 3.8))
    a.append(shape("shim-near-edge", polygon([p(310, 150, -15), p(344, 150, -15), p(344, 150, 0), p(310, 150, 0)]), "accent", 3.4))
    marks=[]
    for u in range(30, 175, 18):
        x,y=p(u,260,14); xx,yy=p(u+18,260,67)
        marks.append((x,y,xx,yy))
    a.append(hatch("receiver-front-hatching", marks))
    marks=[]
    for v in range(20, 120, 18):
        x,y=p(670,v,15); xx,yy=p(670,v+13,60)
        marks.append((x,y,xx,yy))
    a.append(hatch("insert-side-hatching", marks))
    return a


def cutaway():
    a = [
        shape("shell-back-wall", "M716 258 C663 166 548 135 451 172 C310 226 247 361 277 480 C307 597 422 657 542 630 L566 593 C458 610 365 550 340 461 C316 369 370 275 469 235 C550 202 625 225 670 286 Z", "paper"),
        shape("shell-left-thickness", "M451 172 C310 226 247 361 277 480 C307 597 422 657 542 630 L566 593 C458 610 365 550 340 461 C316 369 370 275 469 235 Z", "side", 4.6),
        shape("back-rim", "M451 172 C548 135 663 166 716 258 L670 286 C625 225 550 202 469 235 Z", "paper", 4.6),
        shape("upper-rib", "M345 347 C434 317 541 345 620 389 L629 422 C533 371 432 346 343 374 Z", "paper", 4.6),
        shape("lower-rib", "M335 429 C410 415 506 452 577 499 L584 533 C502 482 410 449 341 457 Z", "paper", 4.6),
        shape("near-rib-red-edge", "M526 469 C547 480 564 489 577 499 L584 533 C566 521 549 511 530 501 Z", "accent", 3.8),
        shape("displaced-section", "M837 279 C932 332 985 447 950 534 C937 570 911 595 875 610 L836 576 C907 543 925 461 888 389 C871 356 845 334 804 312 Z", "paper", 4.6),
        shape("section-cut-face", "M837 279 L804 312 C845 334 871 356 888 389 C925 461 907 543 836 576 L875 610 C968 565 988 462 934 365 C910 324 879 298 837 279 Z", "side", 4.6),
        shape("section-rim", "M837 279 C932 332 985 447 950 534", "none", 4.6),
        hatch("left-wall-hatching", [(286,390,320,404),(282,412,319,427),(286,435,323,450),(292,457,331,474),(300,479,341,496),(311,500,353,517),(325,520,366,537),(342,539,384,554),(362,556,404,571)]),
        hatch("section-hatching", [(905,376,928,365),(916,398,944,385),(924,420,954,407),(930,442,962,430),(931,464,963,453),(928,486,958,478)]),
    ]
    return a


def sequence():
    a = [
        shape("tail-side", "M180 508 L342 492 L389 553 L209 568 L209 582 L389 568 L350 508 L180 523 Z", "side", 4.2),
        shape("flat-tail", "M180 508 L342 492 L389 553 L209 568 Z", "paper", 4.6),
        shape("first-fold-rise", "M342 492 L455 276 L493 362 L389 553 Z", "side", 4.6),
        shape("broad-bridge", "M455 276 L604 321 L648 410 L493 362 Z", "paper", 4.6),
        shape("second-fold-descent", "M604 321 L690 493 L755 547 L648 410 Z", "side", 4.6),
        shape("open-arch", "M690 493 C746 362 850 287 946 296 C986 299 1018 314 1030 336 L1012 365 C911 327 814 383 755 547 Z", "paper", 4.6),
        shape("red-tail-edge", "M207 550 L382 535 L389 553 L209 568 Z", "accent", 3.4),
        shape("red-fold-edge", "M382 535 L480 348 L493 362 L389 553 Z", "accent", 3.4),
        hatch("first-turn-hatching", [(393,401,413,410),(401,385,421,395),(409,369,429,379),(417,353,437,363),(425,337,445,347)]),
    ]
    return a


SPECIMENS = [
    {"id":"el01-interface", "title":"Expose the interface", "alt":"Two unequal stepped solids sit apart, exposing a small raised shim in their shared interval.", "description":"An original illustrative interface study. The two stepped footprints and exposed shim show a relationship; no manufactured fit, dimensions or engineering tolerance is asserted.", "layers":interface()},
    {"id":"el02-cutaway", "title":"Look inside the boundary", "alt":"An open curved shell exposes two broad ribs while a detached curved wall section sits to its right.", "description":"An invented cutaway shell. The open cavity and displaced section indicate inside and outside; this is not anatomy, a real material section or a tested mechanical assembly.", "layers":cutaway()},
    {"id":"el03-sequence", "title":"From trace to structure", "alt":"One broad ribbon rises from a flat tail through two angular folds into an open arch.", "description":"A continuous illustrated ribbon changes form along its length. Shared vertices make the authored surfaces connected; this does not establish a physically foldable strip, a temporal sequence or a mathematical surface.", "layers":sequence()},
]


def svg(specimen, palette):
    lines=[f'<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800" role="img" aria-labelledby="{specimen["id"]}-title {specimen["id"]}-description">',f'<title id="{specimen["id"]}-title">{escape(specimen["title"])}</title>',f'<desc id="{specimen["id"]}-description">{escape(specimen["description"])}</desc>',f'<g id="{specimen["id"]}-geometry" stroke-linecap="round" stroke-linejoin="round">']
    for item in specimen["layers"]:
        fill = palette.get(item["fill"], item["fill"])
        stroke = palette.get(item["stroke"], item["stroke"])
        lines.append(f'<path id="{item["id"]}" d="{item["d"]}" fill="{fill}" stroke="{stroke}" stroke-width="{item["width"]}"/>')
    lines.extend(['</g>','</svg>',''])
    return "\n".join(lines)


def main():
    OUT.mkdir(parents=True,exist_ok=True)
    records=[]
    for s in SPECIMENS:
        geo=json.dumps(s["layers"],sort_keys=True,separators=(",",":"))
        record={k:v for k,v in s.items() if k!="layers"}
        record.update(revision="r1",provenance="original-authored-illustrative-vector",trace_source=None,image_inputs=[],viewBox=[0,0,1200,800],geometry_sha256=hashlib.sha256(geo.encode()).hexdigest(),layer_ids=[x["id"] for x in s["layers"]],minimum_intended_width_px=320,files=[])
        for name,p in PALETTES.items():
            path=OUT/f'{s["id"]}-r1-{name}.svg'
            data=svg(s,p).encode()
            path.write_bytes(data)
            record["files"].append({"path":str(path.relative_to(ROOT)),"palette":name,"bytes":len(data),"sha256":hashlib.sha256(data).hexdigest()})
        records.append(record)
    manifest={"schemaVersion":1,"packet":"blog-editorial-illustration-language-v1","scope":"Three independently authored vector counterparts. Not tracings, replacements or exact reconstructions of the generated raster originals. Palette variants are not additional artworks.","source":"make_companions.py","source_revision":"1","randomness":"none","palettes":PALETTES,"license":"No new public licence assigned; no external stock or vendor graphics used. Project owner retains licensing decision.","assets":records}
    (HERE/"vector-manifest.json").write_text(json.dumps(manifest,indent=2)+"\n")
    print(json.dumps({"assets":len(records),"svg_files":sum(len(x["files"]) for x in records),"output":"public/artwork/editorial-illustration-v1/companions/"}))


if __name__=="__main__":
    main()
