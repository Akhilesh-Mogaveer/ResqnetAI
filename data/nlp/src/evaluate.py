"""
RESQNET AI — Model Evaluation Module

Computes accuracy, macro/weighted precision, recall, F1-scores, per-class metrics,
classification report, and generates confusion matrix and F1-score comparison plots.
"""

import json
import logging
import os
import sys

# Force PyTorch backend for Transformers
os.environ["USE_TF"] = "0"
os.environ["USE_TORCH"] = "1"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
import torch
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    precision_recall_fscore_support,
)
from transformers import AutoModelForSequenceClassification, AutoTokenizer

try:
    from .data_validation import load_config
    from .preprocessing import LabelMapper
except (ImportError, ValueError):
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from data_validation import load_config
    from preprocessing import LabelMapper

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("RESQNET.Evaluation")


def compute_metrics_fn(eval_pred) -> Dict[str, float]:
    """
    Hugging Face Trainer compatible metric computation callback.
    """
    logits, labels = eval_pred
    preds = np.argmax(logits, axis=1)

    acc = accuracy_score(labels, preds)
    precision_macro, recall_macro, f1_macro, _ = precision_recall_fscore_support(
        labels, preds, average="macro", zero_division=0
    )
    precision_weighted, recall_weighted, f1_weighted, _ = precision_recall_fscore_support(
        labels, preds, average="weighted", zero_division=0
    )

    return {
        "accuracy": float(acc),
        "macro_precision": float(precision_macro),
        "macro_recall": float(recall_macro),
        "macro_f1": float(f1_macro),
        "weighted_f1": float(f1_weighted),
    }


def compute_comprehensive_metrics(
    y_true: List[int],
    y_pred: List[int],
    y_prob: Optional[np.ndarray],
    labels: List[str],
) -> Dict[str, Any]:
    """
    Computes global and per-class metrics, confusion matrix, and classification report.
    """
    acc = accuracy_score(y_true, y_pred)

    macro_p, macro_r, macro_f1, _ = precision_recall_fscore_support(
        y_true, y_pred, average="macro", zero_division=0
    )
    weighted_p, weighted_r, weighted_f1, _ = precision_recall_fscore_support(
        y_true, y_pred, average="weighted", zero_division=0
    )

    per_class_p, per_class_r, per_class_f1, per_class_support = precision_recall_fscore_support(
        y_true, y_pred, average=None, labels=list(range(len(labels))), zero_division=0
    )

    per_class_metrics = {}
    for idx, label_name in enumerate(labels):
        per_class_metrics[label_name] = {
            "precision": float(per_class_p[idx]),
            "recall": float(per_class_r[idx]),
            "f1_score": float(per_class_f1[idx]),
            "support": int(per_class_support[idx]),
        }

    cm = confusion_matrix(y_true, y_pred, labels=list(range(len(labels))))
    report_dict = classification_report(
        y_true,
        y_pred,
        labels=list(range(len(labels))),
        target_names=labels,
        output_dict=True,
        zero_division=0,
    )
    report_text = classification_report(
        y_true,
        y_pred,
        labels=list(range(len(labels))),
        target_names=labels,
        zero_division=0,
    )

    return {
        "accuracy": float(acc),
        "macro_precision": float(macro_p),
        "macro_recall": float(macro_r),
        "macro_f1": float(macro_f1),
        "weighted_precision": float(weighted_p),
        "weighted_recall": float(weighted_r),
        "weighted_f1": float(weighted_f1),
        "per_class": per_class_metrics,
        "confusion_matrix": cm.tolist(),
        "classification_report_dict": report_dict,
        "classification_report_text": report_text,
    }


def plot_confusion_matrix(
    cm: np.ndarray,
    class_names: List[str],
    output_path: Union[str, Path],
    title: str = "RESQNET AI — DistilBERT Confusion Matrix",
    normalize: bool = True,
) -> None:
    """Plot and save confusion matrix heatmap."""
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    if normalize:
        cm_norm = cm.astype("float") / (cm.sum(axis=1)[:, np.newaxis] + 1e-9)
        display_data = cm_norm
        fmt = ".2f"
    else:
        display_data = cm
        fmt = "d"

    plt.figure(figsize=(12, 10))
    sns.heatmap(
        display_data,
        annot=True,
        fmt=fmt,
        cmap="Blues",
        xticklabels=class_names,
        yticklabels=class_names,
        cbar_kws={"label": "Proportion" if normalize else "Count"},
    )
    plt.title(title, fontsize=14, fontweight="bold", pad=15)
    plt.xlabel("Predicted Disaster Category", fontsize=12)
    plt.ylabel("True Disaster Category", fontsize=12)
    plt.xticks(rotation=45, ha="right", fontsize=9)
    plt.yticks(rotation=0, fontsize=9)
    plt.tight_layout()
    plt.savefig(output_path, dpi=200)
    plt.close()
    logger.info(f"Saved confusion matrix plot to: {output_path}")


def plot_per_class_f1(
    per_class_metrics: Dict[str, Dict[str, float]],
    output_path: Union[str, Path],
    title: str = "RESQNET AI — Per-Class F1-Scores",
) -> None:
    """Plot horizontal bar chart of per-class F1-scores."""
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    classes = list(per_class_metrics.keys())
    f1_scores = [per_class_metrics[c]["f1_score"] for c in classes]
    supports = [per_class_metrics[c]["support"] for c in classes]

    # Sort by F1 score
    sorted_pairs = sorted(zip(classes, f1_scores, supports), key=lambda x: x[1])
    sorted_classes = [p[0] for p in sorted_pairs]
    sorted_f1s = [p[1] for p in sorted_pairs]
    sorted_supports = [p[2] for p in sorted_pairs]

    plt.figure(figsize=(10, 6))
    colors = ["#e74c3c" if f1 < 0.5 else "#f39c12" if f1 < 0.75 else "#2ecc71" for f1 in sorted_f1s]
    bars = plt.barh(sorted_classes, sorted_f1s, color=colors, height=0.6)

    for bar, f1, sup in zip(bars, sorted_f1s, sorted_supports):
        plt.text(
            bar.get_width() + 0.01,
            bar.get_y() + bar.get_height() / 2,
            f"{f1:.2f} (n={sup})",
            va="center",
            fontsize=9,
        )

    plt.xlim(0, 1.1)
    plt.title(title, fontsize=13, fontweight="bold")
    plt.xlabel("F1-Score", fontsize=11)
    plt.ylabel("Disaster Category", fontsize=11)
    plt.grid(axis="x", linestyle="--", alpha=0.7)
    plt.tight_layout()
    plt.savefig(output_path, dpi=200)
    plt.close()
    logger.info(f"Saved per-class F1 plot to: {output_path}")


def evaluate_saved_model(
    model_dir: Union[str, Path],
    config_path: Optional[str] = None,
    split_name: str = "test",
    sample_limit: Optional[int] = None,
    output_dir: Optional[Union[str, Path]] = None,
) -> Dict[str, Any]:
    """
    Load a trained model checkpoint and evaluate it thoroughly on the test split.
    """
    model_dir = Path(model_dir)
    config = load_config(config_path)

    # 1. Load label mapping
    label_map_file = model_dir / "label_mapping.json"
    if not label_map_file.exists():
        label_map_file = Path(config["model"]["label_mapping_file"])

    label_mapper = LabelMapper.load(label_map_file)
    logger.info(f"Loaded label mapper with {len(label_mapper)} classes.")

    # 2. Load tokenizer and model
    logger.info(f"Loading model and tokenizer from: {model_dir}")
    tokenizer = AutoTokenizer.from_pretrained(str(model_dir))
    model = AutoModelForSequenceClassification.from_pretrained(str(model_dir))

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model.to(device)
    model.eval()
    logger.info(f"Evaluating on device: {device}")

    # 3. Load dataset split
    try:
        from .data_loader import load_jsonl_records
        from .data_validation import resolve_dataset_dir
    except (ImportError, ValueError):
        from data_loader import load_jsonl_records
        from data_validation import resolve_dataset_dir

    dataset_dir = resolve_dataset_dir(config)
    split_filename = config["dataset"][f"{split_name}_file"]
    split_path = dataset_dir / split_filename

    texts, str_labels = load_jsonl_records(
        split_path,
        text_column=config["dataset"]["text_column"],
        label_column=config["dataset"]["label_column"],
        limit=sample_limit,
    )

    # Filter to samples whose labels are recognized by the model's label mapper
    valid_indices = [i for i, lbl in enumerate(str_labels) if lbl in label_mapper.label2id]
    if len(valid_indices) < len(str_labels):
        logger.warning(f"Filtered {len(str_labels) - len(valid_indices)} samples with unknown labels.")
    texts = [texts[i] for i in valid_indices]
    y_true = [label_mapper.encode(str_labels[i]) for i in valid_indices]

    # 4. Batch Inference
    batch_size = config["training"].get("per_device_eval_batch_size", 32)
    max_length = config["model"].get("max_seq_length", 128)

    y_pred = []
    y_probs = []

    logger.info(f"Running inference on {len(texts)} {split_name} samples...")
    with torch.no_grad():
        for i in range(0, len(texts), batch_size):
            batch_texts = texts[i : i + batch_size]
            encoded = tokenizer(
                batch_texts,
                padding=True,
                truncation=True,
                max_length=max_length,
                return_tensors="pt",
            ).to(device)

            outputs = model(**encoded)
            logits = outputs.logits
            probs = torch.softmax(logits, dim=-1).cpu().numpy()
            preds = np.argmax(probs, axis=1).tolist()

            y_pred.extend(preds)
            y_probs.extend(probs)

    y_probs = np.array(y_probs)

    # 5. Compute all metrics
    metrics = compute_comprehensive_metrics(
        y_true=y_true,
        y_pred=y_pred,
        y_prob=y_probs,
        labels=label_mapper.labels,
    )

    # 6. Save results
    if output_dir:
        out_path = Path(output_dir)
        metrics_dir = out_path / "metrics"
        plots_dir = out_path / "plots"
    else:
        metrics_dir = Path(config["evaluation"]["metrics_dir"])
        plots_dir = Path(config["evaluation"]["plots_dir"])

    metrics_dir.mkdir(parents=True, exist_ok=True)
    plots_dir.mkdir(parents=True, exist_ok=True)

    metrics_save_path = metrics_dir / f"{split_name}_metrics.json"
    with open(metrics_save_path, "w", encoding="utf-8") as f:
        # Don't serialize non-json object
        serializable_metrics = {k: v for k, v in metrics.items()}
        json.dump(serializable_metrics, f, indent=2)
    logger.info(f"Saved evaluation metrics to: {metrics_save_path}")

    # Save per-class CSV
    per_class_df = pd.DataFrame.from_dict(metrics["per_class"], orient="index")
    per_class_df.index.name = "class_label"
    per_class_df.to_csv(metrics_dir / f"{split_name}_per_class_metrics.csv")

    # Plots
    cm = np.array(metrics["confusion_matrix"])
    plot_confusion_matrix(
        cm=cm,
        class_names=label_mapper.labels,
        output_path=plots_dir / f"{split_name}_confusion_matrix.png",
        title=f"RESQNET AI — Confusion Matrix ({split_name.capitalize()} Split)",
    )

    plot_per_class_f1(
        per_class_metrics=metrics["per_class"],
        output_path=plots_dir / f"{split_name}_per_class_f1.png",
        title=f"RESQNET AI — Per-Class F1 Scores ({split_name.capitalize()} Split)",
    )

    return metrics


if __name__ == "__main__":
    cfg = sys.argv[1] if len(sys.argv) > 1 else None
    model_path = sys.argv[2] if len(sys.argv) > 2 else "data/nlp/models/resqnet_distilbert"
    split = sys.argv[3] if len(sys.argv) > 3 else "test"

    if Path(model_path).exists():
        eval_res = evaluate_saved_model(model_path, cfg, split_name=split)
        print("\n" + "=" * 60)
        print(f"RESQNET AI — EVALUATION REPORT ({split.upper()})")
        print("=" * 60)
        print(f"Accuracy         : {eval_res['accuracy']:.4f}")
        print(f"Macro F1-Score   : {eval_res['macro_f1']:.4f}")
        print(f"Weighted F1-Score: {eval_res['weighted_f1']:.4f}")
        print("\nClassification Report:\n")
        print(eval_res["classification_report_text"])
        print("=" * 60 + "\n")
    else:
        print(f"Model path '{model_path}' does not exist yet. Please run training first.")
