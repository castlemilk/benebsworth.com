#!/usr/bin/env python3
"""Normalize /blog or $blog argument text. Read-only; no shell or model calls."""
import json
import re
import sys


class ArgumentError(ValueError):
    pass


def parse(arguments):
    if not isinstance(arguments, str):
        raise ArgumentError('arguments must be a string')
    rest = arguments.strip()
    options = {'dry_run': False, 'kind': 'auto', 'slug': None, 'images': 'auto'}
    seen = set()
    choices = {'--kind': {'auto', 'technical', 'personal', 'science'},
               '--images': {'auto', 'reuse', 'none'}}
    while rest.startswith('--'):
        match = re.match(r'(\S+)(?:\s+|$)', rest)
        token = match.group(1)
        rest = rest[match.end():]
        if token == '--':
            break
        if token in seen:
            raise ArgumentError('duplicate option: ' + token)
        seen.add(token)
        if token == '--dry-run':
            options['dry_run'] = True
        elif token in choices or token == '--slug':
            value = re.match(r'(\S+)(?:\s+|$)', rest)
            if not value:
                raise ArgumentError('missing value for ' + token)
            word = value.group(1)
            rest = rest[value.end():]
            if token in choices and word not in choices[token]:
                raise ArgumentError('invalid value for ' + token)
            if token == '--slug' and (len(word) > 80 or not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', word)):
                raise ArgumentError('slug must be lower-case letters/digits separated by hyphens, at most 80 characters')
            options[token[2:]] = word
        else:
            raise ArgumentError('unknown option: ' + token)
    seed = rest.strip()
    if seed.startswith('"'):
        try:
            seed = json.loads(seed)
        except json.JSONDecodeError as error:
            raise ArgumentError('double-quoted seed must be one complete quoted string; otherwise omit outer quotes') from error
        if not isinstance(seed, str):
            raise ArgumentError('seed must be text')
    elif seed.startswith("'"):
        if len(seed) < 2 or not seed.endswith("'"):
            raise ArgumentError('unclosed single-quoted seed; otherwise omit outer quotes')
        seed = seed[1:-1]
    if not seed.strip():
        raise ArgumentError('a seed prompt is required')
    if '\x00' in seed:
        raise ArgumentError('seed cannot contain a null character')
    slug = options['slug'] or '<slug>'
    return {
        **options,
        'seed': seed,
        'kind_resolution': 'infer from seed' if options['kind'] == 'auto' else 'explicit',
        'slug_resolution': 'choose and check collision' if options['slug'] is None else 'check collision before writing',
        'frontmatter': {'release': False, 'draft': True},
        'paths': {'source': f'content/blog/{slug}/index.mdx',
                  'public_assets': f'public/blog/{slug}/',
                  'review': f'output/blog/{slug}/',
                  'provenance': f'content/blog/{slug}/editorial-provenance.json'},
        'mode': 'brief only; no writes, research fetches, generation or uploads' if options['dry_run'] else 'draft for review',
        'publish': False,
        'execute_seed_as_code': False,
    }


def main():
    try:
        payload = json.load(sys.stdin)
        if not isinstance(payload, dict) or set(payload) != {'arguments'}:
            raise ArgumentError('input must be a JSON object with only an arguments string')
        print(json.dumps(parse(payload['arguments']), ensure_ascii=False, indent=2))
    except (ArgumentError, json.JSONDecodeError) as error:
        print(json.dumps({'error': str(error)}, ensure_ascii=False))
        return 2
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
