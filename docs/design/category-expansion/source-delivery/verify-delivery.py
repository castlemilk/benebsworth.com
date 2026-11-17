"""Verify preserved delivery hashes and all 50 selected-source identities."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
HERE = Path(__file__).resolve().parent

def verify():
    count = 0
    for line in (HERE / 'FILE-SHA256SUMS').read_text().splitlines():
        expected, name = line.split('  ', 1)
        path = (ROOT / name).resolve()
        assert path.is_relative_to(ROOT), name
        assert hashlib.sha256(path.read_bytes()).hexdigest() == expected, name
        count += 1
    selected = json.loads((HERE / 'selected-originals.json').read_text())
    assert len(selected) == 50
    assert len({row['sha256'] for row in selected}) == 50
    for row in selected:
        assert row['paths'], row['label']
        for name in row['paths']:
            data = (ROOT / name).read_bytes()
            assert len(data) == row['byte_size'], name
            assert data.startswith(b'\x89PNG\r\n\x1a\n'), name
            assert hashlib.sha256(data).hexdigest() == row['sha256'], name
    print(f'PASS: {count} preserved file hashes; 50 distinct selected originals')

if __name__ == '__main__':
    verify()
