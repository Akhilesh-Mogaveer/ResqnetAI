"""
Unit tests for RESQNET AI inference engine, schema validation, and probability bounds.
"""

import pytest
from pathlib import Path
from data.nlp.src.inference import ResqnetClassifier, RESQNET_DISCLAIMER


def test_missing_model_directory():
    with pytest.raises(FileNotFoundError):
        ResqnetClassifier(model_dir="non_existent_path_xyz_123")


def test_empty_and_whitespace_input(tmp_path: Path):
    """
    Test empty input behavior without requiring a trained model weights file
    by mocking or testing the predict input validation logic.
    """
    # Create a dummy model directory with label mapping and mock attributes
    # Or test predict() directly if model is present, otherwise test fallback
    from data.nlp.src.preprocessing import LabelMapper
    label_map = LabelMapper(labels=["injured_or_dead_people", "caution_and_advice"])
    label_file = tmp_path / "label_mapping.json"
    label_map.save(label_file)

    # Instantiate classifier mock
    class DummyClassifier(ResqnetClassifier):
        def __init__(self):
            self.label_mapper = label_map
            self.max_length = 128

    dummy = DummyClassifier()

    # Empty inputs
    res_none = dummy.predict(None)
    assert res_none["status"] == "EMPTY_OR_INVALID_INPUT"
    assert res_none["predicted_category"] == "unclassified_empty_message"
    assert res_none["confidence"] == 0.0
    assert RESQNET_DISCLAIMER in res_none["disclaimer"]

    res_empty = dummy.predict("     ")
    assert res_empty["status"] == "EMPTY_OR_INVALID_INPUT"
    assert res_empty["confidence"] == 0.0

    # Batch with mixed empty
    batch_res = dummy.predict_batch(["", "   "], batch_size=2)
    assert len(batch_res) == 2
    assert batch_res[0]["status"] == "EMPTY_OR_INVALID_INPUT"
    assert batch_res[1]["status"] == "EMPTY_OR_INVALID_INPUT"
