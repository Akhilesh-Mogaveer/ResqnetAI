"""
RESQNET AI — Full Test Set Evaluation Runner
Evaluates data/nlp/models/resqnet_distilbert_full on data/nlp/datasets/raw/humaid/test.jsonl
"""

import sys
from pathlib import Path
REPO_ROOT = Path(__file__).resolve().parents[3]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

import json
import time
from data.nlp.src.evaluate import evaluate_saved_model

def main():
    model_path = "data/nlp/models/resqnet_distilbert_full"
    config_path = "data/nlp/configs/config.yaml"

    print("=" * 70)
    print("STARTING EVALUATION OF HUMAID DISTILBERT FULL MODEL")
    print(f"Model Checkpoint : {model_path}")
    print(f"Config File      : {config_path}")
    print(f"Target Split     : held-out test.jsonl (15,160 samples)")
    print("=" * 70)

    t0 = time.time()
    eval_res = evaluate_saved_model(
        model_dir=model_path,
        config_path=config_path,
        split_name="test"
    )
    elapsed = time.time() - t0

    acc = eval_res["accuracy"]
    macro_p = eval_res["macro_precision"]
    macro_r = eval_res["macro_recall"]
    macro_f1 = eval_res["macro_f1"]
    weighted_f1 = eval_res["weighted_f1"]

    print("\n" + "=" * 70)
    print("HUMAID DISTILBERT FULL MODEL — TEST EVALUATION RESULTS")
    print("=" * 70)
    print(f"Total Samples Evaluated : {len(eval_res.get('y_true', []))}")
    print(f"Elapsed Time            : {elapsed:.1f}s ({len(eval_res.get('y_true', []))/elapsed:.1f} samples/sec)")
    print(f"Accuracy                : {acc:.4f} ({acc*100:.2f}%)")
    print(f"Macro Precision         : {macro_p:.4f}")
    print(f"Macro Recall            : {macro_r:.4f}")
    print(f"Macro F1-Score          : {macro_f1:.4f}")
    print(f"Weighted F1-Score       : {weighted_f1:.4f}")

    print("\n" + "-" * 70)
    print("CLASSIFICATION REPORT")
    print("-" * 70)
    print(eval_res["classification_report_text"])

    print("-" * 70)
    print("PER-CLASS METRICS BREAKDOWN")
    print("-" * 70)
    print(f"{'Class Label':42s} | {'Prec':6s} | {'Rec':6s} | {'F1':6s} | {'Support':7s}")
    print("-" * 70)
    for cls_name, m in eval_res["per_class"].items():
        print(f"{cls_name:42s} | {m['precision']:.4f} | {m['recall']:.4f} | {m['f1_score']:.4f} | {m['support']:7d}")

    print("\n" + "-" * 70)
    print("CONFUSION MATRIX (10x10, Rows = True Class, Cols = Predicted Class)")
    print("-" * 70)
    cm = eval_res["confusion_matrix"]
    print(json.dumps(cm))
    print("=" * 70)

if __name__ == "__main__":
    main()
