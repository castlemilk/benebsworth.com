#!/usr/bin/env python3
"""Static specimen boards from the actual SVG raster exports. Not UI screenshots.

Pillow is used only to typeset and compose review boards; masters remain SVG.
Existing repository fonts are read, never redistributed or changed.
"""
import json
import os
import tempfile
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
ART = ROOT / 'public/artwork/marks-ornaments-v1'
DEST = HERE / 'specimens'
DATA = json.loads((HERE / 'manifest.json').read_text())
FONTS = ROOT / 'public/fonts/editorial'
CACHE = Path(tempfile.gettempdir()) / 'beneb-marks-specimen-fonts-v1'
CACHE.mkdir(exist_ok=True)
serif = TTFont(FONTS / 'source-serif-4.woff')
if 'fvar' in serif:
    serif = instantiateVariableFont(serif, {'wght': 400}, inplace=False)
serif.flavor = None
serif.save(CACHE / 'serif.ttf')


def font(size, family='serif'):
    if family == 'label':
        return ImageFont.truetype(str(FONTS / 'barlow-condensed-semibold.ttf'), size)
    if family == 'hand':
        return ImageFont.truetype(str(FONTS / 'caveat.ttf'), size)
    return ImageFont.truetype(str(CACHE / 'serif.ttf'), size)


def text(draw, xy, value, size, fill, family='serif'):
    draw.text(xy, value, font=font(size,family), fill=fill)


def wrap(draw, x, y, value, width, size, fill, line_height=None, family='serif'):
    f=font(size,family); line_height=line_height or int(size*1.45)
    line=''; lines=[]
    for word in value.split():
        trial=(line+' '+word).strip()
        if draw.textlength(trial,font=f)>width and line:
            lines.append(line); line=word
        else: line=trial
    if line: lines.append(line)
    for i,s in enumerate(lines): text(draw,(x,y+i*line_height),s,size,fill,family)
    return y+len(lines)*line_height


def drawing(art, palette, size=24, scale=1):
    p=ART / 'png' / palette / f"{art['id']}-r1-{size}@{min(scale,2)}x.png"
    if scale>2:
        p=DEST/'details'/f"{art['id']}-{palette}.png"
        im=Image.open(p).convert('RGBA')
        return im.resize((size*(4 if art['family']=='Section dividers' else 1)*scale,size*scale), Image.Resampling.LANCZOS)
    return Image.open(p).convert('RGBA')


def paste(im, art, palette, xy, size=24, scale=1):
    glyph=drawing(art,palette,size,scale)
    im.alpha_composite(glyph,(int(xy[0]),int(xy[1])))


def save(im,name):
    DEST.mkdir(exist_ok=True)
    im.convert('RGB').save(DEST/name, optimize=True)


def catalogue(palette):
    colors=DATA['palettes'][palette]
    bg=colors['matte']; ink=colors['ink']; accent=colors['accent']
    muted='#56616b' if palette=='light' else '#9a9d98'
    rule='#cdc8bb' if palette=='light' else '#353a36'
    im=Image.new('RGBA',(1560,1220),bg); d=ImageDraw.Draw(im)
    text(d,(64,38),'BEN EBSWORTH / RESEARCH FOLIO',19,muted,'label')
    text(d,(64,76),'Marks, ornaments & annotation',53,ink)
    text(d,(66,151),'Twelve quiet gestures. Open intervals. Text carries the meaning.',25,ink)
    text(d,(66,191),f'ORIGINAL VECTOR STUDY • R1 • {palette.upper()} SPECIMEN',18,accent,'label')
    d.line((64,235,1496,235),fill=rule,width=1)
    descriptions=[
        'A pause between passages.', 'A quiet ending, never a badge.',
        'One passage, lightly marked.', 'A small turn in the margin.',
        'Beside an explicit note label.', 'Related notes need matching text.',
        'Attach a precise source locator.', 'Keep attribution with the excerpt.',
        'Pair with “Interpretation”.', 'Name the missing or unchecked context.',
        'A note endpoint without an arrow.', 'Describe the referenced span in text.'
    ]
    for i,a in enumerate(DATA['artworks']):
        row,col=divmod(i,3); x=64+col*490; y=262+row*205
        text(d,(x,y),f'{i+1:02d}  /  {a["family"].upper()}',16,muted,'label')
        # The catalogue is deliberately enlarged; native-size evidence is separate.
        wide=a['family']=='Section dividers'
        paste(im,a,palette,(x+12,y+45),24,1 if wide else 3)
        text(d,(x+146,y+45),a['title'],26,ink)
        wrap(d,x+146,y+85,descriptions[i],290,18,muted,25)
        if row<3: d.line((x,y+178,x+448,y+178),fill=rule,width=1)
    d.line((64,1104,1496,1104),fill=rule,width=1)
    text(d,(64,1125),'16 / 20 / 24 PX OPTICAL MASTERS',18,accent,'label')
    text(d,(470,1125),'Transparent SVG + PNG. This board has a presentation matte.',20,ink)
    text(d,(64,1161),'Drawing specimens only • no application integration or browser acceptance claimed',18,muted,'label')
    save(im,f'01-vocabulary-{palette}.png')


def optical(scale):
    w=1100; top=178; rowh=65 if scale==1 else 86
    im=Image.new('RGBA',(w,top+12*rowh+95),'#f4f1e9');d=ImageDraw.Draw(im)
    text(d,(34,25),'Optical sizes',37,'#202c34')
    text(d,(34,77),'16, 20 and 24 are individually drawn. Palette changes preserve geometry.',20,'#202c34')
    text(d,(34,111),'Native pixels at 100%.' if scale==1 else '2× density raster inspection; displayed here at twice the CSS dimensions.',17,'#56616b')
    cols=[('light',290,'#f4f1e9','#202c34'),('dark',554,'#111312','#ecebe6'),('mono',818,'#ffffff','#000000')]
    for p,x,bg,ink in cols:
        d.rectangle((x-8,top-49,x+251,top+12*rowh+5),fill=bg)
        text(d,(x+4,top-48),p.upper(),16,ink,'label')
        for j,size in enumerate([16,20,24]):
            text(d,(x+31+j*84,top-25),str(size),15,ink,'label')
    for i,a in enumerate(DATA['artworks']):
        y=top+i*rowh
        text(d,(34,y+12),f'{i+1:02d}',19,'#b32624','label')
        text(d,(70,y+12),a['title'],19,'#202c34')
        for p,x,bg,ink in cols:
            for j,size in enumerate([16,20,24]):
                # Wide dividers are staggered vertically in density-inspection sheets.
                wide=a['family']=='Section dividers'
                s=scale
                if wide and scale==2:
                    # Full 2x divider rows are in a separate visual detail, not squeezed.
                    s=1
                glyph=drawing(a,p,size,s)
                cx=x+39+j*84
                im.alpha_composite(glyph,(int(cx-glyph.width/2),y+int((rowh-glyph.height)/2)))
    text(d,(34,top+12*rowh+24),'Native 1×/2× PNGs are supplied individually. Wide dividers remain 1× on this compact sheet.' if scale==2 else 'View at 100% for size judgments. Enlarged catalogue and detail files are separate.',17,'#56616b')
    text(d,(34,top+12*rowh+51),'Static Sharp renders; browser, screen-reader, forced-colour and print behaviour remain untested.',16,'#56616b')
    save(im,'02-optical-native.png' if scale==1 else '03-optical-density.png')


def monochrome():
    im=Image.new('RGBA',(1340,950),'white');d=ImageDraw.Draw(im)
    d.rectangle((670,0,1340,950),fill='#111312')
    for x,fg in [(40,'#000000'),(710,'#ffffff')]:
        text(d,(x,30),'One colour, the same drawing',33,fg)
        text(d,(x,84),'COLOUR DOES NOT ESTABLISH A SOURCE OR A STATE',16,fg,'label')
    for i,a in enumerate(DATA['artworks']):
        y=143+i*59
        g=drawing(a,'mono',24,1)
        im.alpha_composite(g,(43,y+6))
        white=Image.new('RGBA',g.size,'#ffffff');white.putalpha(g.getchannel('A'))
        im.alpha_composite(white,(713,y+6))
        for x,fg in [(166,'#000000'),(836,'#ffffff')]:
            text(d,(x,y+3),f'{i+1:02d}  {a["title"]}',22,fg)
    text(d,(40,883),'24px optical master; black and inverse-white specimen.',17,'#000000')
    text(d,(710,883),'Inverse specimen recolours the exact mono alpha mask.',17,'#ffffff')
    save(im,'04-monochrome.png')


def usage():
    im=Image.new('RGBA',(1440,1130),'#f4f1e9');d=ImageDraw.Draw(im)
    ink='#202c34';muted='#56616b';red='#b32624';rule='#cdc8bb'
    text(d,(64,36),'Place the mark beside the thought',46,ink)
    text(d,(65,104),'Adjacency studies only. Existing components keep layout, semantics and interaction ownership.',21,muted)
    d.line((64,158,1376,158),fill=rule,width=1)
    text(d,(64,191),'01 / MARGINAL NOTE',18,red,'label')
    paste(im,DATA['artworks'][2],'light',(66,237),24,1)
    text(d,(106,226),'Keep the limits with the claim.',31,ink)
    text(d,(106,276),'Note 2 — this is an editorial placement specimen.',22,muted)
    text(d,(920,229),'one thought, one gesture',30,red,'hand')
    text(d,(920,277),'The visible note identifies its target.',19,muted)
    d.line((64,336,1376,336),fill=rule,width=1)
    text(d,(64,366),'02 / SOURCE CONTEXT',18,muted,'label')
    paste(im,DATA['artworks'][6],'light',(65,418),24,1)
    text(d,(105,408),'Source recorded',30,ink)
    text(d,(105,456),'Author · Work · page or section · revision / access context',22,ink)
    text(d,(105,494),'A recorded locator is not a verification badge.',21,muted)
    paste(im,DATA['artworks'][9],'light',(921,418),24,1)
    text(d,(960,409),'Locator missing',27,ink)
    wrap(d,960,457,'Keep the specific missing detail visible. Do not encode the reason in colour.',383,20,muted,28)
    d.line((64,560,1376,560),fill=rule,width=1)
    text(d,(64,593),'03 / EVIDENCE BASIS',18,muted,'label')
    paste(im,DATA['artworks'][8],'light',(65,647),24,1)
    text(d,(105,634),'Interpretation',31,ink)
    wrap(d,105,687,'The author connects the observations. State the reasoning and its limits in selectable text.',658,23,ink,32)
    wrap(d,919,637,'Keep the existing bases:',398,20,muted,28)
    wrap(d,919,678,'Measured result · Simulation · Illustration · Interpretation',398,22,ink,32)
    d.line((64,796,1376,796),fill=rule,width=1)
    text(d,(64,827),'04 / ANNOTATION ENDPOINT',18,red,'label')
    # A single local shape diagram demonstrates endpoint direction. No dynamic connector implementation.
    d.rounded_rectangle((960,889,1300,989),radius=11,outline=ink,width=2)
    text(d,(1002,919),'Referenced region',25,ink)
    paste(im,DATA['artworks'][10],'light',(912,925),24,1)
    d.line((210,937,917,937),fill=red,width=2)
    text(d,(69,911),'Note 3',32,red,'hand')
    text(d,(69,1011),'A visible label names the region. This line is an annotation, not a data edge.',21,ink)
    text(d,(64,1066),'Do not add a second runtime connector system. Existing measured targets and note flow remain authoritative.',18,muted,'label')
    save(im,'05-adjacency-studies.png')


if __name__=='__main__':
    catalogue('light'); catalogue('dark'); optical(1); optical(2); monochrome(); usage()
    print(json.dumps({'specimen_boards':6,'font_source':'existing repository editorial fonts','browser_evidence':False}))
