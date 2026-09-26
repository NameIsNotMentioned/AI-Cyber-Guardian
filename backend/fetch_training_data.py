"""Download the Apache-2.0 labeled text subset used by model.py."""

import hashlib
import json
import shutil
from pathlib import Path
from urllib.request import Request, urlopen


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = PROJECT_ROOT / "dataset" / "external"
DATA_PATH = DATA_DIR / "phishing_texts.json"
TEMP_PATH = DATA_DIR / "phishing_texts.json.part"
DATA_URL = (
    "https://huggingface.co/datasets/ealvaradob/phishing-dataset/"
    "resolve/94efbff/texts.json"
)
EXPECTED_SHA256 = "2479fdb94abb59332cc747f7b823a1651921b9828240c5dad0ffdba66ab02581"


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def validate_dataset(path: Path) -> int:
    with path.open(encoding="utf-8") as file:
        samples = json.load(file)
    if not isinstance(samples, list) or not samples:
        raise ValueError("The downloaded corpus is empty or has an unexpected format.")
    valid = [
        sample for sample in samples
        if isinstance(sample, dict)
        and isinstance(sample.get("text"), str)
        and sample["text"].strip()
        and sample.get("label") in (0, 1)
    ]
    if not valid:
        raise ValueError("The downloaded corpus contains no usable labeled messages.")
    return len(valid)


def main() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if DATA_PATH.exists() and sha256_file(DATA_PATH) == EXPECTED_SHA256:
        print(f"Verified corpus already present: {DATA_PATH}")
    else:
        request = Request(DATA_URL, headers={"User-Agent": "AI-Cyber-Guardian/1.0"})
        print("Downloading the pinned Hugging Face phishing text corpus...")
        with urlopen(request, timeout=120) as response, TEMP_PATH.open("wb") as output:
            shutil.copyfileobj(response, output)
        actual_hash = sha256_file(TEMP_PATH)
        if actual_hash != EXPECTED_SHA256:
            TEMP_PATH.unlink(missing_ok=True)
            raise ValueError(f"Dataset checksum mismatch: {actual_hash}")
        validate_dataset(TEMP_PATH)
        TEMP_PATH.replace(DATA_PATH)

    count = validate_dataset(DATA_PATH)
    print(f"Verified {count:,} labeled external text samples at {DATA_PATH}")


if __name__ == "__main__":
    main()
