"""
RESQNET AI — Google Colab Full HumAID DistilBERT Training Pipeline

Colab-ready, GPU-accelerated training script designed for fine-tuning DistilBERT
on the complete HumAID disaster dataset (53,531 train records, 7,793 dev records).

Key Features:
- Automatic CUDA GPU detection and device capability reporting (T4, V100, A100).
- Automatic mixed-precision training (FP16 / BF16) for 2.5x - 3x training acceleration.
- Checkpoint saving after every epoch with automatic resume support (--resume auto).
- Validation-driven model selection (eval_dataset = dev.jsonl; best model chosen by macro_f1).
- Complete isolation of the held-out test split (test.jsonl; 15,160 records) during training.
- Saves new trained model artifacts to a separate output directory to protect the existing prototype.
- Full post-training test set evaluation:
  * Accuracy
  * Macro and Weighted F1-scores, Precision, Recall
  * Complete per-class (class-wise) metrics breakdown
  * High-resolution Confusion Matrix heatmap
  * Per-Class F1 comparison chart
"""

import argparse
import json
import logging
import os
import sys
from pathlib import Path
from typing import Any, Dict, Optional, Union

# Enforce PyTorch backend for Transformers
os.environ["USE_TF"] = "0"
os.environ["USE_TORCH"] = "1"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import torch
from transformers import set_seed

from data.nlp.src.data_validation import load_config
from data.nlp.src.train import train_pipeline

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("RESQNET.ColabTrain")


def print_gpu_diagnostics() -> Dict[str, Any]:
    """Inspect and report hardware acceleration capabilities in Colab."""
    diagnostics = {
        "cuda_available": torch.cuda.is_available(),
        "device_count": torch.cuda.device_count() if torch.cuda.is_available() else 0,
        "device_name": torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU",
        "bf16_supported": torch.cuda.is_bf16_supported() if torch.cuda.is_available() else False,
    }
    print("\n" + "=" * 65)
    print("RESQNET AI — HARDWARE ACCELERATION DIAGNOSTICS")
    print("=" * 65)
    print(f"CUDA Available     : {diagnostics['cuda_available']}")
    if diagnostics["cuda_available"]:
        print(f"GPU Device Name    : {diagnostics['device_name']}")
        print(f"GPU Device Count   : {diagnostics['device_count']}")
        vram_gb = torch.cuda.get_device_properties(0).total_memory / (1024**3)
        print(f"Total VRAM         : {vram_gb:.2f} GB")
        print(f"BF16 Precision     : {'Supported' if diagnostics['bf16_supported'] else 'Not supported (using FP16)'}")
    else:
        print("WARNING: No GPU detected! Running on CPU will be extremely slow.")
        print("In Google Colab, go to: Runtime -> Change runtime type -> T4 GPU")
    print("=" * 65 + "\n")
    return diagnostics


def run_colab_training(
    epochs: int = 3,
    batch_size: int = 16,
    eval_batch_size: int = 32,
    learning_rate: float = 2e-5,
    sample_limit: Optional[int] = None,
    resume: Optional[str] = None,
    model_save_dir: str = "data/nlp/models/resqnet_distilbert_full",
    output_dir: str = "data/nlp/models/checkpoints_full",
    eval_output_dir: Optional[str] = None,
    fp16: Optional[bool] = None,
    bf16: Optional[bool] = None,
) -> Dict[str, Any]:
    """
    Execute full Colab training pipeline with safety safeguards.
    """
    diag = print_gpu_diagnostics()

    # Determine precision: auto-enable FP16 or BF16 on GPU
    use_fp16 = fp16
    use_bf16 = bf16
    if use_fp16 is None and use_bf16 is None:
        if diag["cuda_available"]:
            if diag["bf16_supported"]:
                use_bf16 = True
                use_fp16 = False
            else:
                use_fp16 = True
                use_bf16 = False
        else:
            use_fp16 = False
            use_bf16 = False

    logger.info(f"Target Model Save Dir: {model_save_dir} (Existing prototype is protected)")
    logger.info(f"Checkpoints Dir      : {output_dir}")
    logger.info(f"Precision Config     : fp16={use_fp16}, bf16={use_bf16}")

    # Launch full training pipeline
    results = train_pipeline(
        epochs=epochs,
        batch_size=batch_size,
        eval_batch_size=eval_batch_size,
        learning_rate=learning_rate,
        sample_limit=sample_limit,
        resume_from_checkpoint=resume,
        run_test_eval=True,
        model_save_dir=model_save_dir,
        output_dir=output_dir,
        eval_output_dir=eval_output_dir,
        fp16=use_fp16,
        bf16=use_bf16,
    )

    # Print comprehensive validation summary
    test_m = results.get("test_metrics", {})
    val_m = results.get("validation_metrics", {})

    print("\n" + "=" * 70)
    print("RESQNET AI — FULL HUMAID TRAINING & EVALUATION SUMMARY")
    print("=" * 70)
    print(f"Trained Model Output Directory : {results['model_dir']}")
    print(f"Evaluation Artifacts Directory : {results['evaluation_dir']}")
    print(f"Final Training Loss            : {results['training_loss']:.4f}")
    if val_m:
        print(f"Best Validation Macro F1       : {val_m.get('eval_macro_f1', 0):.4f}")
        print(f"Best Validation Accuracy       : {val_m.get('eval_accuracy', 0):.4f}")
    if test_m:
        print(f"Held-Out Test Accuracy         : {test_m.get('accuracy', 0):.4f}")
        print(f"Held-Out Test Macro F1         : {test_m.get('macro_f1', 0):.4f}")
        print(f"Held-Out Test Weighted F1      : {test_m.get('weighted_f1', 0):.4f}")

        print("\n--- HELD-OUT TEST PER-CLASS BREAKDOWN ---")
        per_class = test_m.get("per_class", {})
        print(f"{'Class Name':<42} {'Precision':<10} {'Recall':<10} {'F1-Score':<10} {'Support':<8}")
        print("-" * 80)
        for cname, cmetrics in per_class.items():
            print(
                f"{cname:<42} "
                f"{cmetrics['precision']:<10.4f} "
                f"{cmetrics['recall']:<10.4f} "
                f"{cmetrics['f1_score']:<10.4f} "
                f"{cmetrics['support']:<8d}"
            )

    print("=" * 70)
    print("NOTE: The original prototype checkpoint in 'data/nlp/models/resqnet_distilbert/'")
    print("remains completely untouched. You can validate the above metrics and replace the")
    print("prototype only after satisfying verification criteria.")
    print("=" * 70 + "\n")

    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="RESQNET AI — Google Colab Full HumAID DistilBERT Training Script"
    )
    parser.add_argument(
        "--epochs",
        type=int,
        default=3,
        help="Number of training epochs (Default: 3 for full HumAID)",
    )
    parser.add_argument(
        "--batch_size",
        type=int,
        default=16,
        help="Training batch size per device (Default: 16)",
    )
    parser.add_argument(
        "--eval_batch_size",
        type=int,
        default=32,
        help="Evaluation batch size per device (Default: 32)",
    )
    parser.add_argument(
        "--lr",
        type=float,
        default=2e-5,
        help="Learning rate for AdamW (Default: 2e-5)",
    )
    parser.add_argument(
        "--sample_limit",
        type=int,
        default=None,
        help="Optional limit on samples (omit for full 53,531 training records)",
    )
    parser.add_argument(
        "--resume",
        type=str,
        default=None,
        help="Checkpoint to resume from (e.g. 'auto' or path to checkpoint-XXXX)",
    )
    parser.add_argument(
        "--model_save_dir",
        type=str,
        default="data/nlp/models/resqnet_distilbert_full",
        help="Separate directory for newly trained model artifacts (Default: data/nlp/models/resqnet_distilbert_full)",
    )
    parser.add_argument(
        "--output_dir",
        type=str,
        default="data/nlp/models/checkpoints_full",
        help="Separate directory for training checkpoints (Default: data/nlp/models/checkpoints_full)",
    )
    parser.add_argument(
        "--eval_output_dir",
        type=str,
        default=None,
        help="Optional directory for test evaluation plots & metrics",
    )
    parser.add_argument(
        "--fp16",
        action="store_true",
        default=None,
        help="Explicitly enable FP16 mixed precision",
    )
    parser.add_argument(
        "--bf16",
        action="store_true",
        default=None,
        help="Explicitly enable BF16 mixed precision",
    )

    args = parser.parse_args()

    run_colab_training(
        epochs=args.epochs,
        batch_size=args.batch_size,
        eval_batch_size=args.eval_batch_size,
        learning_rate=args.lr,
        sample_limit=args.sample_limit,
        resume=args.resume,
        model_save_dir=args.model_save_dir,
        output_dir=args.output_dir,
        eval_output_dir=args.eval_output_dir,
        fp16=args.fp16,
        bf16=args.bf16,
    )
