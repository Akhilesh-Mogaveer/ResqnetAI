"""
Unit tests for RESQNET AI text preprocessing and label mapping.
"""

import json
import pytest
from pathlib import Path
from data.nlp.src.preprocessing import clean_text, LabelMapper


def test_clean_text_basic():
    raw = "Massive earthquake in City! &amp; multiple casualties reported. https://t.co/xyz123"
    cleaned = clean_text(raw)
    assert "&" in cleaned
    assert "&amp;" not in cleaned
    assert "https://" not in cleaned
    assert "Massive earthquake in City! & multiple casualties reported." in cleaned


def test_clean_text_empty_and_none():
    assert clean_text(None) == ""
    assert clean_text("") == ""
    assert clean_text("   \n\t  ") == ""


def test_clean_text_mentions_and_hashtags():
    raw = "RT @emergency_dispatch: Flash floods in #RegionB. Evacuate now!"
    cleaned = clean_text(raw, normalize_mentions=True, preserve_hashtags=True)
    assert "@user" in cleaned
    assert "#RegionB" in cleaned
    assert "Flash floods" in cleaned


def test_label_mapper_deterministic_ordering():
    labels = ["sympathy_and_support", "injured_or_dead_people", "caution_and_advice"]
    mapper = LabelMapper(labels=labels)

    assert len(mapper) == 3
    # Should be sorted alphabetically
    assert mapper.labels == [
        "caution_and_advice",
        "injured_or_dead_people",
        "sympathy_and_support",
    ]
    assert mapper.encode("caution_and_advice") == 0
    assert mapper.encode("injured_or_dead_people") == 1
    assert mapper.encode("sympathy_and_support") == 2
    assert mapper.decode(0) == "caution_and_advice"


def test_label_mapper_save_and_load(tmp_path: Path):
    labels = ["rescue_volunteering", "requests_urgent_needs"]
    mapper = LabelMapper(labels=labels)

    file_path = tmp_path / "label_mapping.json"
    mapper.save(file_path)

    loaded_mapper = LabelMapper.load(file_path)
    assert loaded_mapper.labels == mapper.labels
    assert loaded_mapper.label2id == mapper.label2id
    assert loaded_mapper.id2label == mapper.id2label


def test_label_mapper_invalid_keys():
    mapper = LabelMapper(labels=["injured_or_dead_people"])
    with pytest.raises(KeyError):
        mapper.encode("non_existent_category")
    with pytest.raises(KeyError):
        mapper.decode(999)
