"""
Unit tests for RESQNET AI data loading and handling of malformed records.
"""

import json
import pytest
from pathlib import Path
from data.nlp.src.data_loader import load_jsonl_records


def test_load_jsonl_records_valid(tmp_path: Path):
    jsonl_file = tmp_path / "sample.jsonl"
    records = [
        {"tweet_text": "Need drinking water at shelter 4", "class_label": "requests_or_urgent_needs"},
        {"tweet_text": "Road blocked by fallen tree", "class_label": "infrastructure_and_utility_damage"},
    ]
    with open(jsonl_file, "w", encoding="utf-8") as f:
        for r in records:
            f.write(json.dumps(r) + "\n")

    texts, labels = load_jsonl_records(jsonl_file)
    assert len(texts) == 2
    assert len(labels) == 2
    assert "drinking water" in texts[0]
    assert labels[0] == "requests_or_urgent_needs"


def test_load_jsonl_records_malformed_and_missing(tmp_path: Path):
    jsonl_file = tmp_path / "malformed.jsonl"
    with open(jsonl_file, "w", encoding="utf-8") as f:
        f.write("NOT A VALID JSON STRING\n")
        f.write('{"tweet_text": null, "class_label": "injured_or_dead_people"}\n')
        f.write('{"tweet_text": "Valid report", "class_label": null}\n')
        f.write('{"tweet_text": "   ", "class_label": "sympathy_and_support"}\n')
        f.write('{"tweet_text": "Bridge collapsed", "class_label": "infrastructure_and_utility_damage"}\n')
        f.write("\n\n")

    texts, labels = load_jsonl_records(jsonl_file)
    # Only the last valid record should be accepted
    assert len(texts) == 1
    assert len(labels) == 1
    assert texts[0] == "Bridge collapsed"
    assert labels[0] == "infrastructure_and_utility_damage"


def test_load_jsonl_limit(tmp_path: Path):
    jsonl_file = tmp_path / "multi.jsonl"
    with open(jsonl_file, "w", encoding="utf-8") as f:
        for i in range(10):
            f.write(json.dumps({"tweet_text": f"Msg {i}", "class_label": "caution"}) + "\n")

    texts, labels = load_jsonl_records(jsonl_file, limit=4)
    assert len(texts) == 4
    assert len(labels) == 4
