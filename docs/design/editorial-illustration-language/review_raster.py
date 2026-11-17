#!/usr/bin/env python3
"""Measure original PNGs and make labelled review composites; never resave a master."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps
import hashlib, json, platform

DOC=Path(__file__).resolve().parent
ROOT=DOC.parents[2]
OUT=DOC/"review"
OUT.mkdir(exist_ok=True)
ART=ROOT/"public/artwork/editorial-illustration-v1/originals"
RECORDS=[
 ("el01-interface","Expose the interface",
  "Two pale stepped pieces sit apart, exposing a small red shim on the left piece.",
  "An invented assembly makes the interface visible. It illustrates a relationship between parts; it is not a dimensioned or functional joint.",
  "a78451f3ffe5c6d3e3eeeaa0bfc4a9af37e8889fde3680f1b0202221483ca938",
  "f55d187e828d203423be1fbbdc4da8ff7fe7d893f36f0c060222c5337dff1366",
  (946,645)),
 ("el02-cutaway","Look inside the boundary",
  "An open pale shell exposes two curved ribs, with a detached side section to the right and a red edge on the lower rib.",
  "An invented cutaway distinguishes an exterior from its interior. It does not represent a named organism, material sample or tested mechanism.",
  "00e7828545a9d849d3407ab8fb359b9232300cc1788420e4a5384c3e3c4f48c1",
  "ff6d34aecd86f0bd5e8f1fda21533143c9b3c9170b7e6e12fc4f41c6c4322df3",
  (900,450)),
 ("el03-sequence","From trace to structure",
  "A continuous pale ribbon rises from a flat red-edged tail through broad bends into an open arch.",
  "A sculptural ribbon suggests progressive construction. Its spatial sequence is illustrative, not evidence of temporal causation, topology or physical foldability.",
  "3a04e2f1b20307987ff374042b2f89d58f5ed832592ed6928c477c0deee898d4",
  "64de8088b86ee0cfde8f0b60c80961644b0465a1e0565df4e3af320cd3ab7d4c",
  (1135,505))
]
fontpath=ROOT/"public/fonts/editorial/barlow-condensed-semibold.ttf"
def font(n):
 return ImageFont.truetype(str(fontpath),n)
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def metrics(p):
 im=Image.open(p)
 assert im.format=="PNG" and im.mode=="RGBA"
 im.load()
 a=im.getchannel("A");w,h=im.size;hist=a.histogram()
 bbox=a.getbbox();core=a.point(lambda v:255 if v>16 else 0).getbbox()
 border=max(a.crop((0,0,w,1)).getextrema()[1],a.crop((0,h-1,w,h)).getextrema()[1],a.crop((0,0,1,h)).getextrema()[1],a.crop((w-1,0,w,h)).getextrema()[1])
 margins=[core[0]/w,core[1]/h,(w-core[2])/w,(h-core[3])/h]
 return {"path":p.relative_to(ROOT).as_posix(),"bytes":p.stat().st_size,"sha256":digest(p),
 "format":"PNG","mode":im.mode,"width":w,"height":h,"alpha_min":a.getextrema()[0],"alpha_max":a.getextrema()[1],
 "transparent_pixels":hist[0],"partially_transparent_pixels":sum(hist[1:255]),
 "low_alpha_1_to_16_pixels":sum(hist[1:17]),"painted_bounds_alpha_gt_0":bbox,
 "substantial_bounds_alpha_gt_16":core,"substantial_margins_ltrb_percent":[round(x*100,3) for x in [margins[0],margins[1],margins[2],margins[3]]],
 "margin_order":["left","top","right","bottom"],"minimum_substantial_margin_percent":round(min(margins)*100,3),
 "outer_border_max_alpha":border,"has_real_transparency":hist[0]>0,
 "strict_zero_alpha_background_claim":False,"candidate_margin_floor_12_percent_pass":min(margins)>=.12}
def matte(im,w,bg,gray=False):
 if gray:
  a=im.getchannel("A");im=ImageOps.grayscale(im).convert("RGBA");im.putalpha(a)
 h=round(im.height*w/im.width)
 im=im.resize((w,h),Image.Resampling.LANCZOS)
 bgim=Image.new("RGBA",im.size,bg);bgim.alpha_composite(im)
 return bgim.convert("RGB")
prompts=json.loads((DOC/"generation-prompts.json").read_text())
edits=json.loads((DOC/"correction-prompts.json").read_text())
assets=[]
for i,(key,title,alt,caption,expected,earlier,probe) in enumerate(RECORDS):
 p=ART/f"{key}-r2.png";r1=DOC/"process/r1"/f"{key}-r1.png"
 assert digest(p)==expected and digest(r1)==earlier
 m=metrics(p);m1=metrics(r1)
 assert m["candidate_margin_floor_12_percent_pass"]
 im=Image.open(p).convert("RGBA")
 probealpha=im.getchannel("A").getpixel(probe)
 assert probealpha==0,(key,probe,probealpha)
 a={"id":key,"display_id":f"EL0{i+1}","title":title,"revision":"r2","user_rating":"unrated",
 "assistant_decision":"retain as a review candidate","provenance_class":"illustrative-generated-raster",
 "alt":alt,"caption":caption,"minimum_intended_width_px":320,"thumbnail_only_width_px":160,
 "generation":{"tool":"OpenAI built-in imagegen","model_version":None,"seed":None,"quality":None,"requested_size_parameter":None,
 "transparent_background":True,"initial_prompt":prompts["assets"][i]["prompt"],"initial_image_inputs":[],
 "correction_prompt":edits["assets"][i]["prompt"],"correction_image_input_sha256":earlier,"correction_image_input_revision":"r1"},
 "original_unmodified":True,"r2":m,"r1":m1,"empty_space_probe":{"pixel":probe,"alpha":probealpha},
 "scientific_claim":"No measured, simulated, anatomical, mathematical or physical mechanism claim."}
 assets.append(a)
 for theme,bg in [("light","#f4f1e8"),("dark","#181c20")]:
  matte(im,640,bg).save(OUT/f"{key}-r2-{theme}-640.jpg",quality=95,subsampling=0)
  matte(im,1536,bg).save(OUT/f"{key}-r2-{theme}-detail.jpg",quality=94,subsampling=0)
# Actual-size sheets retain the specified pixel widths within the board.
for theme,bg,fg in [("light","#f4f1e8","#28343b"),("dark","#181c20","#f4f1e8")]:
 board=Image.new("RGB",(1240,1620),bg);d=ImageDraw.Draw(board)
 for i,(key,title,*_) in enumerate(RECORDS):
  y=i*540;d.text((24,y+16),f"EL0{i+1}  {title}  /  160, 320, 640 px",font=font(24),fill=fg)
  im=Image.open(ART/f"{key}-r2.png").convert("RGBA")
  for x,w in [(24,160),(204,320),(552,640)]:
   tile=matte(im,w,bg);board.paste(tile,(x,y+64));d.text((x,y+76+tile.height),f"{w} px",font=font(18),fill=fg)
 board.save(OUT/f"raster-actual-size-{theme}.jpg",quality=94,subsampling=0)
# Concise paired overview; all images use their full uncropped original canvas.
overview=Image.new("RGB",(1200,1210),"#e0dcd3");d=ImageDraw.Draw(overview)
for i,(key,title,*_) in enumerate(RECORDS):
 im=Image.open(ART/f"{key}-r2.png").convert("RGBA")
 for j,(bg,fg) in enumerate([("#f4f1e8","#28343b"),("#181c20","#f4f1e8")]):
  x=j*600;y=i*400;tile=matte(im,590,bg);overview.paste(tile,(x,y))
  d.text((x+24,y+355),f"EL0{i+1}  {title}",font=font(24),fill=fg)
overview.save(OUT/"raster-light-dark-overview.jpg",quality=94,subsampling=0)
mono=Image.new("RGB",(960,720),"#f4f1e8");d=ImageDraw.Draw(mono)
for i,(key,title,*_) in enumerate(RECORDS):
 im=Image.open(ART/f"{key}-r2.png").convert("RGBA")
 mono.paste(matte(im,320,"#f4f1e8",gray=True),(i*320,72))
 d.text((i*320+20,300),f"EL0{i+1}",font=font(24),fill="#28343b")
 d.text((24,420),"Grayscale inspection composite: geometry and position retain the focal relationship.",font=font(24),fill="#28343b")
mono=mono.crop((0,0,960,500));mono.save(OUT/"raster-grayscale-review.jpg",quality=94,subsampling=0)
manifest={"schema_version":1,"packet_id":"blog-editorial-illustration-language-v1","prepared_date":"2026-11-17","timezone":"Australia/Melbourne",
 "baseline_commit":"e1c0f0a4c9ac4d7d189542e7c71abf274cc0977e",
 "baseline_role":"initial artwork audit",
 "validation_base_commit":"06438f05c829a0df0d05e625e7adebec09eb895c",
 "branch":"art/blog-editorial-illustration-language-20261117","scope":"Isolated design review; no runtime adoption or release",
 "distinct_raster_concepts":3,"generation_calls":6,"initial_calls":3,"corrective_calls":3,
 "rights":"No new public licence assigned; no third-party input images or vendor graphics. Generated provenance does not establish exclusive rights.",
 "raster_theme_strategy":"Same unchanged original on two labelled review mattes; no recoloured original.",
 "review_renderer":{"library":"Pillow","version":Image.__version__,"resampling":"LANCZOS","python":platform.python_version()},
 "vector_manifest":"vector-source/vector-manifest.json","assets":assets}
(DOC/"manifest.json").write_text(json.dumps(manifest,indent=2)+"\n")
report={"schema_version":1,"png_decodes":6,"all_original_hashes_match":True,
 "r2_substantial_margin_floor_12_percent_pass":all(x["r2"]["candidate_margin_floor_12_percent_pass"] for x in assets),
 "r2_empty_space_probes_pass":3,"strict_zero_alpha_background":False,
 "caveat":"Low-alpha residue persists. Substantial painted bounds use alpha > 16; do not equate this with a wholly clean cutout.",
 "actual_size_sheets":[160,320,640],"detail_width_px":1536,"review_mattes":["#f4f1e8","#181c20"],
 "checks":[{"id":x["id"],"r1":x["r1"],"r2":x["r2"],"probe":x["empty_space_probe"]} for x in assets]}
(OUT/"raster-technical-review.json").write_text(json.dumps(report,indent=2)+"\n")
rows="\n".join(f"| {x['display_id']} | {x['r2']['width']} x {x['r2']['height']} | {x['r2']['minimum_substantial_margin_percent']:.1f}% | {x['r2']['outer_border_max_alpha']}/255 | {x['r2']['sha256']} |" for x in assets)
(DOC/"review/REPORT.md").write_text(f"""# Raster specimen review

## Measured result

Six original PNGs decoded and matched their recorded SHA-256 hashes. Three r2 candidates pass the 12% margin floor around substantial pixels (alpha > 16/255); three explicit gap/under-form probes have alpha zero. The three r1 originals remain preserved. Original files were never resaved by this review.

| ID | Original dimensions | Smallest substantial margin | Maximum border alpha | SHA-256 |
| --- | --- | --- | --- | --- |
{rows}

All three r2 images have alpha values from 0 to 254. Faint low-alpha residue extends outside the substantial painted bounds; EL02 reaches the bottom border at alpha 1/255. This is genuine transparency with a recorded fringe limitation, not a perfect zero-background cutout. The 16% correction target is not achieved on every side of EL01/EL03. Their measured minima exceed the 12% working floor.

## Visual review

Review mattes are paper #f4f1e8 and charcoal #181c20. Actual-size sheets place each full original canvas at 160, 320 and 640 pixels wide. Detail composites retain 1536-pixel width. Grayscale is a labelled inspection composite, not an alternate original.

- EL01: retain. The unequal pieces and open step read first; the raised shim gives the focal cue. At 320 px the seam and red insert remain visible. At 160 px the hatch texture collapses and no tolerance or fit should be inferred.
- EL02: retain as an invented cutaway. The shell and displaced wall remain distinguishable on both mattes. Two curved ribs give interior rhythm. Some interior areas are real depicted rear surfaces, so they remain ivory. The cutaway must not be captioned as anatomy or a material specimen.
- EL03: retain as a continuous illustrative form. The flat tail, rise, valley and final arch remain legible. The visible shape has more than a literal two crease edges, so do not describe it as an exact two-fold construction or a fold sequence that can be manufactured.
- Grayscale: form and position retain the relationship. Red adds emphasis rather than carrying the only meaningful distinction.

The actual images were inspected by the author; independent packet review is recorded separately. No DOM, native-browser, live-site, print-device or assistive-technology acceptance is claimed.

## Vector counterpart evidence

See [the vector review](../vector-source/REVIEW.md) and [vector technical evidence](../vector-source/technical-review.json). The separate SVGs are original authored counterparts, not traced or exact raster geometry. Their palette variants have identical geometry and alpha masks; their strict empty-edge checks are separate from the raster fringe limitation.

## Reproduce

Run from the repository root:

```bash
python3 docs/design/editorial-illustration-language/review_raster.py
```

Pillow and the repository Barlow Condensed font are required. The command verifies the immutable expected PNG hashes before generating secondary composites and machine-readable reports. It does not regenerate raster originals.
""")
print(json.dumps({"original_pngs_verified":6,"r2_candidates":3,"margin_floor_pass":True,"probe_pass":3,"strict_zero_alpha_background":False,"output":"docs/design/editorial-illustration-language/review"}))
