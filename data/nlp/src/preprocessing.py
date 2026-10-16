"""
RESQNET AI — Text Preprocessing and Label Mapping

Provides robust text normalization specifically tailored for social-media disaster text
(HTML entities, user mentions, URLs, hashtags, emoji handling, whitespace normalization),
plus reproducible label-to-id and id-to-label mappings.
"""

import html
import json
import logging
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

logger = logging.getLogger("RESQNET.Preprocessing")

# Standard regex patterns for social media disaster text
URL_REGEX = re.compile(r"https?://\S+|www\.\S+")
USER_MENTION_REGEX = re.compile(r"@\w+")
WHITESPACE_REGEX = re.compile(r"\s+")
# Retain disaster-critical punctuation and numbers while removing noise control chars
CONTROL_CHAR_REGEX = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]")


def clean_text(
    text: Optional[str],
    normalize_urls: bool = True,
    normalize_mentions: bool = False,
    preserve_hashtags: bool = True,
    strip_html: bool = True,
) -> str:
    """
    Clean and normalize raw text messages for NLP disaster classification.

    Parameters
    ----------
    text : Optional[str]
        Raw input string.
    normalize_urls : bool
        If True, replaces raw web links with empty string or standard token.
    normalize_mentions : bool
        If True, replaces '@username' with '@user'. If False, preserves mention text.
    preserve_hashtags : bool
        If True, keeps the '#' or hashtag text which frequently contains disaster keywords.
    strip_html : bool
        If True, unescapes HTML entities (e.g. '&amp;' -> '&', '&lt;' -> '<').

    Returns
    -------
    str
        Cleaned, normalized text. Empty string if input was None or blank.
    """
    if text is None:
        return ""

    if not isinstance(text, str):
        text = str(text)

    # 1. Decode HTML entities
    if strip_html:
        text = html.unescape(text)

    # 2. Remove control characters
    text = CONTROL_CHAR_REGEX.sub(" ", text)

    # 3. Clean or replace URLs (URLs rarely contain semantic context for DistilBERT disaster classification)
    if normalize_urls:
        text = URL_REGEX.sub(" ", text)

    # 4. Handle user mentions
    if normalize_mentions:
        text = USER_MENTION_REGEX.sub("@user", text)

    # 5. Clean whitespace
    text = WHITESPACE_REGEX.sub(" ", text).strip()

    return text


class LabelMapper:
    """
    Encapsulates label <-> id encoding with deterministic sorting and serialization.
    """

    def __init__(
        self,
        labels: Optional[List[str]] = None,
        label2id: Optional[Dict[str, int]] = None,
        id2label: Optional[Dict[int, str]] = None,
    ):
        if label2id is not None and id2label is not None:
            self.label2id = {str(k): int(v) for k, v in label2id.items()}
            self.id2label = {int(k): str(v) for k, v in id2label.items()}
            self.labels = [self.id2label[i] for i in range(len(self.id2label))]
        elif labels is not None:
            # Deterministic sorted order
            self.labels = sorted(list(set(labels)))
            self.label2id = {label: idx for idx, label in enumerate(self.labels)}
            self.id2label = {idx: label for idx, label in enumerate(self.labels)}
        else:
            self.labels = []
            self.label2id = {}
            self.id2label = {}

    def __len__(self) -> int:
        return len(self.labels)

    def encode(self, label: str) -> int:
        """Map class name to integer ID."""
        if label not in self.label2id:
            raise KeyError(f"Label '{label}' not in label mapping. Available: {list(self.label2id.keys())}")
        return self.label2id[label]

    def decode(self, label_id: int) -> str:
        """Map integer ID to class name."""
        if label_id not in self.id2label:
            raise KeyError(f"Label ID '{label_id}' not in ID mapping. Available: {list(self.id2label.keys())}")
        return self.id2label[label_id]

    def save(self, filepath: Union[str, Path]) -> None:
        """Save label mapping dictionary to JSON."""
        path = Path(filepath)
        path.parent.mkdir(parents=True, exist_ok=True)
        data = {
            "num_labels": len(self.labels),
            "labels": self.labels,
            "label2id": self.label2id,
            "id2label": {str(k): v for k, v in self.id2label.items()},
        }
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        logger.info(f"Saved label mapping with {len(self.labels)} classes to: {path}")

    @classmethod
    def load(cls, filepath: Union[str, Path]) -> "LabelMapper":
        """Load label mapping from JSON file."""
        path = Path(filepath)
        if not path.exists():
            raise FileNotFoundError(f"Label mapping file not found: {path}")

        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)

        label2id = data["label2id"]
        id2label = {int(k): v for k, v in data["id2label"].items()}
        return cls(label2id=label2id, id2label=id2label)
