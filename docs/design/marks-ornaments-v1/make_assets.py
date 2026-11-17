#!/usr/bin/env python3
"""Deterministic asset authoring for the isolated marks packet; no app imports.

Run from the repository root:
    python3 docs/design/marks-ornaments-v1/make_assets.py
"""
import hashlib
import json
from pathlib import Path
from xml.sax.saxutils import escape

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
OUT = ROOT / 'public/artwork/marks-ornaments-v1'
PALETTES = {
    'light': {'ink': '#202c34', 'accent': '#b32624', 'matte': '#f4f1e9'},
    'dark': {'ink': '#ecebe6', 'accent': '#ffaaa5', 'matte': '#111312'},
    'mono': {'ink': '#000000', 'accent': '#000000', 'matte': '#ffffff'},
}


def svg_for(art, size, palette, stroke):
    width = size * (4 if art['wide'] else 1)
    key = f"{art['id']}-r1-{size}-{palette}"
    paint = PALETTES[palette][art['paint']]
    metadata = {
        'asset_id': art['id'], 'revision': 1, 'optical_size': size,
        'palette': palette, 'provenance_class': 'original-authored-vector',
        'semantic_role': art['role'], 'geometry_source': 'geometry.json',
        'not_a_logo_or_scientific_figure': True,
    }
    lines = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{size}" viewBox="0 0 {width} {size}" role="img" aria-labelledby="{key}-title" aria-describedby="{key}-desc">',
        f'  <title id="{key}-title">{escape(art["title"])}; {size}px optical master</title>',
        f'  <desc id="{key}-desc">{escape(art["brief"])} The surrounding canvas is transparent. Adapt accessibility to the host context.</desc>',
        f'  <metadata>{escape(json.dumps(metadata, sort_keys=True, separators=(",", ":")))}</metadata>',
        f'  <g id="{key}-ink" fill="none" stroke="{paint}" stroke-width="{stroke}" stroke-linecap="round" stroke-linejoin="round">',
    ]
    for path in art['paths'][str(size)]:
        attrs = f' fill="{paint}" stroke="none"' if path.get('fill') else ''
        lines.append(f'    <path id="{key}-{path["name"]}" d="{path["d"]}"{attrs}/>')
    lines += ['  </g>', '</svg>', '']
    return '\n'.join(lines)


def main():
    data = json.loads((HERE / 'geometry.json').read_text())
    manifest = {
        'schema_version': 1, 'batch_id': data['batch_id'], 'revision': 1,
        'created_date': '2026-11-17', 'date_context': 'Australia/Melbourne',
        'repo': 'castlemilk/benebsworth.com',
        'baseline': 'e1c0f0a4c9ac4d7d189542e7c71abf274cc0977e',
        'branch': 'art/blog-marks-ornaments-v1',
        'concept_count': len(data['artworks']),
        'optical_sizes': [16, 20, 24], 'palettes': PALETTES,
        'provenance': {
            'class': 'original-authored-vector',
            'method': 'AI-assisted original path authoring in editable SVG. No image-generation call, tracing, embedded raster, data, simulation or borrowed logo geometry.',
            'geometry_inputs': [],
            'style_references': 'SOURCE-AUDIT.md records observed blog and brand context; none was used as a tracing input.',
            'generator': 'docs/design/marks-ornaments-v1/make_assets.py',
            'editing_source': 'docs/design/marks-ornaments-v1/geometry.json',
            'seed': None, 'fonts_in_masters': False,
            'rights': 'No third-party geometry incorporated. No new public license or exclusivity claim is added; repository terms remain unchanged.',
        },
        'review': {'assistant_visual_review': 'see REVIEW.md', 'user_selection': None,
                   'runtime_integration': False, 'release_approved': False},
        'artworks': [],
    }
    for art in data['artworks']:
        item = {k: art[k] for k in ['id','title','family','role','paint','brief','optical_note']}
        item['revision'] = 1
        item['minimum_display_height_px'] = 16
        item['minimum_display_width_px'] = 64 if art['wide'] else 16
        item['files'] = []
        for size in (16, 20, 24):
            for palette in PALETTES:
                relative = Path('svg') / palette / f"{art['id']}-r1-{size}.svg"
                dest = OUT / relative
                dest.parent.mkdir(parents=True, exist_ok=True)
                source = svg_for(art, size, palette, data['sizes'][str(size)]['stroke'])
                dest.write_text(source, encoding='utf-8')
                item['files'].append({'palette': palette, 'optical_size': size,
                    'width': size * (4 if art['wide'] else 1), 'height': size,
                    'path': dest.relative_to(ROOT).as_posix(),
                    'sha256': hashlib.sha256(dest.read_bytes()).hexdigest()})
        manifest['artworks'].append(item)
    (HERE / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print(json.dumps({'artworks': len(manifest['artworks']), 'svg_files': sum(len(a['files']) for a in manifest['artworks'])}))


if __name__ == '__main__':
    main()
