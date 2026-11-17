"""Validate exact recovered PNG bytes without third-party dependencies."""
import hashlib
import json
import pathlib
import struct
import zlib

ROOT = pathlib.Path(__file__).resolve().parent


def verify():
    manifest = json.loads((ROOT / "manifest.json").read_text())
    assets = manifest["assets"]
    assert len(assets) == 6
    expected = {item["file"] for item in assets}
    assert len(expected) == 6
    assert {str(p.relative_to(ROOT)) for p in (ROOT / "originals").iterdir()} == expected
    for item in assets:
        path = ROOT / item["file"]
        assert path.resolve().parent == (ROOT / "originals").resolve()
        data = path.read_bytes()
        assert len(data) == item["bytes"], path
        assert hashlib.sha256(data).hexdigest() == item["sha256"], path
        assert data[:8] == b"\x89PNG\r\n\x1a\n", path
        offset, chunks = 8, []
        while offset < len(data):
            length = struct.unpack_from(">I", data, offset)[0]
            kind = data[offset + 4:offset + 8]
            body = data[offset + 8:offset + 8 + length]
            crc = struct.unpack_from(">I", data, offset + 8 + length)[0]
            assert zlib.crc32(kind + body) & 0xffffffff == crc, path
            if kind == b"IHDR":
                width, height, depth, colour, compression, filtering, interlace = struct.unpack(">IIBBBBB", body)
                assert (width, height) == (item["width"], item["height"]), path
                assert depth == 8 and colour == 6 and compression == filtering == 0, path
            chunks.append(kind)
            offset += length + 12
            if kind == b"IEND":
                assert length == 0 and offset == len(data), path
                break
        assert chunks[0] == b"IHDR" and chunks[-1] == b"IEND" and b"IDAT" in chunks, path
        print(f"Verified {item['file']}: {len(data)} bytes")


if __name__ == "__main__":
    verify()
