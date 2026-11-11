#!/usr/bin/env python3
"""Offline argument contract checks; no article, image, network or model calls."""
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import unittest

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('blog_seed', HERE / 'parse_seed.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class BlogArguments(unittest.TestCase):
    def test_three_example_seeds(self):
        cases = json.loads((HERE.parent / 'evals/seed-cases.json').read_text())
        for case in cases:
            with self.subTest(case=case['name']):
                result = module.parse(case['arguments'])
                self.assertEqual(result['kind'], case['expected_kind'])
                self.assertEqual(result['paths']['source'], case['expected_source'])
                self.assertEqual(result['frontmatter'], {'draft': True, 'release': False})
                self.assertTrue(result['dry_run'])
                self.assertFalse(result['publish'])
                self.assertFalse(result['execute_seed_as_code'])
                self.assertNotIn('public/', result['paths']['review'])

    def test_default_is_draft_and_auto_route(self):
        result = module.parse("Why I'm checking the result")
        self.assertEqual(result['seed'], "Why I'm checking the result")
        self.assertEqual(result['kind'], 'auto')
        self.assertFalse(result['publish'])
        self.assertIn('<slug>', result['paths']['source'])

    def test_metacharacters_remain_literal(self):
        seed = 'Cost of $work; $(touch /tmp/should-not-exist) `whoami` & <input>'
        self.assertEqual(module.parse(json.dumps(seed))['seed'], seed)

    def test_flags_inside_seed_are_text(self):
        self.assertEqual(module.parse('Explain --dry-run in a CLI')['seed'], 'Explain --dry-run in a CLI')
        self.assertFalse(module.parse('Explain --dry-run in a CLI')['dry_run'])
        self.assertEqual(module.parse('-- --publish is a flag')['seed'], '--publish is a flag')

    def test_quote_and_unicode_handling(self):
        self.assertEqual(module.parse('"A \\"quoted\\" café"')['seed'], 'A "quoted" café')
        self.assertEqual(module.parse("'Spaces and tabs'")['seed'], 'Spaces and tabs')

    def test_invalid_inputs(self):
        bad = ['', '--dry-run', '--publish seed', '--slug ../../escape seed',
               '--slug UpperCase seed', '--kind essay seed', '--images generate seed',
               '--dry-run --dry-run seed', '"unclosed', '--slug',
               '--kind --dry-run seed', '""', '\x00']
        for args in bad:
            with self.subTest(args=args), self.assertRaises(module.ArgumentError):
                module.parse(args)

    def test_json_stdin_contract_and_exit_status(self):
        result = subprocess.run([sys.executable, str(HERE / 'parse_seed.py')],
                                input=json.dumps({'arguments': '--dry-run --images none A seed'}),
                                capture_output=True, text=True, check=False)
        self.assertEqual(result.returncode, 0)
        self.assertEqual(json.loads(result.stdout)['images'], 'none')
        for payload in ['not json', '{}', '{"arguments": 12}', '{"arguments": "seed", "execute": true}']:
            result = subprocess.run([sys.executable, str(HERE / 'parse_seed.py')], input=payload,
                                    capture_output=True, text=True, check=False)
            self.assertEqual(result.returncode, 2)
            self.assertIn('error', json.loads(result.stdout))


if __name__ == '__main__':
    unittest.main()
