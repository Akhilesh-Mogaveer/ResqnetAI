"""
RESQNET AI — DistilBERT Fine-Tuning Pipeline

Fine-tunes DistilBERT for multi-class disaster text classification
using official HumAID training and validation splits.
"""

import argparse
import json
import logging
import os
import sys

# Force PyTorch backend for Transformers
os.environ["USE_TF"] = "0"
os.environ["USE_TORCH"] = "1"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

from pathlib import Path
from typing import Any, Dict, Optional

import matplotlib.pyplot as plt
import numpy as np
import torch
from transformers import (
    AutoModelForSequenceClassification,
    AutoTokenizer,
    Trainer,
    TrainingArguments,
    set_seed,
)

try:
    from .data_loader import build_humaid_dataset
    from .data_validation import load_config
    from .evaluate import compute_metrics_fn, evaluate_saved_model
    from .preprocessing import LabelMapper
except (ImportError, ValueError):
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from data_loader import build_humaid_dataset
    from data_validation import load_config
    from evaluate import compute_metrics_fn, evaluate_saved_model
    from preprocessing import LabelMapper

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("RESQNET.Train")


def plot_training_curves(log_history: list, output_path: Path) -> None:
    """Generate training vs validation loss and F1 curves."""
    output_path.parent.mkdir(parents=True, exist_ok=True)

    train_loss = []
    eval_loss = []
    eval_f1 = []
    epochs_eval = []

    for entry in log_history:
        if "loss" in entry and "epoch" in entry:
            train_loss.append((entry["epoch"], entry["loss"]))
        if "eval_loss" in entry and "epoch" in entry:
            eval_loss.append((entry["epoch"], entry["eval_loss"]))
            epochs_eval.append(entry["epoch"])
            if "eval_macro_f1" in entry:
                eval_f1.append((entry["epoch"], entry["eval_macro_f1"]))

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))

    # Loss plot
    if train_loss:
        tr_ep, tr_l = zip(*train_loss)
        ax1.plot(tr_ep, tr_l, label="Training Loss", color="#2980b9", lw=2)
    if eval_loss:
        ev_ep, ev_l = zip(*eval_loss)
        ax1.plot(ev_ep, ev_l, label="Validation Loss", color="#e74c3c", lw=2, marker="o")

    ax1.set_title("Training & Validation Loss", fontsize=12, fontweight="bold")
    ax1.set_xlabel("Epoch", fontsize=10)
    ax1.set_ylabel("Loss", fontsize=10)
    ax1.grid(True, linestyle="--", alpha=0.6)
    ax1.legend()

    # F1 score plot
    if eval_f1:
        f1_ep, f1_val = zip(*eval_f1)
        ax2.plot(f1_ep, f1_val, label="Validation Macro F1", color="#27ae60", lw=2, marker="s")
        ax2.set_title("Validation Macro F1-Score", fontsize=12, fontweight="bold")
        ax2.set_xlabel("Epoch", fontsize=10)
        ax2.set_ylabel("Macro F1", fontsize=10)
        ax2.grid(True, linestyle="--", alpha=0.6)
        ax2.legend()
    else:
        ax2.text(0.5, 0.5, "No eval F1 points logged", ha="center", va="center")

    plt.tight_layout()
    plt.savefig(output_path, dpi=200)
    plt.close()
    logger.info(f"Saved training curves to: {output_path}")


def train_pipeline(
    config_path: Optional[str] = None,
    epochs: Optional[int] = None,
    batch_size: Optional[int] = None,
    eval_batch_size: Optional[int] = None,
    learning_rate: Optional[float] = None,
    sample_limit: Optional[int] = None,
    resume_from_checkpoint: Optional[Union[str, bool]] = None,
    run_test_eval: bool = True,
    model_save_dir: Optional[str] = None,
    output_dir: Optional[str] = None,
    eval_output_dir: Optional[str] = None,
    fp16: Optional[bool] = None,
    bf16: Optional[bool] = None,
) -> Dict[str, Any]:
    """
    Main training execution function.
    Supports GPU acceleration (FP16/BF16), checkpoint resume,
    separate artifact directories, and held-out test evaluation.
    """
    config = load_config(config_path)

    # Override config with any explicit CLI parameters
    seed = config["training"].get("seed", 42)
    set_seed(seed)

    num_epochs = epochs or config["training"].get("num_train_epochs", 3)
    train_bs = batch_size or config["training"].get("per_device_train_batch_size", 16)
    eval_bs = eval_batch_size or config["training"].get("per_device_eval_batch_size", 32)
    lr = learning_rate or float(config["training"].get("learning_rate", 2e-5))
    resume_ckpt = resume_from_checkpoint if resume_from_checkpoint is not None else config["training"].get("resume_from_checkpoint")

    model_name = config["model"]["pretrained_model_name"]
    max_length = config["model"].get("max_seq_length", 128)

    # Separate directories to protect the existing prototype checkpoint
    save_dir = Path(model_save_dir or config["model"].get("model_save_dir", "data/nlp/models/resqnet_distilbert_full"))
    ckpt_dir = Path(output_dir or config["training"].get("output_dir", "data/nlp/models/checkpoints_full"))
    eval_out_dir = Path(eval_output_dir) if eval_output_dir else (save_dir / "evaluation")

    save_dir.mkdir(parents=True, exist_ok=True)
    ckpt_dir.mkdir(parents=True, exist_ok=True)
    eval_out_dir.mkdir(parents=True, exist_ok=True)

    # Hardware detection & precision
    use_cuda = torch.cuda.is_available()
    device = "cuda" if use_cuda else "cpu"
    device_name = torch.cuda.get_device_name(0) if use_cuda else "CPU"
    logger.info(f"Using device: {device.upper()} ({device_name}) | CUDA Available: {use_cuda}")

    # Determine mixed precision settings
    if bf16 is True:
        use_bf16 = True
        use_fp16 = False
    elif fp16 is not None:
        use_fp16 = fp16
        use_bf16 = False
    else:
        # Default: auto-enable fp16 on CUDA GPU for 2.5x-3x training acceleration
        use_fp16 = use_cuda
        use_bf16 = False
    logger.info(f"Mixed Precision: fp16={use_fp16}, bf16={use_bf16}")

    # 1. Build Tokenized Dataset & LabelMapper (train, validation, test)
    logger.info("Loading and tokenizing HumAID dataset splits...")
    tokenized_datasets, label_mapper, tokenizer = build_humaid_dataset(
        config=config,
        sample_limit=sample_limit,
        max_length=max_length,
    )

    num_labels = len(label_mapper)
    logger.info(f"Class count: {num_labels} | Classes: {label_mapper.labels}")
    logger.info(f"Dataset split sizes: train={len(tokenized_datasets['train'])}, validation={len(tokenized_datasets['validation'])}, test={len(tokenized_datasets['test'])}")

    # 2. Save Label Mapping immediately for reproducibility
    label_map_path = save_dir / "label_mapping.json"
    label_mapper.save(label_map_path)

    # 3. Instantiate Pretrained Model for Sequence Classification
    logger.info(f"Initializing Sequence Classification model: {model_name} with {num_labels} classes")
    model = AutoModelForSequenceClassification.from_pretrained(
        model_name,
        num_labels=num_labels,
        id2label={str(k): v for k, v in label_mapper.id2label.items()},
        label2id=label_mapper.label2id,
    )

    # 4. Configure Training Arguments
    # Note: Held-out test split is strictly excluded from training and checkpoint selection.
    training_kwargs = {
        "output_dir": str(ckpt_dir),
        "learning_rate": lr,
        "per_device_train_batch_size": train_bs,
        "per_device_eval_batch_size": eval_bs,
        "num_train_epochs": num_epochs,
        "weight_decay": config["training"].get("weight_decay", 0.01),
        "warmup_ratio": config["training"].get("warmup_ratio", 0.1),
        "logging_steps": config["training"].get("logging_steps", 50),
        "save_strategy": config["training"].get("save_strategy", "epoch"),
        "eval_strategy": config["training"].get("eval_strategy", "epoch"),
        "load_best_model_at_end": config["training"].get("load_best_model_at_end", True),
        "metric_for_best_model": config["training"].get("metric_for_best_model", "macro_f1"),
        "greater_is_better": config["training"].get("greater_is_better", True),
        "seed": seed,
        "fp16": use_fp16,
        "bf16": use_bf16,
        "report_to": "none",
        "save_total_limit": 2,
    }

    # Handle transformers version compatibility for eval_strategy
    try:
        training_args = TrainingArguments(**training_kwargs)
    except TypeError:
        training_kwargs["evaluation_strategy"] = training_kwargs.pop("eval_strategy")
        training_args = TrainingArguments(**training_kwargs)

    # 5. Initialize Trainer (Validation split used for evaluation; Test split kept isolated)
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized_datasets["train"],
        eval_dataset=tokenized_datasets["validation"],
        tokenizer=tokenizer,
        compute_metrics=compute_metrics_fn,
    )

    # 6. Execute Training with Checkpoint Resume Support
    logger.info(
        f"Starting fine-tuning: {num_epochs} epochs | Train batch size: {train_bs} | Learning rate: {lr}"
    )

    resume_arg = None
    if resume_ckpt:
        if str(resume_ckpt).strip().lower() in ("true", "auto", "latest", "1"):
            resume_arg = True
            logger.info("Auto-detecting latest checkpoint in output directory to resume from...")
        else:
            resume_arg = str(resume_ckpt).strip()
            logger.info(f"Resuming training from checkpoint: {resume_arg}")

    train_result = trainer.train(resume_from_checkpoint=resume_arg)

    # 7. Evaluate on Validation Split
    logger.info("Evaluating best model on Validation split...")
    val_metrics = trainer.evaluate()
    logger.info(f"Validation Metrics: {val_metrics}")

    # 8. Save Final Trained Model & Tokenizer to separate output directory
    logger.info(f"Saving fine-tuned model artifacts to: {save_dir}")
    trainer.save_model(str(save_dir))
    tokenizer.save_pretrained(str(save_dir))

    # Save training configuration alongside model
    model_config_snapshot = {
        "base_model": model_name,
        "max_seq_length": max_length,
        "num_classes": num_labels,
        "classes": label_mapper.labels,
        "learning_rate": lr,
        "epochs": num_epochs,
        "train_batch_size": train_bs,
        "eval_batch_size": eval_bs,
        "sample_limit": sample_limit,
        "fp16": use_fp16,
        "bf16": use_bf16,
        "best_val_macro_f1": val_metrics.get("eval_macro_f1"),
        "best_val_accuracy": val_metrics.get("eval_accuracy"),
        "train_loss": train_result.training_loss,
    }
    with open(save_dir / "training_config.json", "w", encoding="utf-8") as f:
        json.dump(model_config_snapshot, f, indent=2)

    # Save log history and plot training curves
    metrics_dir = eval_out_dir / "metrics"
    plots_dir = eval_out_dir / "plots"
    metrics_dir.mkdir(parents=True, exist_ok=True)
    plots_dir.mkdir(parents=True, exist_ok=True)

    history_path = metrics_dir / "training_history.json"
    with open(history_path, "w", encoding="utf-8") as f:
        json.dump(trainer.state.log_history, f, indent=2)

    plot_training_curves(trainer.state.log_history, plots_dir / "training_curves.png")

    test_metrics = None
    if run_test_eval:
        logger.info("Running evaluation on held-out Test split (class-wise, macro/weighted F1, confusion matrix)...")
        test_metrics = evaluate_saved_model(
            model_dir=save_dir,
            config_path=config_path,
            split_name="test",
            sample_limit=sample_limit,
            output_dir=eval_out_dir,
        )

    return {
        "model_dir": str(save_dir),
        "validation_metrics": val_metrics,
        "test_metrics": test_metrics,
        "training_loss": train_result.training_loss,
        "evaluation_dir": str(eval_out_dir),
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="RESQNET AI NLP Training Pipeline (Colab / GPU Ready)")
    parser.add_argument("--config", type=str, default=None, help="Path to config.yaml")
    parser.add_argument("--model_save_dir", type=str, default=None, help="Directory to save final model (preserves prototype)")
    parser.add_argument("--output_dir", type=str, default=None, help="Directory to save checkpoints")
    parser.add_argument("--eval_output_dir", type=str, default=None, help="Directory to save evaluation metrics and plots")
    parser.add_argument("--epochs", type=int, default=None, help="Number of training epochs")
    parser.add_argument("--batch_size", type=int, default=None, help="Training batch size per device")
    parser.add_argument("--eval_batch_size", type=int, default=None, help="Evaluation batch size per device")
    parser.add_argument("--lr", type=float, default=None, help="Learning rate (e.g. 2e-5)")
    parser.add_argument("--sample_limit", type=int, default=None, help="Limit samples (for smoke test)")
    parser.add_argument("--resume", type=str, default=None, help="Checkpoint path or 'auto' to resume")
    parser.add_argument("--fp16", action="store_true", default=None, help="Force FP16 mixed precision")
    parser.add_argument("--bf16", action="store_true", default=None, help="Force BF16 mixed precision")
    parser.add_argument("--no_test_eval", action="store_true", help="Skip final test set evaluation")

    args = parser.parse_args()

    res = train_pipeline(
        config_path=args.config,
        model_save_dir=args.model_save_dir,
        output_dir=args.output_dir,
        eval_output_dir=args.eval_output_dir,
        epochs=args.epochs,
        batch_size=args.batch_size,
        eval_batch_size=args.eval_batch_size,
        learning_rate=args.lr,
        sample_limit=args.sample_limit,
        resume_from_checkpoint=args.resume,
        run_test_eval=not args.no_test_eval,
        fp16=args.fp16,
        bf16=args.bf16,
    )
    print("\n" + "=" * 65)
    print("RESQNET AI — TRAINING & TEST EVALUATION COMPLETED")
    print("=" * 65)
    print(f"Model Directory         : {res['model_dir']}")
    print(f"Evaluation Directory    : {res['evaluation_dir']}")
    print(f"Final Training Loss     : {res['training_loss']:.4f}")
    if res["validation_metrics"]:
        print(f"Validation Macro F1     : {res['validation_metrics'].get('eval_macro_f1', 0):.4f}")
        print(f"Validation Accuracy     : {res['validation_metrics'].get('eval_accuracy', 0):.4f}")
    if res["test_metrics"]:
        print(f"Test Accuracy (Held-out): {res['test_metrics']['accuracy']:.4f}")
        print(f"Test Macro F1           : {res['test_metrics']['macro_f1']:.4f}")
        print(f"Test Weighted F1        : {res['test_metrics']['weighted_f1']:.4f}")
    print("=" * 65 + "\n")
