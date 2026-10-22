"""Provision the ignored HumAID model artifacts during a deployment build.

The trained weights are intentionally not stored in Git because the safetensors
file is larger than GitHub's file-size limit. Set MODEL_ARTIFACT_URL to a
trusted HTTPS archive containing the model directory before running this script.
"""

from __future__ import annotations

import os
import shutil
import tarfile
import tempfile
import urllib.request
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "data" / "nlp" / "models" / "resqnet_distilbert_full"


def extract_tar_safely(archive: Path, destination: Path) -> None:
    with tarfile.open(archive) as bundle:
        members = bundle.getmembers()
        destination_root = destination.resolve()
        for member in members:
            target = (destination / member.name).resolve()
            if target != destination_root and destination_root not in target.parents:
                raise SystemExit("Model archive contains an unsafe path.")
        bundle.extractall(destination)


def main() -> None:
    if (TARGET / "model.safetensors").is_file():
        print(f"NLP model already present at {TARGET}")
        return

    artifact_url = os.environ.get("MODEL_ARTIFACT_URL", "").strip()
    if not artifact_url:
        raise SystemExit(
            "MODEL_ARTIFACT_URL is required because model.safetensors is not tracked in Git. "
            "Set it to a trusted HTTPS zip or tar.gz archive of resqnet_distilbert_full."
        )
    if not artifact_url.lower().startswith("https://"):
        raise SystemExit("MODEL_ARTIFACT_URL must use HTTPS.")

    with tempfile.TemporaryDirectory() as temp_dir:
        archive = Path(temp_dir) / "model.archive"
        urllib.request.urlretrieve(artifact_url, archive)
        extract_dir = Path(temp_dir) / "extracted"
        extract_dir.mkdir()
        if zipfile.is_zipfile(archive):
            with zipfile.ZipFile(archive) as bundle:
                bundle.extractall(extract_dir)
        elif tarfile.is_tarfile(archive):
            extract_tar_safely(archive, extract_dir)
        else:
            raise SystemExit("MODEL_ARTIFACT_URL must point to a zip or tar.gz archive.")

        candidates = [p for p in extract_dir.rglob("model.safetensors") if p.is_file()]
        if len(candidates) != 1:
            raise SystemExit("Model archive must contain exactly one model.safetensors file.")
        source = candidates[0].parent
        required = ("config.json", "label_mapping.json", "tokenizer.json", "model.safetensors")
        missing = [name for name in required if not (source / name).is_file()]
        if missing:
            raise SystemExit(f"Model archive is missing required files: {', '.join(missing)}")
        TARGET.parent.mkdir(parents=True, exist_ok=True)
        if TARGET.exists():
            shutil.rmtree(TARGET)
        shutil.copytree(source, TARGET)
    print(f"Provisioned NLP model at {TARGET}")


if __name__ == "__main__":
    main()
