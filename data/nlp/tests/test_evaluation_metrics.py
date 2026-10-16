"""
Unit tests for RESQNET AI evaluation metrics, confusion matrix, and reporting.
"""

import numpy as np
import pytest
from pathlib import Path
from data.nlp.src.evaluate import (
    compute_comprehensive_metrics,
    plot_confusion_matrix,
    plot_per_class_f1,
)


def test_compute_comprehensive_metrics():
    labels = ["caution_and_advice", "injured_or_dead_people", "requests_or_urgent_needs"]
    y_true = [0, 1, 2, 0, 1, 2]
    y_pred = [0, 1, 1, 0, 1, 2]  # One mistake: sample 2 (true 2 predicted 1)

    metrics = compute_comprehensive_metrics(y_true, y_pred, y_prob=None, labels=labels)

    assert "accuracy" in metrics
    assert "macro_f1" in metrics
    assert "weighted_f1" in metrics
    assert "per_class" in metrics
    assert "confusion_matrix" in metrics

    # Accuracy: 5/6 = ~0.8333
    assert abs(metrics["accuracy"] - (5 / 6)) < 1e-4

    # Per class checks
    per_class = metrics["per_class"]
    assert "caution_and_advice" in per_class
    assert per_class["caution_and_advice"]["precision"] == 1.0
    assert per_class["caution_and_advice"]["recall"] == 1.0
    assert per_class["caution_and_advice"]["f1_score"] == 1.0
    assert per_class["caution_and_advice"]["support"] == 2

    # Confusion matrix is 3x3
    cm = np.array(metrics["confusion_matrix"])
    assert cm.shape == (3, 3)
    assert cm[0, 0] == 2  # class 0 correct
    assert cm[2, 1] == 1  # class 2 predicted as class 1


def test_plot_generation(tmp_path: Path):
    labels = ["caution", "injured"]
    cm = np.array([[5, 1], [0, 4]])
    cm_path = tmp_path / "test_cm.png"
    plot_confusion_matrix(cm, labels, cm_path)
    assert cm_path.exists()
    assert cm_path.stat().st_size > 0

    per_class = {
        "caution": {"f1_score": 0.85, "support": 10},
        "injured": {"f1_score": 0.92, "support": 12},
    }
    f1_path = tmp_path / "test_f1.png"
    plot_per_class_f1(per_class, f1_path)
    assert f1_path.exists()
    assert f1_path.stat().st_size > 0
