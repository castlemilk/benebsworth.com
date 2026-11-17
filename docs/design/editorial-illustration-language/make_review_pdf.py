#!/usr/bin/env python3
"""Build the bounded editorial illustration review PDF from retained originals.

Uses repository fonts and installed ReportLab/Pillow/fontTools. Font conversion
and raster samples live only in --work-dir. No original asset is resaved.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from xml.sax.saxutils import escape

from fontTools.ttLib import TTFont as FontToolsFont
from fontTools.varLib.instancer import instantiateVariableFont
from PIL import Image
from reportlab import rl_config
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen.canvas import Canvas
from reportlab.platypus import Paragraph

DOC = Path(__file__).resolve().parent
ROOT = DOC.parents[2]
W, H = A4
M = 54
CW = W - 2*M
INK = colors.HexColor("#28343b")
PAPER = colors.HexColor("#f4f1e8")
RED = colors.HexColor("#b32624")
MUTED = colors.HexColor("#596267")
RULE = colors.HexColor("#cecfc6")
RASTER_DARK = colors.HexColor("#181c20")
VECTOR_DARK = colors.HexColor("#11171b")
SERIF = "SourceSerif4Roman-Regular"
LABEL = "BarlowCondensed-SemiBold"


def paragraph(c, text, x, top, width, size=11, leading=16, color=INK, font=SERIF, max_height=None):
    style=ParagraphStyle("p",fontName=font,fontSize=size,leading=leading,textColor=color,
                         alignment=TA_LEFT,spaceBefore=0,spaceAfter=0,allowWidows=0,
                         allowOrphans=0,splitLongWords=0)
    p=Paragraph(text,style)
    _,height=p.wrap(width,1000)
    if max_height is not None and height>max_height+0.1:
        raise ValueError(f"Paragraph overflow {height:.1f}>{max_height}: {text[:70]}")
    if top-height<52:
        raise ValueError(f"Paragraph enters footer: {text[:70]}")
    p.drawOn(c,x,top-height)
    return top-height


def label(c,text,x,y,size=10,color=INK):
    c.setFillColor(color); c.setFont(LABEL,size); c.drawString(x,y,text)


def title(c,text,y=738,size=30):
    return paragraph(c,escape(text),M,y,CW,size,size*1.13,max_height=78)


def hairline(c,y):
    c.setStrokeColor(RULE); c.setLineWidth(.5); c.line(M,y,W-M,y)


def page(c,number,section):
    c.setFillColor(PAPER); c.rect(0,0,W,H,fill=1,stroke=0)
    label(c,"BEN EBSWORTH / RESEARCH FOLIO",M,H-43,10.2)
    c.setFont(LABEL,9); c.setFillColor(MUTED)
    c.drawRightString(W-M,H-43,section.upper())
    c.setStrokeColor(RULE); c.setLineWidth(.45); c.line(M,H-53,W-M,H-53)
    c.setFont(LABEL,9); c.setFillColor(MUTED)
    c.drawString(M,30,"EDITORIAL ILLUSTRATION LANGUAGE / REVIEW CANDIDATES")
    c.drawRightString(W-M,30,f"17 NOV 2026 / {number:02d}")


def contain(c,path,x,y,width,height,matte=None):
    if matte:
        c.setFillColor(matte); c.rect(x,y,width,height,fill=1,stroke=0)
    with Image.open(path) as im:
        iw,ih=im.size
    scale=min(width/iw,height/ih)
    dw,dh=iw*scale,ih*scale
    c.drawImage(str(path),x+(width-dw)/2,y+(height-dh)/2,width=dw,height=dh,mask="auto")


def table(c,headers,rows,x,top,width,widths,row_height=30):
    if abs(sum(widths)-width)>0.2:
        raise ValueError("Table widths do not match")
    c.setFillColor(INK); c.rect(x,top-row_height,width,row_height,fill=1,stroke=0)
    xx=x
    for head,w in zip(headers,widths):
        label(c,head,xx+8,top-19,10,PAPER);xx+=w
    y=top-row_height
    for row in rows:
        xx=x
        for value,w in zip(row,widths):
            paragraph(c,escape(str(value)),xx+8,y-8,w-16,10,13,max_height=row_height-8)
            xx+=w
        y-=row_height
        c.setStrokeColor(RULE);c.setLineWidth(.45);c.line(x,y,x+width,y)
    return y


def load_fonts(work):
    font_dir=ROOT/"public/fonts/editorial"
    serif=FontToolsFont(font_dir/"source-serif-4.woff")
    serif.flavor=None
    if "fvar" in serif:
        serif=instantiateVariableFont(serif,{"wght":400,"opsz":20},inplace=False)
    serif.recalcTimestamp=False
    ttf=work/"SourceSerif4Roman-Regular.ttf"
    serif.save(ttf)
    pdfmetrics.registerFont(TTFont(SERIF,str(ttf)))
    pdfmetrics.registerFont(TTFont(LABEL,str(font_dir/"barlow-condensed-semibold.ttf")))
    pdfmetrics.registerFontFamily(SERIF,normal=SERIF,bold=SERIF,italic=SERIF,boldItalic=SERIF)


def cover(c,assets):
    page(c,1,"Direction")
    title(c,"Editorial",744,38)
    title(c,"illustration language",701,38)
    paragraph(c,"Make a relationship visible.",M,626,CW,18,24,max_height=30)
    paragraph(c,"A small original specimen set for long-form technical writing: an exposed interface, an opened boundary and a continuous form taking shape.",M,590,430,12.1,18,max_height=58)
    contain(c,ROOT/assets[0]["r2"]["path"],32,270,W-64,(W-64)*2/3)
    label(c,"EL01 / EXPOSE THE INTERFACE / r2",M,291,10)
    hairline(c,264)
    columns=[("Relationship", "One focal event. Unequal weight and purposeful negative space carry the argument."),
             ("Material", "Ivory object planes, graphite contours and hatching confined to turned surfaces."),
             ("Evidence", "Illustration stays separate from measurement, models, sourced diagrams and logos.")]
    gap=22; width=(CW-2*gap)/3
    for i,(heading,body) in enumerate(columns):
        x=M+i*(width+gap)
        label(c,heading.upper(),x,238,12,RED)
        paragraph(c,body,x,221,width,10.3,15,max_height=90)
    paragraph(c,"Three concepts. Three preserved initial originals and three corrected candidates. These are unrated assistant proposals; the packet makes no runtime adoption or release claim.",M,111,CW,9.7,14,max_height=43)
    c.showPage()


def specimen(c,number,asset,deck,observation):
    page(c,number,f'{asset["display_id"]} / r2')
    title(c,asset["title"],744,30)
    paragraph(c,deck,M,695,CW,11.5,16.5,max_height=50)
    label(c,"LIGHT CONTEXT / PAPER #F4F1E8",M,637,9.5)
    contain(c,ROOT/asset["r2"]["path"],M+18,363,CW-36,(CW-36)*2/3)
    label(c,"DARK CONTEXT / CHARCOAL #181C20",M,341,9.5)
    contain(c,ROOT/asset["r2"]["path"],M,169,250,250*2/3,RASTER_DARK)
    tx=M+274; tw=CW-274
    label(c,"WHAT CARRIES THE IDEA",tx,318,11,RED)
    end=paragraph(c,observation,tx,302,tw,10,14.2,max_height=92)
    label(c,"CAPTION",tx,end-24,10.5)
    paragraph(c,escape(asset["caption"]),tx,end-38,tw,9.7,13.8,max_height=85)
    hairline(c,128)
    margin=asset["r2"]["minimum_substantial_margin_percent"]
    paragraph(c,f"Both examples use the same unchanged RGBA original, shown with its full canvas. The r2 substantial-content margin floor is {margin:.3f}% at alpha greater than 16/255. Faint residue remains; see the provenance record on page 8.",M,109,CW,9.2,13.5,max_height=48)
    c.showPage()


def vectors(c,assets):
    page(c,5,"Editable counterparts")
    title(c,"Geometry across themes",744,30)
    paragraph(c,"Three independently authored vector counterparts simplify the same relationships. They are editable path drawings, not traces or exact vector copies of the raster originals.",M,695,CW,11.2,16,max_height=50)
    label(c,"LIGHT / PAPER #F4F1E8",M,637,9.5)
    label(c,"DARK / CHARCOAL #11171B",M+258,637,9.5)
    for i,a in enumerate(assets):
        y=467-i*166
        label(c,f'{a["display_id"]} / {a["title"]}',M,y+150,11,RED)
        stem=DOC/"vector-source/review"/f'{a["id"]}-r1-light'/"transparent-640.png"
        dark=DOC/"vector-source/review"/f'{a["id"]}-r1-dark'/"transparent-640.png"
        contain(c,stem,M,y,228,152)
        contain(c,dark,M+258,y,228,152,VECTOR_DARK)
    paragraph(c,"All nine SVGs retain the same paths and alpha within each subject across light, dark and neutral monochrome versions. The 1200 x 800 masters have a 320px minimum intended width. Their deterministic file geometry does not validate a physical mechanism.",M,105,CW,9.7,14,max_height=43)
    c.showPage()


def scale_and_grammar(c,assets,work):
    page(c,6,"Scale and drawing grammar")
    title(c,"Let the idea survive reduction",744,29)
    paragraph(c,"The silhouette and focal relationship must survive before the texture matters. Keep the full canvas and its intrinsic margins; use contain sizing rather than cropping or automatic trimming.",M,695,CW,11.2,16,max_height=50)
    source=ROOT/assets[0]["r2"]["path"]
    with Image.open(source) as im:
        for width in [320,160]:
            thumb=im.resize((width,round(im.height*width/im.width)),Image.Resampling.LANCZOS)
            thumb.save(work/f"sample-{width}.png")
    label(c,"320 PX SOURCE SAMPLE / RELATIONSHIP",M,628,10,RED)
    label(c,"160 PX SOURCE SAMPLE / THUMBNAIL",M+303,628,10,RED)
    contain(c,work/"sample-320.png",M,452,240,160)
    contain(c,work/"sample-160.png",M+303,490,120,80)
    paragraph(c,"Resampled samples from the unmodified master. PDF zoom changes display size. A 160px thumbnail needs an adjacent title; it must not carry essential explanatory detail.",M,449,CW,9.5,13.5,max_height=42)
    table(c,["WIDTH","ROLE","READING CONTRACT"],[
        ["640-960 px","Primary figure","Relationship and material detail"],
        ["320 px","Minimum illustration","Whole relationship remains legible"],
        ["160 px","Contextual thumbnail","Subject and gesture only"],
        ["64 px","Vector stress check","No icon or category-mark approval"],
    ],M,385,CW,[78,134,CW-212],row_height=30)
    paragraph(c,"The drawing hierarchy",M,213,CW,17,22,max_height=24)
    paragraph(c,"Contour first; structural edges second; texture last. Reserve a broad quiet plane. Hatch only a turned or cut surface. Let a hole remain transparent, while an actual rear wall stays a solid surface.",M,181,CW,10.7,15.4,max_height=49)
    paragraph(c,"Use graphite, ivory and one physical red detail as material references. Raster colors are approximate; vector colors are resolved. Review mattes are inspection surfaces. Existing host tokens and application layouts remain unchanged.",M,116,CW,9.7,14,max_height=43)
    c.showPage()


def brief(c):
    page(c,7,"Reusable art direction brief")
    title(c,"Brief the relationship",744,30)
    paragraph(c,"Complete these six decisions for one article illustration. Resolve the fidelity contract before selecting the image-making method.",M,695,CW,11.3,16,max_height=35)
    groups=[
        ("01","Reader and purpose","Name the article, section and reader's question. Write one sentence the illustration helps the reader understand. Explain why the existing art does not already serve it."),
        ("02","Truth and evidence","Choose illustrative, mathematical, data-derived or simulation provenance. State what must remain true, what must not be implied, and the source evidence or explicit invented construction."),
        ("03","Visible construction","Describe the dominant mass, counter-shape, important gap, viewpoint and reading direction. Choose quiet surfaces, bounded hatch areas and one accent also distinguished by shape."),
        ("04","Source and revision","Assign a stable ID and immutable revision. Preserve the exact prompt or editable source, every input's role and rights evidence, exposed settings, returned original bytes and hashes. Keep unexposed settings unknown."),
        ("05","Size and theme","Specify a 3:2 starting canvas, 12-18% substantial-form margin target and 320px minimum. Review paper, charcoal and monochrome; verify the alpha channel as well as the composite."),
        ("06","Caption and acceptance","Keep all text, equations, units and citations outside the image. Supply literal alt text and a caption naming the meaning and limits. Record retain, refine or reject with an observation; preserve the user's choice separately."),
    ]
    y=632
    for number,heading,body in groups:
        label(c,number,M,y,20,RED)
        label(c,heading.upper(),M+36,y+2,12)
        paragraph(c,body,M+36,y-12,CW-36,10.3,14.5,max_height=58)
        y-=86
    paragraph(c,"For a factual diagram, use the source-backed drawing or data workflow that preserves exact relationships. Image generation must not invent measurement, topology, scientific evidence or a vendor mark.",M,105,CW,9.7,14,max_height=43)
    c.showPage()


def provenance(c,assets,manifest):
    page(c,8,"Provenance and review boundary")
    title(c,"Keep the evidence with the art",744,29)
    paragraph(c,"Three concepts, six original generation results: three initial r1 images and three corrected r2 candidates. Every original is retained unchanged. Palette variants and review composites do not increase the concept count.",M,695,CW,11.1,16,max_height=50)
    label(c,"FRAMING CORRECTION / MEASURED ALPHA BOUNDS",M,626,11,RED)
    rows=[[a["display_id"],f'{a["r1"]["minimum_substantial_margin_percent"]:.3f}%',f'{a["r2"]["minimum_substantial_margin_percent"]:.3f}%',str(a["r2"]["outer_border_max_alpha"])+" / 255"] for a in assets]
    table(c,["STUDY","r1 MIN MARGIN","r2 MIN MARGIN","r2 BORDER MAX"],rows,M,609,CW,[67,133,133,CW-333],31)
    paragraph(c,"The 12% review floor measures substantial content at alpha greater than 16/255. All r2 candidates pass that floor, but do not meet a strict zero-alpha cutout standard. Faint residue remains; EL02 reaches border alpha 1/255. The stricter 16% correction target was not achieved on every side.",M,470,CW,10.1,14.6,max_height=62)
    label(c,"AUTHORSHIP AND INPUTS",M,391,11,RED)
    paragraph(c,"Initial raster calls used text only. Each correction used only its own r1 original. No existing category artwork, third-party stock or vendor logo was supplied. Model version, seed, quality and caller-controlled size were not exposed. The vector counterparts are independently authored, deterministic paths, not traces.",M,376,CW,10.1,14.6,max_height=63)
    label(c,"RIGHTS, FIGURE MEANING AND STATUS",M,294,11,RED)
    paragraph(c,"No new public art licence is assigned. Generated provenance and hashes do not establish exclusive rights. These invented relationships assert no measurement, anatomy, topology, temporal causation or physical foldability. Ben has not selected these candidates. Host integration, repository gates, browser acceptance and release belong to their separate delivery records.",M,278,CW,10.1,14.6,max_height=63)
    label(c,"SOURCE RECORD",M,196,11,RED)
    paragraph(c,"Initial artwork audit baseline:",M,181,CW,9.2,12,max_height=15)
    label(c,manifest["baseline_commit"],M,156,9.7)
    label(c,"Branch: "+manifest["branch"],M,139,9.7)
    paragraph(c,"Exact prompts, original hashes, measured alpha, rationale and limits: manifest.json, PROVENANCE.md, ART-DIRECTION.md and vector-source/. The PDF uses embedded Source Serif 4 Regular and Barlow Condensed SemiBold from the repository under their retained OFL notices.",M,125,CW,8.9,12.5,max_height=42)
    for x,text,url in [(M,"Canonical design Space","https://chatgpt.com/space/page_6adc74403d50819193fb9b2d0681ea64"),(M+185,"Workstream index","https://chatgpt.com/space/page_ba64e3a87b908191b185bdfc76e46171")]:
        label(c,text,x,61,9.4,RED)
        c.linkURL(url,(x,59,x+150,73),relative=0,thickness=0)
    c.showPage()


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--work-dir",type=Path,required=True,help="Scratch directory for converted font and samples")
    args=parser.parse_args()
    args.work_dir.mkdir(parents=True,exist_ok=True)
    load_fonts(args.work_dir)
    manifest=json.loads((DOC/"manifest.json").read_text())
    assets=manifest["assets"]
    assert len(assets)==3 and all(a["revision"]=="r2" for a in assets)
    before={a["r2"]["path"]:hashlib.sha256((ROOT/a["r2"]["path"]).read_bytes()).hexdigest() for a in assets}
    output=DOC/"editorial-illustration-language.pdf"
    # Keep compressed image streams binary so Git treats the PDF as an artifact.
    rl_config.useA85=0
    c=Canvas(str(output),pagesize=A4,pageCompression=1,invariant=1,pdfVersion=(1,4),
             initialFontName=SERIF,lang="en-AU")
    # Use the requested review date, with no invented time. Keep output reproducible.
    c.setDateFormatter(lambda *_: "D:20261117")
    c.setTitle("Editorial illustration language")
    c.setAuthor("Editorial illustration workstream")
    c.setCreator("Editorial illustration review packet")
    c.setSubject("Three original relationship studies and reusable art direction for the research folio")
    cover(c,assets)
    specimen(c,2,assets[0],"The interval is the subject. A broad quiet mass and a smaller counter-piece expose the interface between them.","The unequal pieces make the gap readable. A raised red shim localizes attention without turning the image into a diagram of tolerances. This is an exploded relationship, not a before-and-after comparison.")
    specimen(c,3,assets[1],"A displaced section makes an interior visible. The curved outer wall and two ribs distinguish envelope, cut face and cavity.","The shell's tall silhouette changes the rhythm of the family. Keep its rear surfaces solid and its actual open spaces transparent. A caption must prevent this invented form being read as anatomy or a material specimen.")
    specimen(c,4,assets[2],"One connected form carries the eye. A quiet tail rises through broad bends into an arch, with air beneath the structure.","The red edge begins the reading gesture. Continuity and changes of height carry the idea; hatching describes undersides. The spatial sequence does not establish time, cause, topology or exact folding.")
    vectors(c,assets)
    scale_and_grammar(c,assets,args.work_dir)
    brief(c)
    provenance(c,assets,manifest)
    c.save()
    assert before=={p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in before},"Original raster bytes changed"
    print(json.dumps({"output":output.name,"pages":8,"bytes":output.stat().st_size,"sha256":hashlib.sha256(output.read_bytes()).hexdigest(),"originals_unchanged":True}))


if __name__=="__main__":
    main()
