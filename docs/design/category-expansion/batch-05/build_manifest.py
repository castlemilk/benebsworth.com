#!/usr/bin/env python3
"""Build or verify the bounded Batch 05 provenance/checksum packet."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import re

DOC = Path(__file__).resolve().parent
ROOT = DOC.parents[3]
ASSET = ROOT / 'public/artwork/category-expansion-v1/batch-05'
OWNED = (DOC, ASSET)
BASE = '92cd2eeae1a289f727b6d7bcb2beb9ddbe44ab76'


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read(name: str):
    return json.loads((DOC / name).read_text())


def verify_inputs():
    requests = read('generation-requests.json')
    receipts = read('generation-receipts.json')
    alpha = read('manifest-alpha.json')
    uploads = read('page-image-references.json')
    assert len(requests) == len(alpha['entries']) == len(uploads) == 10
    assert len(receipts) == 13
    assert len({r['slug'] for r in requests}) == 10
    assert len(list(ASSET.glob('*.png'))) == 10
    selected = [r for r in receipts if r['status'] == 'selected']
    assert len(selected) == 10
    assert len({r['slug'] for r in selected}) == 10
    source_copies_checked = 0
    for r in receipts:
        p = ROOT / r['destination']
        assert p.is_file(), p
        source = Path(r['original_source_path'])
        if source.is_file():
            assert digest(p) == digest(source), f'Original bytes differ: {p}'
            source_copies_checked += 1
        assert (ROOT / r['generation_request_path']).is_file()
    for r in requests:
        assert read(f"prompts/{r['slug']}.json") == r['request']
        assert r['request']['transparent_background'] is True
        a = next(a for a in alpha['entries'] if a['slug'] == r['slug'])
        u = next(u for u in uploads if u['slug'] == r['slug'])
        assert a['width'] == a['height'] == 1254 and a['mode'] == 'RGBA'
        assert a['png_structure_valid'] and all(c['crc_valid'] for c in a['png_chunks'])
        assert a['alpha']['fully_transparent_pixels'] > 0
        assert digest(ROOT / a['path']) == a['sha256'] == u['sha256']
        assert u['file_access_confirmed'] is True
    assert len({a['sha256'] for a in alpha['entries']}) == 10
    gallery = (DOC / 'gallery.html').read_text()
    references = re.findall(r'(?:src|href)=["\']([^"\']+)["\']', gallery)
    local = [ref.split('#', 1)[0] for ref in references if not ref.startswith(('#', 'http:', 'https:', 'data:', 'mailto:'))]
    for ref in local:
        assert (DOC / ref).is_file(), ref
    assert '<script' not in gallery.lower()
    return requests, receipts, alpha, uploads, {
        'selected_original_count': 10,
        'retained_attempt_count': 3,
        'total_generated_output_count': 13,
        'source_copy_equality_checked_in_current_environment': source_copies_checked,
        'selected_page_upload_digests_match': 10,
        'valid_local_gallery_references': len(local),
        'gallery_image_instances': len(re.findall(r'<img\b', gallery)),
        'png_structure_and_crc_valid': 10,
        'browser_checks': 'unavailable; not performed',
        'application_build_and_ci': 'not run; isolated asset/docs handoff',
    }


def build():
    requests, receipts, alpha, uploads, checks = verify_inputs()
    images = []
    for a in alpha['entries']:
        r = next(r for r in requests if r['slug'] == a['slug'])
        o = next(o for o in receipts if o['slug'] == a['slug'] and o['status'] == 'selected')
        u = next(u for u in uploads if u['slug'] == a['slug'])
        images.append({
            'slug': a['slug'], 'label': a['label'], 'status': 'proposed-artwork-study',
            'concept': a['concept'], 'file': a['path'], 'sha256': a['sha256'],
            'bytes': a['bytes'], 'width': a['width'], 'height': a['height'], 'mode': a['mode'],
            'selected_attempt': o['attempt'],
            'exact_request_file': o['generation_request_path'],
            'exact_request_sha256': digest(ROOT / o['generation_request_path']),
            'page_reference': u['reference'], 'upload_sha256': u['sha256'],
            'alpha_fully_transparent_fraction': a['alpha']['fully_transparent_fraction'],
            'alpha_margins': a['alpha']['bboxes'], 'outermost_border': a['alpha']['outermost_border'],
            'original_output_bytes_preserved': True,
        })
    manifest = {
        'schema_version': 1, 'batch': '05', 'title': 'Physical worlds and invention',
        'target_count': 10, **checks,
        'repository': 'https://github.com/castlemilk/benebsworth.com',
        'base_revision': BASE, 'branch': 'art/blog-category-expansion-batch-05',
        'owned_paths': [str(p.relative_to(ROOT)) + '/' for p in OWNED],
        'space_page': 'https://chatgpt.com/space/page_4a95f7010100819192097f3954e10d28',
        'generation_tool': 'image_gen.imagegen',
        'generation_date': '2026-11-17',
        'unexposed_settings': ['model identifier/version', 'seed', 'quality', 'explicit size control', 'exact generation timestamps'],
        'review': {
            'evidence': 'File-derived composites; not browser screenshots',
            'themes': {'light': '#f5f1e8', 'dark': '#171717'},
            'reviewed_canvas_sizes_px': [16, 24, 48, 96, 192, 280, 768],
            'no_perceptible_halo_in_reviewed_composites': True,
            'strict_fully_clear_alpha_exterior_accepted': False,
            'minimum_substantial_foreground_margin_percent': min(next(b['minimum_clear_margin_percent'] for b in a['alpha']['bboxes'] if b['threshold_gte'] == 16) for a in alpha['entries']),
            'recommended_use': 'Labelled spot/header artwork; contain complete canvas; prefer 192–280px or larger',
            'production_symbol_replacement_accepted': False,
            'findings': 'docs/design/category-expansion/batch-05/review/OBSERVATIONS.md',
        },
        'publication': {'pushed': False, 'draft_pr_created': False, 'merged': False, 'deployed': False,
                        'blocker': 'Non-master push can trigger Vercel preview; current VERCEL_PREVIEW_CI_ENABLED is unreadable with available tools.'},
        'images': images,
        'all_preserved_outputs': [{**r, 'sha256': digest(ROOT / r['destination']), 'bytes': (ROOT / r['destination']).stat().st_size} for r in receipts],
    }
    (DOC / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    files = sorted(p for base in OWNED for p in base.rglob('*') if p.is_file() and p.name != 'SHA256SUMS' and '__pycache__' not in p.parts)
    (DOC / 'SHA256SUMS').write_text(''.join(f'{digest(p)}  {p.relative_to(ROOT)}\n' for p in files))
    print(json.dumps({'manifest': str((DOC / 'manifest.json').relative_to(ROOT)), 'checksummed_files': len(files), **checks}, indent=2))


def check():
    _, _, _, _, checks = verify_inputs()
    count = 0
    for line in (DOC / 'SHA256SUMS').read_text().splitlines():
        expected, name = line.split('  ', 1)
        assert digest(ROOT / name) == expected, name
        count += 1
    for image in read('manifest.json')['images']:
        assert digest(ROOT / image['file']) == image['sha256']
    print(json.dumps({'result': 'passed', 'checksummed_files': count, **checks}, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    check() if args.check else build()
