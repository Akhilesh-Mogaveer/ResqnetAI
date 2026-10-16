# RESQNET AI — Disaster Text Classification NLP/ML Pipeline

This module provides the core natural language processing (NLP) and machine learning (ML) pipeline for **RESQNET AI**, an intelligent emergency-response coordination system. It fine-tunes pretrained **DistilBERT** on the curated **HumAID** (Humanitarian Aid) disaster dataset to perform multi-class categorization of crisis communications.

---

## 1. Operational Overview & Safety Boundaries

> [!IMPORTANT]
> **RESQNET AI MISSION SAFETY NOTICE:**
> The NLP text classification model is an automated triage decision-support tool. It identifies the probable situational category of incoming emergency text messages.
> - **It does NOT verify incident truth:** A predicted category does not prove a real-world event occurred.
> - **It does NOT extract geographic coordinates or victims count:** Dedicated NER and geospatial modules are required for geolocation and casualty estimation.
> - **It does NOT deduplicate incidents:** Similar tweets or duplicate predictions do not imply a single consolidated event.
> - **Human-in-the-Loop:** Predictions must assist human emergency dispatchers and emergency coordinators, never automate autonomous resource dispatch without human authorization.

---

## 2. Directory Structure

All ML and NLP assets are self-contained within `data/nlp/`:

```text
data/nlp/
├── configs/
│   └── config.yaml             # Configurable hyperparameters, paths, seeds, thresholds
├── datasets/
│   ├── raw/
│   │   └── humaid/             # Unmodified HumAID splits (train.jsonl, dev.jsonl, test.jsonl)
│   ├── processed/              # Normalized, tokenized, or cached data
│   └── splits/                 # Custom sub-splits or batch sample inputs
├── models/
│   ├── .gitkeep
│   └── resqnet_distilbert/     # Model weights (safetensors), tokenizer, label mapping, config
├── outputs/
│   ├── metrics/                # JSON & CSV summaries (dataset_summary, class_dist, test_metrics)
│   ├── plots/                  # Visualizations (confusion matrix, class distribution, curves)
│   └── predictions/            # Batch scoring output files (JSONL, CSV)
├── logs/                       # Training logs and runtime diagnostics
├── notebooks/                  # Exploratory and prototyping notebooks
├── src/
│   ├── __init__.py             # Exports ResqnetClassifier, clean_text, LabelMapper
│   ├── data_loader.py          # Data ingestion and Hugging Face Dataset tokenization
│   ├── data_validation.py      # Schema verification, null check, distribution, leakage scan
│   ├── evaluate.py             # Evaluation metrics, confusion matrix, and reporting
│   ├── inference.py            # Reusable, thread-safe inference class for serving/FastAPI
│   ├── predict.py              # CLI for single message, batch file, and interactive REPL
│   ├── preprocessing.py        # Text normalization (HTML, URLs, mentions) & LabelMapper
│   └── train.py                # DistilBERT fine-tuning pipeline with validation selection
├── tests/
│   ├── test_data_loader.py     # Tests for data loading and resilience to malformed records
│   ├── test_evaluation_metrics.py # Tests for confusion matrix and precision/recall/F1 math
│   ├── test_inference.py       # Tests for empty input handling, schema, and disclaimers
│   ├── test_pipeline_smoke.py  # End-to-end integration test loading saved model
│   └── test_preprocessing.py   # Tests for regex cleaners and label mapper serialization
├── requirements.txt            # Pinned, tested dependencies
└── README.md                   # This documentation
```

---

## 3. Dataset Information

The pipeline trains on the **HumAID** (Humanitarian Aid) multi-event dataset, which aggregates crisis-related tweets across 19 major disaster events (earthquakes, hurricanes, floods, wildfires):

- **License & Attribution:** HumAID dataset is provided by QCRI under research licensing. Messages retain original humanitarian taxonomies.
- **Dataset Scale:**
  - **Total Records:** 76,484
  - **Train Split (`train.jsonl`):** 53,531 records (70.0%)
  - **Dev/Validation Split (`dev.jsonl`):** 7,793 records (10.2%)
  - **Test Split (`test.jsonl`):** 15,160 records (19.8%)
- **Disaster Categories (10 Classes):**
  1. `caution_and_advice` (7.05%)
  2. `displaced_people_and_evacuations` (5.23%)
  3. `infrastructure_and_utility_damage` (10.68%)
  4. `injured_or_dead_people` (9.55%)
  5. `missing_or_found_people` (0.47% — high imbalance)
  6. `not_humanitarian` (8.23%)
  7. `other_relevant_information` (15.88%)
  8. `requests_or_urgent_needs` (3.42%)
  9. `rescue_volunteering_or_donation_effort` (27.82% — largest category)
  10. `sympathy_and_support` (11.68%)

---

## 4. Environment Setup

### Prerequisites
- Python 3.10 - 3.13 (Tested on Python 3.13.14)
- PyTorch 2.0+ (CPU or CUDA GPU)

### Installation
From the project root:

```bash
# Install required NLP dependencies
python -m pip install -r data/nlp/requirements.txt
```

---

## 5. Workflow Guide

### Step 1: Validate Dataset Integrity & Leakage
Run the automated validation tool to inspect schemas, record counts, nulls, and class distributions:

```bash
python data/nlp/src/data_validation.py
```
Outputs saved:
- Summary report: `data/nlp/outputs/metrics/dataset_summary.json`
- Class distribution: `data/nlp/outputs/metrics/class_distribution.csv`
- Distribution chart: `data/nlp/outputs/plots/class_distribution.png`

### Step 2: Fine-Tune DistilBERT
Train the model using the official HumAID train and dev splits:

```bash
# Full training (Config defaults: 3 epochs, batch size 16, lr 2e-5)
python data/nlp/src/train.py

# Custom parameters:
python data/nlp/src/train.py --epochs 3 --batch_size 16 --lr 2e-5

# Quick smoke test / debug run (limits to 50 samples):
python data/nlp/src/train.py --sample_limit 50 --epochs 1 --batch_size 8

# Resume training from checkpoint:
python data/nlp/src/train.py --resume data/nlp/models/checkpoints/checkpoint-500
```
Outputs saved:
- Model weights & tokenizer: `data/nlp/models/resqnet_distilbert/`
- Label mappings: `data/nlp/models/resqnet_distilbert/label_mapping.json`
- Training curves: `data/nlp/outputs/plots/training_curves.png`
- Training loss history: `data/nlp/outputs/metrics/training_history.json`

### Step 3: Standalone Evaluation on Test Split
To evaluate a saved model on the held-out test split:

```bash
python data/nlp/src/evaluate.py --model_dir data/nlp/models/resqnet_distilbert --split test
```
Outputs saved:
- Test metrics JSON: `data/nlp/outputs/metrics/test_metrics.json`
- Per-class metrics CSV: `data/nlp/outputs/metrics/test_per_class_metrics.csv`
- Normalized confusion matrix: `data/nlp/outputs/plots/test_confusion_matrix.png`
- Per-class F1-score comparison: `data/nlp/outputs/plots/test_per_class_f1.png`

### Step 4: Run Predictions & Batch Scoring

#### Single Message Query:
```bash
python data/nlp/src/predict.py --text "There is flooding near the bridge and people need rescue." --probs
```

#### Batch File Scoring (CSV or JSONL):
```bash
python data/nlp/src/predict.py --input-file data/nlp/datasets/splits/sample_batch.jsonl --output-file data/nlp/outputs/predictions/batch_predictions.jsonl --batch-size 32
```

#### Interactive Coordinator Console:
```bash
python data/nlp/src/predict.py --interactive
```

---

## 6. Integration with FastAPI Backend

The inference pipeline is designed to be loaded once at server startup without retraining:

```python
from data.nlp.src.inference import ResqnetClassifier

# Initialize once (e.g. in FastAPI lifespan or app state)
classifier = ResqnetClassifier(
    model_dir="data/nlp/models/resqnet_distilbert",
    device="auto"  # Automatically uses GPU if available
)

# Call inside endpoint
@app.post("/api/triage/classify")
async def classify_incident(payload: IncidentRequest):
    result = classifier.predict(payload.text, return_all_probabilities=True)
    return {
        "text": result["input_text"],
        "category": result["predicted_category"],
        "confidence": result["confidence"],
        "disclaimer": result["disclaimer"],
        "probabilities": result["all_probabilities"]
    }
```

---

## 7. Automated Testing Suite

Run the full pytest suite:

```bash
python -m pytest data/nlp/tests/ -v
```

Tests cover:
- Text sanitization, HTML entity decoding, URL stripping, and mention handling.
- `LabelMapper` serialization and deterministic alphabetization.
- Handling of malformed, null, and empty JSONL records.
- Schema verification and safety disclaimers for empty inputs.
- Confusion matrix calculations and plot generation.
- End-to-end inference smoke test on saved weights.

---

## 8. Known Limitations & Recommendations

1. **Extreme Class Imbalance:** The category `missing_or_found_people` accounts for only 0.47% (250 instances in train) of the dataset. Consider focal loss, class-weighted cross entropy, or oversampling if high recall on missing person reports is required.
2. **Retweet Duplication:** In disaster scenarios, retweets of emergency notices introduce overlapping phrases across temporal splits. The preprocessing cleaner strips URLs and handles mentions to focus attention on situational semantics.
3. **Hardware Considerations:** DistilBERT fine-tuning on 53k rows on CPU requires ~1.5 - 2.5 hours. On an NVIDIA GPU (T4, RTX 3060+), 3 epochs complete in ~8–12 minutes with `fp16: true`.
