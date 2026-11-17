#!/usr/bin/env python3
"""Inspect immutable category PNG originals; write reproducible measurements."""
import hashlib, json, pathlib, sys
from PIL import Image
ROOT=pathlib.Path(__file__).resolve().parents[4]
DOC=ROOT/"docs/design/category-expansion/batch-02"
ASSETS=ROOT/"public/artwork/category-expansion-v1/batch-02/originals"
def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def inspect(p):
    with Image.open(p) as image:
        image.load()
        if image.mode != "RGBA": raise ValueError(f"{p.name}: expected RGBA; found {image.mode}")
        alpha=image.getchannel("A")
        histogram=alpha.histogram()
        total=image.width*image.height
        bbox=alpha.getbbox()
        high=alpha.point(lambda v:255 if v>=128 else 0).getbbox()
        margins=[bbox[0],bbox[1],image.width-bbox[2],image.height-bbox[3]] if bbox else None
        borders=[alpha.crop(box).getextrema()[1] for box in [
            (0,0,image.width,1),(0,image.height-1,image.width,image.height),
            (0,0,1,image.height),(image.width-1,0,image.width,image.height)]]
        return {
          "path":p.relative_to(ROOT).as_posix(),"bytes":p.stat().st_size,
          "sha256":digest(p),"format":image.format,"mode":image.mode,
          "width":image.width,"height":image.height,
          "alpha":{"min":alpha.getextrema()[0],"max":alpha.getextrema()[1],
            "transparent_pixels":histogram[0],"partial_pixels":sum(histogram[1:255]),
            "opaque_pixels":histogram[255],"transparent_fraction":round(histogram[0]/total,6),
            "nonzero_bbox":bbox,"alpha128_bbox":high,
            "clear_margins_px_left_top_right_bottom":margins,
            "minimum_clear_margin_fraction":round(min(margins)/image.width,6) if margins else None,
            "outer_edge_max_alpha_top_bottom_left_right":borders},
          "alpha_claim":"Transparent and partial-alpha pixels verified from decoded PNG; edge appearance requires visual review."
        }
def main():
    spec=json.loads((DOC/"prompts.json").read_text())
    receipts=json.loads((DOC/"generation-receipts.json").read_text())
    records=[]
    for s in spec["prompts"]:
        p=ASSETS/s["filename"]
        if not p.exists(): continue
        record=inspect(p)
        record.update({"order":s["order"],"topic_key":s["key"],"existing_label":s["existing_label"],
            "taxonomy_status":"existing","concept":s["concept"],
            "prompt_sha256":hashlib.sha256(s["prompt"].encode()).hexdigest(),
            "generation_tool":"image_gen.imagegen","settings":s["settings"],
            "source_identity":next(r for r in receipts if r["key"]==s["key"])})
        if record["sha256"]!=record["source_identity"]["source_sha256"]: raise ValueError("Source byte mismatch")
        records.append(record)
    manifest={
      "schema_version":1,"batch":2,"title":"Platform craft and fieldwork",
      "target_image_count":10,"completed_original_image_count":len(records),
      "base_revision":spec["base_revision"],"branch":"art/blog-category-expansion-batch-02",
      "space_url":spec["space_url"],"originals_are_unmodified":True,
      "media_kind":"generated raster artwork; not editable vector",
      "evidence_boundary":"Editorial metaphors, not measurements, scientific evidence, real graph data or official vendor marks.",
      "browser_checks":"unavailable; not performed",
      "images":records
    }
    (DOC/"manifest.json").write_text(json.dumps(manifest,indent=2)+"\n")
    print(json.dumps({"completed":len(records),"target":10,"images":[
      {"key":r["topic_key"],"size":[r["width"],r["height"]],"sha256":r["sha256"],"alpha":r["alpha"]} for r in records]},indent=2))
if __name__=="__main__": main()

