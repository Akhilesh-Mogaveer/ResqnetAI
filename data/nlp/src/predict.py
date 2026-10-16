"""
RESQNET AI — Command-Line Prediction and Batch Scoring Script

Supports single-message queries, batch file scoring (CSV or JSONL),
and interactive coordinator testing.
"""

import argparse
import json
import logging
import sys
from pathlib import Path
from typing import List, Optional

import pandas as pd

try:
    from .inference import RESQNET_DISCLAIMER, ResqnetClassifier
except (ImportError, ValueError):
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from inference import RESQNET_DISCLAIMER, ResqnetClassifier

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("RESQNET.Predict")


def run_single_prediction(
    classifier: ResqnetClassifier,
    text: str,
    show_probabilities: bool = False,
) -> None:
    """Print formatted prediction for a single message."""
    pred = classifier.predict(text, return_all_probabilities=show_probabilities)

    print("\n" + "=" * 65)
    print("RESQNET AI — DISASTER INCIDENT CLASSIFICATION PREDICTION")
    print("=" * 65)
    print(f"Input Text         : \"{pred['input_text']}\"")
    if pred.get("cleaned_text") and pred["cleaned_text"] != pred["input_text"]:
        print(f"Cleaned Text       : \"{pred['cleaned_text']}\"")
    print(f"Predicted Category : {pred['predicted_category'].upper()}")
    print(f"Model Confidence   : {pred['confidence']:.2%}")
    print(f"Status             : {pred['status']}")
    print("-" * 65)
    print(f"DISCLAIMER:\n{pred['disclaimer']}")
    print("-" * 65)

    if show_probabilities and "all_probabilities" in pred:
        print("\nAll Category Probabilities:")
        sorted_probs = sorted(
            pred["all_probabilities"].items(), key=lambda x: x[1], reverse=True
        )
        for cat, prob in sorted_probs:
            bar = "#" * int(prob * 30)
            print(f"  {cat:38s}: {prob:6.2%} | {bar}")

    print("=" * 65 + "\n")


def run_batch_file_prediction(
    classifier: ResqnetClassifier,
    input_file: Path,
    output_file: Path,
    batch_size: int = 32,
    text_column: str = "tweet_text",
    show_probabilities: bool = False,
) -> None:
    """Read a batch file (CSV or JSONL), classify each record, and save results."""
    if not input_file.exists():
        raise FileNotFoundError(f"Input batch file not found: {input_file}")

    logger.info(f"Loading input records from: {input_file}")
    texts = []
    metadata_list = []

    suffix = input_file.suffix.lower()
    if suffix == ".jsonl":
        with open(input_file, "r", encoding="utf-8", errors="replace") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    obj = json.loads(line)
                    txt = obj.get(text_column) or obj.get("text", "")
                    texts.append(str(txt))
                    metadata_list.append(obj)
                except json.JSONDecodeError:
                    continue
    elif suffix == ".csv":
        df = pd.read_csv(input_file)
        target_col = text_column if text_column in df.columns else "text"
        if target_col not in df.columns:
            target_col = df.columns[0]
            logger.warning(f"Column '{text_column}' not found. Using first column '{target_col}'.")
        texts = df[target_col].astype(str).tolist()
        metadata_list = df.to_dict(orient="records")
    else:
        # Treat as plain text line by line
        with open(input_file, "r", encoding="utf-8") as f:
            texts = [line.strip() for line in f if line.strip()]
            metadata_list = [{"line_no": i + 1} for i in range(len(texts))]

    logger.info(f"Classifying {len(texts)} messages in batches of {batch_size}...")
    predictions = classifier.predict_batch(
        texts, batch_size=batch_size, return_all_probabilities=show_probabilities
    )

    output_file.parent.mkdir(parents=True, exist_ok=True)
    out_suffix = output_file.suffix.lower()

    if out_suffix == ".csv":
        out_rows = []
        for meta, pred in zip(metadata_list, predictions):
            row = dict(meta)
            row["predicted_category"] = pred["predicted_category"]
            row["confidence"] = pred["confidence"]
            row["disclaimer"] = pred["disclaimer"]
            out_rows.append(row)
        pd.DataFrame(out_rows).to_csv(output_file, index=False)
    else:
        with open(output_file, "w", encoding="utf-8") as f:
            for meta, pred in zip(metadata_list, predictions):
                record = {
                    "source_record": meta,
                    "prediction": pred,
                }
                f.write(json.dumps(record) + "\n")

    logger.info(f"Batch prediction complete. Saved {len(predictions)} outputs to: {output_file}")


def interactive_mode(classifier: ResqnetClassifier) -> None:
    """Interactive loop for emergency response coordinator test queries."""
    print("\n" + "=" * 65)
    print("RESQNET AI — Interactive NLP Coordinator Testing Console")
    print("Type disaster text messages to classify. Type 'quit' or 'exit' to stop.")
    print("=" * 65 + "\n")

    while True:
        try:
            user_input = input("Enter disaster message: ").strip()
            if not user_input:
                continue
            if user_input.lower() in ["quit", "exit", "q"]:
                print("Exiting interactive console.")
                break
            run_single_prediction(classifier, user_input, show_probabilities=True)
        except (KeyboardInterrupt, EOFError):
            print("\nExiting interactive console.")
            break


def main():
    parser = argparse.ArgumentParser(description="RESQNET AI Disaster Text Classification CLI")
    parser.add_argument("--model-dir", type=str, default="data/nlp/models/resqnet_distilbert", help="Trained model path")
    parser.add_argument("--text", type=str, default=None, help="Single text message to classify")
    parser.add_argument("--input-file", type=str, default=None, help="Path to input CSV/JSONL for batch inference")
    parser.add_argument("--output-file", type=str, default="data/nlp/outputs/predictions/batch_predictions.jsonl", help="Path to output file")
    parser.add_argument("--batch-size", type=int, default=32, help="Batch size for batch inference")
    parser.add_argument("--text-column", type=str, default="tweet_text", help="Text column name")
    parser.add_argument("--probs", action="store_true", help="Include full class probability distribution")
    parser.add_argument("--interactive", action="store_true", help="Run interactive console")
    parser.add_argument("--device", type=str, default=None, help="Execution device: 'cpu' or 'cuda'")

    args = parser.parse_args()

    model_dir = Path(args.model_dir)
    if not model_dir.exists():
        print(f"ERROR: Model directory '{model_dir}' not found. Please train a model first using train.py.")
        sys.exit(1)

    classifier = ResqnetClassifier(
        model_dir=model_dir,
        device=args.device,
    )

    if args.interactive:
        interactive_mode(classifier)
    elif args.input_file:
        run_batch_file_prediction(
            classifier=classifier,
            input_file=Path(args.input_file),
            output_file=Path(args.output_file),
            batch_size=args.batch_size,
            text_column=args.text_column,
            show_probabilities=args.probs,
        )
    elif args.text:
        run_single_prediction(classifier, args.text, show_probabilities=args.probs)
    else:
        # Default test example from prompt
        test_msg = "There is flooding near the bridge and people need rescue."
        print(f"No specific arguments provided. Running default coordinator test:\n")
        run_single_prediction(classifier, test_msg, show_probabilities=True)


if __name__ == "__main__":
    main()
