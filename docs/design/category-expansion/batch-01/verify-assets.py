#!/usr/bin/env python3
"""Verify retained generated PNG bytes and the ten-concept selection."""

import hashlib
import json
from pathlib import Path

from PIL import Image


def main() -> None:
    docs = Path(__file__).resolve().parent
    root = docs.parents[3]
    manifest = json.loads((docs / "manifest.json").read_text())
    receipts = json.loads((docs / "generation-receipts.json").read_text())
    metrics = json.loads((docs / "review/alpha-metrics.json").read_text())
    requested = json.loads((docs / "prompts/requests.json").read_text())["jobs"]
    expected_keys = [job["key"] for job in requested]
    selected = manifest["assets"]
    originals = manifest["all_originals"]

    assert len(expected_keys) == len(set(expected_keys)) == 10
    assert [asset["key"] for asset in selected] == expected_keys
    assert len(selected) == manifest["selected_image_count"] == 10
    assert len(originals) == manifest["preserved_original_file_count"] == 11
    assert sum(asset["taxonomy_status"] == "existing" for asset in selected) == 4
    assert sum(asset["taxonomy_status"] == "proposed" for asset in selected) == 6
    assert manifest["remote_published"] is False

    uploaded_hashes = {item["sha256"] for item in receipts["uploads"]
                       if item["file_access_confirmed"] is True}
    source_by_name = {item["filename"]: item for item in receipts["sources"]}
    metrics_by_name = {item["filename"]: item for item in metrics["files"]}
    checked = []
    available_generation_sources = 0
    for item in originals:
        path = root / item["path"]
        assert path.parent == root / manifest["original_directory"]
        raw = path.read_bytes()
        digest = hashlib.sha256(raw).hexdigest()
        assert digest == item["sha256"] == metrics_by_name[path.name]["sha256"]
        assert digest in uploaded_hashes
        assert len(raw) == item["bytes"]
        assert raw.startswith(b"\x89PNG\r\n\x1a\n")
        with Image.open(path) as image:
            image.verify()
        with Image.open(path) as image:
            assert list(image.size) == item["dimensions"]
            assert image.mode == "RGBA"
            alpha = image.getchannel("A")
            assert alpha.getextrema() == (0, 255)
            assert alpha.histogram()[0] > 0
        source = Path(source_by_name[path.name]["source"])
        if source.exists():
            assert hashlib.sha256(source.read_bytes()).hexdigest() == digest
            available_generation_sources += 1
        checked.append(path.name)

    selected_names = {Path(asset["path"]).name for asset in selected}
    assert selected_names == set(metrics["selected_original_filenames"])
    assert "10-neuroscience-r2.png" in selected_names
    assert "10-neuroscience-r1.png" not in selected_names
    assert len({item["sha256"] for item in originals}) == 11
    actual = {path.name for path in (root / manifest["original_directory"]).glob("*.png")}
    assert actual == set(checked)
    assert all(job["request"]["transparent_background"] is True for job in requested)
    assert all("referenced_image_paths" not in job["request"] for job in requested)
    assert all("num_last_images_to_include" not in job["request"] for job in requested)

    print(json.dumps({
        "result": "passed",
        "distinct_concepts": len(selected),
        "selected_pngs": len(selected_names),
        "preserved_original_pngs": len(originals),
        "confirmed_upload_hash_matches": len(checked),
        "available_generation_source_hash_matches": available_generation_sources,
        "real_alpha_verified": len(checked),
        "existing_topics": 4,
        "proposed_studies": 6,
        "browser_checks": "not run",
        "remote_publication": "not attempted",
    }, indent=2))


if __name__ == "__main__":
    main()
