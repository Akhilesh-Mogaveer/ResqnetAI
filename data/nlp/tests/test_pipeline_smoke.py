"""
End-to-end integration and smoke test for RESQNET AI pipeline.
Verifies model inference with loaded saved weights and schema compliance.
"""

import pytest
from pathlib import Path
from data.nlp.src.inference import ResqnetClassifier, RESQNET_DISCLAIMER


def test_saved_model_inference():
    model_dir = Path("data/nlp/models/resqnet_distilbert")
    if not model_dir.exists() or not (model_dir / "model.safetensors").exists():
        pytest.skip("Trained model checkpoint not found; skipping saved model smoke test.")

    classifier = ResqnetClassifier(model_dir=model_dir)

    # 1. Single sample prediction
    sample_text = "There is flooding near the bridge and people need rescue."
    pred = classifier.predict(sample_text, return_all_probabilities=True)

    assert pred["status"] == "SUCCESS"
    assert pred["input_text"] == sample_text
    assert pred["predicted_category"] in classifier.label_mapper.labels
    assert 0.0 <= pred["confidence"] <= 1.0
    assert RESQNET_DISCLAIMER in pred["disclaimer"]
    assert len(pred["all_probabilities"]) == len(classifier.label_mapper)

    # Probabilities should sum to approximately 1.0
    prob_sum = sum(pred["all_probabilities"].values())
    assert abs(prob_sum - 1.0) < 0.05

    # 2. Batch prediction
    batch = [
        "Need clean drinking water urgently.",
        "Bridge collapsed on Highway 101.",
    ]
    batch_preds = classifier.predict_batch(batch, batch_size=2)
    assert len(batch_preds) == 2
    for p in batch_preds:
        assert p["status"] == "SUCCESS"
        assert p["predicted_category"] in classifier.label_mapper.labels
        assert 0.0 <= p["confidence"] <= 1.0
