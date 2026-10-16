"""
RESQNET AI — Data Loader and Tokenization Pipeline

Loads HumAID disaster dataset splits, encodes labels, and creates tokenized
Hugging Face Datasets ready for DistilBERT fine-tuning and evaluation.
"""

import json
import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

# Force PyTorch backend for Transformers
os.environ["USE_TF"] = "0"
os.environ["USE_TORCH"] = "1"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

import pandas as pd
from datasets import Dataset, DatasetDict
from transformers import AutoTokenizer, PreTrainedTokenizerBase

try:
    from .data_validation import load_config, resolve_dataset_dir
    from .preprocessing import LabelMapper, clean_text
except (ImportError, ValueError):
    import sys
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from data_validation import load_config, resolve_dataset_dir
    from preprocessing import LabelMapper, clean_text

logger = logging.getLogger("RESQNET.DataLoader")


def load_jsonl_records(
    file_path: Union[str, Path],
    text_column: str = "tweet_text",
    label_column: str = "class_label",
    limit: Optional[int] = None,
    clean: bool = True,
) -> Tuple[List[str], List[str]]:
    """
    Load text and label records from a JSONL file.

    Parameters
    ----------
    file_path : Union[str, Path]
        Path to JSONL file.
    text_column : str
        Column name for text messages.
    label_column : str
        Column name for class label.
    limit : Optional[int]
        Maximum number of samples to load (useful for smoke tests).
    clean : bool
        Whether to apply clean_text preprocessing.

    Returns
    -------
    Tuple[List[str], List[str]]
        Lists of texts and labels.
    """
    file_path = Path(file_path)
    if not file_path.exists():
        raise FileNotFoundError(f"Dataset split file not found: {file_path}")

    texts = []
    labels = []

    with open(file_path, "r", encoding="utf-8", errors="replace") as f:
        for idx, line in enumerate(f):
            if limit is not None and len(texts) >= limit:
                break
            line = line.strip()
            if not line:
                continue
            try:
                item = json.loads(line)
            except json.JSONDecodeError:
                continue

            raw_text = item.get(text_column, "")
            raw_label = item.get(label_column, "")

            if raw_text is None or raw_label is None:
                continue

            processed_text = clean_text(str(raw_text)) if clean else str(raw_text).strip()
            processed_label = str(raw_label).strip()

            if processed_text and processed_label:
                texts.append(processed_text)
                labels.append(processed_label)

    logger.info(f"Loaded {len(texts)} valid samples from {file_path.name}")
    return texts, labels


def build_humaid_dataset(
    config: Optional[Dict[str, Any]] = None,
    config_path: Optional[str] = None,
    tokenizer_name: Optional[str] = None,
    max_length: Optional[int] = None,
    sample_limit: Optional[int] = None,
) -> Tuple[DatasetDict, LabelMapper, PreTrainedTokenizerBase]:
    """
    Build tokenized DatasetDict (train, validation, test) from HumAID splits.

    Returns
    -------
    Tuple[DatasetDict, LabelMapper, PreTrainedTokenizerBase]
        Tokenized dataset dictionary, trained LabelMapper, and initialized tokenizer.
    """
    if config is None:
        config = load_config(config_path)

    dataset_dir = resolve_dataset_dir(config)
    text_col = config["dataset"]["text_column"]
    label_col = config["dataset"]["label_column"]
    model_name = tokenizer_name or config["model"]["pretrained_model_name"]
    max_seq_len = max_length or config["model"].get("max_seq_length", 128)

    train_path = dataset_dir / config["dataset"]["train_file"]
    val_path = dataset_dir / config["dataset"]["val_file"]
    test_path = dataset_dir / config["dataset"]["test_file"]

    # Load records
    train_texts, train_labels = load_jsonl_records(train_path, text_col, label_col, limit=sample_limit)
    val_texts, val_labels = load_jsonl_records(val_path, text_col, label_col, limit=sample_limit)
    test_texts, test_labels = load_jsonl_records(test_path, text_col, label_col, limit=sample_limit)

    # Initialize LabelMapper using all canonical classes across the full dataset
    all_classes_set = set()
    with open(train_path, "r", encoding="utf-8", errors="replace") as f:
        for line in f:
            if line.strip():
                try:
                    lbl = json.loads(line).get(label_col)
                    if lbl:
                        all_classes_set.add(str(lbl).strip())
                except Exception:
                    pass
    label_mapper = LabelMapper(labels=sorted(list(all_classes_set)))
    logger.info(f"Built label mapping with {len(label_mapper)} canonical classes: {label_mapper.labels}")

    # Encode labels to integer IDs (filtering any invalid samples)
    train_label_ids = [label_mapper.encode(lbl) for lbl in train_labels if lbl in label_mapper.label2id]
    val_label_ids = [label_mapper.encode(lbl) for lbl in val_labels if lbl in label_mapper.label2id]
    test_label_ids = [label_mapper.encode(lbl) for lbl in test_labels if lbl in label_mapper.label2id]

    # Convert to Hugging Face Datasets
    raw_dict = DatasetDict({
        "train": Dataset.from_dict({"text": train_texts, "label": train_label_ids}),
        "validation": Dataset.from_dict({"text": val_texts, "label": val_label_ids}),
        "test": Dataset.from_dict({"text": test_texts, "label": test_label_ids}),
    })

    # Load Tokenizer
    logger.info(f"Loading tokenizer: {model_name}")
    tokenizer = AutoTokenizer.from_pretrained(model_name)

    # Tokenization function
    def tokenize_fn(batch):
        return tokenizer(
            batch["text"],
            padding="max_length",
            truncation=True,
            max_length=max_seq_len,
            return_tensors=None,
        )

    logger.info(f"Tokenizing datasets with max_length={max_seq_len}...")
    tokenized_dict = raw_dict.map(tokenize_fn, batched=True, desc="Tokenizing")

    return tokenized_dict, label_mapper, tokenizer
