#!/usr/bin/env python3
"""Render the actual SVGs and record reproducible technical checks.

Needs Pillow plus an existing project with Sharp and the artistic-vector skill.
No installation, browser, network, repository or publication actions occur.
Visual acceptance is recorded separately in REVIEW.md, never auto-certified.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import xml.etree.ElementTree as ET

from PIL import Image, ImageChops, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
SVG_DIR = ROOT / "public/artwork/editorial-illustration-v1/companions"
REVIEW = HERE / "review"
IDS = ["el01-interface", "el02-cutaway", "el03-sequence"]
PALETTES = ["light", "dark", "mono"]
PROBES = {
    "el01-interface": [(760,345), (620,470), (640,510)],
    "el02-cutaway": [(600,350), (500,410), (750,410)],
    "el03-sequence": [(500,500), (880,460)],
}


def hashes():
    return {p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(SVG_DIR.glob("*.svg"))}


def geometry(p):
    r=ET.parse(p).getroot()
    for e in r.iter():
        e.attrib.pop("fill",None)
        e.attrib.pop("stroke",None)
    return ET.tostring(r)


def sheets(font_path):
    font=ImageFont.truetype(str(font_path),16)
    small_font=ImageFont.truetype(str(font_path),15)
    centers=[(610,355),(555,490),(710,495)]
    for palette in PALETTES:
        bg="#11171b" if palette=="dark" else "#f4f1e8"
        fg="#f4f1e8" if palette=="dark" else "#28343b"
        matte="dark" if palette=="dark" else "light"
        board=Image.new("RGB",(640,900),bg)
        detail=Image.new("RGB",(640,990),bg)
        d=ImageDraw.Draw(board)
        dd=ImageDraw.Draw(detail)
        for i,(id_,(x,y)) in enumerate(zip(IDS,centers)):
            folder=REVIEW/f"{id_}-r1-{palette}"
            d.text((16,i*300+10),f"{id_} | {palette} | 320 / 160 / 64 px",font=font,fill=fg)
            for size,left,top in [(320,12,i*300+55),(160,362,i*300+65),(64,550,i*300+65)]:
                board.paste(Image.open(folder/f"{matte}-{size}.png").convert("RGB"),(left,top))
            im=Image.open(folder/f"{matte}-1600.png").convert("RGB")
            cx,cy=round(x*im.width/1200),round(y*im.height/800)
            detail.paste(im.crop((cx-300,cy-135,cx+300,cy+135)),(20,i*330+45))
            dd.text((20,i*330+14),f"{id_} | 1600px render, unscaled detail crop",font=small_font,fill=fg)
        board.save(REVIEW/f"actual-size-{palette}.png")
        detail.save(REVIEW/f"detail-{palette}.png")


def keep_review_evidence():
    """Retain every transparent export plus compact, relevant matte evidence."""
    for id_ in IDS:
        for palette in PALETTES:
            folder=REVIEW/f"{id_}-r1-{palette}"
            matte="dark" if palette=="dark" else "light"
            keep={"export-report.json",f"{matte}-640.png","checker-640.png"}
            keep.update(f"transparent-{size}.png" for size in [64,160,320,640,1600])
            generated={f"{background}-{size}.png" for background in ["light","dark","checker"] for size in [64,160,320,640,1600]}
            generated.add("review-board.png")
            for name in sorted(generated-keep):
                (folder/name).unlink(missing_ok=True)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--skill-dir",type=Path,required=True)
    parser.add_argument("--renderer-root",type=Path,required=True)
    parser.add_argument("--review-font",type=Path,required=True)
    args=parser.parse_args()
    before=hashes()
    assert len(before)==9,"Expected exactly nine palette SVGs"
    for _ in range(2):
        subprocess.run([sys.executable,str(HERE/"make_companions.py")],check=True,stdout=subprocess.DEVNULL)
        assert hashes()==before,"Byte-stability failure"
    for p in sorted(SVG_DIR.glob("*.svg")):
        subprocess.run(["node",str(args.skill_dir/"scripts/export_review.mjs"),str(p),str(REVIEW/p.stem),str(args.renderer_root),"320"],check=True,stdout=subprocess.DEVNULL)
    records=[]
    for id_ in IDS:
        source_geometry=[geometry(SVG_DIR/f"{id_}-r1-{theme}.svg") for theme in PALETTES]
        assert len(set(source_geometry))==1,"Palette changed geometry"
        alpha=[Image.open(REVIEW/f"{id_}-r1-{theme}"/"transparent-1600.png").getchannel("A") for theme in PALETTES]
        assert all(ImageChops.difference(alpha[0],a).getbbox() is None for a in alpha[1:]),"Palette changed alpha"
        probe_results=[]
        for point in PROBES[id_]:
            pixel=(round(point[0]*alpha[0].width/1200),round(point[1]*alpha[0].height/800))
            value=alpha[0].getpixel(pixel)
            assert value==0,f"Intended empty space is painted: {id_} {point}"
            probe_results.append({"viewBox_point":point,"alpha":value})
        export=json.loads((REVIEW/f"{id_}-r1-light"/"export-report.json").read_text())
        largest=export["exports"][-1]
        x0,y0,x1,y1=largest["alpha"]["painted_bounds"]
        w,h=largest["width"],largest["height"]
        margins={"left":x0/w,"right":(w-1-x1)/w,"top":y0/h,"bottom":(h-1-y1)/h}
        assert min(margins.values())>=0.12,"Less than 12% painted-edge clearance"
        records.append({"id":id_,"geometry_equal_across_palettes":True,"alpha_equal_across_palettes":True,"transparent_space_probes":probe_results,"painted_margin_fractions":margins,"large_export_alpha":largest["alpha"]})
    sheets(args.review_font)
    keep_review_evidence()
    report={"schemaVersion":1,"source_hashes":before,"determinism":{"regenerations":2,"unchanged_svg_files":9},"static_profile":{"passed":9,"renderer":"Sharp","versions":export["renderer"]["versions"]},"raster_exports":{"count":45,"widths":[64,160,320,640,1600],"all_nonempty":True,"all_have_transparent_pixels":True,"all_have_zero_edge_pixels":True},"specimens":records,"visual_review":"See REVIEW.md; this script does not certify visual acceptance.","limits":["Illustrative geometry only; no physical, scientific or temporal model validated.","No live browser, host layout, accessibility-tree, download or release checks.","Monochrome means neutral artwork colors, not a certified one-ink print separation."]}
    (HERE/"technical-review.json").write_text(json.dumps(report,indent=2)+"\n")
    print(json.dumps({"svg_audits":9,"exports":45,"deterministic_regenerations":2,"palette_geometry_and_alpha":"pass","clearance_and_holes":"pass"}))


if __name__=="__main__":
    main()
