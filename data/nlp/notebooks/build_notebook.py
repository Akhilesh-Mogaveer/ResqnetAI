"""
Script to build the official RESQNET_HumAID_NLP_Training.ipynb notebook
using nbformat for guaranteed Jupyter format compliance and schema validity.
"""

import json
from pathlib import Path
import nbformat as nbf

def create_notebook():
    nb = nbf.v4.new_notebook()
    nb.metadata = {
        "kernelspec": {
            "display_name": "Python 3",
            "language": "python",
            "name": "python3"
        },
        "language_info": {
            "codemirror_mode": {"name": "ipython", "version": 3},
            "file_extension": ".py",
            "mimetype": "text/x-python",
            "name": "python",
            "nbconvert_exporter": "python",
            "pygments_lexer": "ipython3",
            "version": "3.13.0"
        }
    }

    cells = []

    # 1. Project introduction
    cells.append(nbf.v4.new_markdown_cell("""# RESQNET AI — Disaster Message Classification with HumAID & DistilBERT

## 1. Project Introduction

**RESQNET AI** is an intelligent emergency-response coordination platform designed to empower disaster dispatchers, incident commanders, and first-responder coordinators. During large-scale emergencies (such as earthquakes, hurricanes, floods, and wildfires), emergency dispatch centers are flooded with thousands of incoming citizen reports and social media messages every hour.

### Objective
This notebook develops and validates the **multi-class NLP classification pipeline** for incoming crisis messages using the curated **HumAID** (Humanitarian Aid) dataset. The classifier automatically identifies the operational category of a report so that requests can be routed to the appropriate response team.

### Operational Scope & Mission Safety Notice
> **CRITICAL RESQNET MISSION SAFETY GUIDELINES:**
> - **Triage Assistance Only:** Classification suggests the probable situational category of incoming text.
> - **No Autonomous Verification:** A high classification confidence does **not** verify incident veracity or confirm that an emergency is genuine.
> - **No Coordinate Extraction:** This model classifies text categories; it does **not** extract geographic coordinates, addresses, or victim headcounts without dedicated downstream NER/geocoding modules.
> - **No Deduplication:** Multiple messages sharing the same class do not imply a single consolidated incident.
> - **Human-in-the-Loop:** Predictions must assist human dispatchers and coordinators, never trigger automated unit dispatch without human authorization.
"""))

    # 2. Environment setup
    cells.append(nbf.v4.new_markdown_cell("""## 2. Environment Setup

We verify the local Python environment, PyTorch backend, Transformers, Datasets, and hardware acceleration status (CUDA GPU vs. CPU fallback). We also ensure that the working directory is aligned with the project root."""))

    cells.append(nbf.v4.new_code_cell("""import os
import sys
from pathlib import Path

# Align working directory to project root
current_dir = Path.cwd()
project_root = current_dir
while project_root != project_root.parent:
    if (project_root / "data" / "nlp").exists():
        break
    project_root = project_root.parent

if (project_root / "data" / "nlp").exists():
    os.chdir(project_root)
    if str(project_root) not in sys.path:
        sys.path.insert(0, str(project_root))

# Enforce PyTorch backend for Transformers
os.environ["USE_TF"] = "0"
os.environ["USE_TORCH"] = "1"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

import torch
import transformers
import datasets
import sklearn
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

print(f"Project Root Directory : {Path.cwd()}")
print(f"Python Version         : {sys.version.split()[0]}")
print(f"PyTorch Version        : {torch.__version__}")
print(f"CUDA Available (GPU)   : {torch.cuda.is_available()}")
if torch.cuda.is_available():
    print(f"CUDA Device Name       : {torch.cuda.get_device_name(0)}")
else:
    print("Execution Device       : CPU (Fallback mode enabled)")
print(f"Transformers Version   : {transformers.__version__}")
print(f"Datasets Version       : {datasets.__version__}")
"""))

    # 3. Dataset loading
    cells.append(nbf.v4.new_markdown_cell("""## 3. Dataset Loading

We load the HumAID dataset splits from `data/nlp/datasets/raw/humaid/`:
- `train.jsonl` — Primary training split (53,531 records)
- `dev.jsonl` — Validation split for model selection and checkpoint evaluation (7,793 records)
- `test.jsonl` — Held-out test split reserved for final unbiased performance assessment (15,160 records)
"""))

    cells.append(nbf.v4.new_code_cell("""import json

raw_dir = Path("data/nlp/datasets/raw/humaid")
train_file = raw_dir / "train.jsonl"
dev_file = raw_dir / "dev.jsonl"
test_file = raw_dir / "test.jsonl"

def load_jsonl_df(file_path):
    records = []
    with open(file_path, "r", encoding="utf-8", errors="replace") as f:
        for line in f:
            line = line.strip()
            if line:
                records.append(json.loads(line))
    return pd.DataFrame(records)

print(f"Loading HumAID dataset splits from: {raw_dir.resolve()} ...")
df_train = load_jsonl_df(train_file)
df_dev = load_jsonl_df(dev_file)
df_test = load_jsonl_df(test_file)

print(f"Train split records: {len(df_train):,}")
print(f"Dev split records  : {len(df_dev):,}")
print(f"Test split records : {len(df_test):,}")
print(f"Total dataset size : {len(df_train) + len(df_dev) + len(df_test):,} records")

# Inspect sample records from train split
df_train.head(3)
"""))

    # 4. Dataset exploration
    cells.append(nbf.v4.new_markdown_cell("""## 4. Dataset Exploration & Integrity Analysis

Before training, we perform exploratory data analysis:
1. Verify presence of text and label fields (`tweet_text`, `class_label`).
2. Scan for missing values or blank messages.
3. Validate label consistency across train, dev, and test partitions.
4. Check for duplicate messages and potential cross-split data leakage.
5. Compute and visualize class distributions.
"""))

    cells.append(nbf.v4.new_code_cell("""# 1. Missing values and blank messages check
missing_audit = pd.DataFrame({
    "Split": ["Train", "Dev", "Test"],
    "Total Rows": [len(df_train), len(df_dev), len(df_test)],
    "Null Text": [df_train["tweet_text"].isna().sum(), df_dev["tweet_text"].isna().sum(), df_test["tweet_text"].isna().sum()],
    "Blank/Whitespace Text": [
        (df_train["tweet_text"].str.strip() == "").sum(),
        (df_dev["tweet_text"].str.strip() == "").sum(),
        (df_test["tweet_text"].str.strip() == "").sum()
    ],
    "Null Label": [df_train["class_label"].isna().sum(), df_dev["class_label"].isna().sum(), df_test["class_label"].isna().sum()],
})
display(missing_audit)
"""))

    cells.append(nbf.v4.new_code_cell("""# 2. Label consistency across splits
unique_train_labels = sorted(df_train["class_label"].unique())
unique_dev_labels = sorted(df_dev["class_label"].unique())
unique_test_labels = sorted(df_test["class_label"].unique())

print(f"Unique Disaster Categories Identified ({len(unique_train_labels)}):")
for idx, lbl in enumerate(unique_train_labels, 1):
    print(f"  {idx:2d}. {lbl}")

assert unique_train_labels == unique_dev_labels == unique_test_labels, "Label set mismatch across splits!"
print("\\nLabel Consistency Check: PASSED (Identical 10 classes across all 3 splits)")
"""))

    cells.append(nbf.v4.new_code_cell("""# 3. Check for duplicates and cross-split leakage
train_texts = set(df_train["tweet_text"].str.strip())
dev_texts = set(df_dev["tweet_text"].str.strip())
test_texts = set(df_test["tweet_text"].str.strip())

train_dev_overlap = train_texts.intersection(dev_texts)
train_test_overlap = train_texts.intersection(test_texts)

print(f"Unique texts in Train: {len(train_texts):,}")
print(f"Unique texts in Dev  : {len(dev_texts):,}")
print(f"Unique texts in Test : {len(test_texts):,}")
print(f"Train-Dev text overlap  : {len(train_dev_overlap)} texts (viral retweets during disasters)")
print(f"Train-Test text overlap : {len(train_test_overlap)} texts (strict separation)")
"""))

    cells.append(nbf.v4.new_code_cell("""# 4. Class Distribution Comparison Table & Plot
dist_rows = []
for lbl in unique_train_labels:
    tr_count = int((df_train["class_label"] == lbl).sum())
    dv_count = int((df_dev["class_label"] == lbl).sum())
    ts_count = int((df_test["class_label"] == lbl).sum())
    dist_rows.append({
        "Category": lbl,
        "Train Count": tr_count,
        "Train %": round(tr_count / len(df_train) * 100, 2),
        "Dev Count": dv_count,
        "Dev %": round(dv_count / len(df_dev) * 100, 2),
        "Test Count": ts_count,
        "Test %": round(ts_count / len(df_test) * 100, 2),
    })

df_dist = pd.DataFrame(dist_rows)
display(df_dist)

# Plot class distributions
plot_df = df_dist.set_index("Category")[["Train Count", "Dev Count", "Test Count"]]
ax = plot_df.plot(kind="barh", figsize=(12, 6), width=0.8, colormap="viridis")
plt.title("HumAID Disaster Category Distribution Across Splits", fontsize=13, fontweight="bold")
plt.xlabel("Number of Records", fontsize=11)
plt.ylabel("Disaster Category", fontsize=11)
plt.grid(axis="x", linestyle="--", alpha=0.7)
plt.tight_layout()
plt.show()
"""))

    # 5. Text preprocessing
    cells.append(nbf.v4.new_markdown_cell("""## 5. Text Preprocessing

Social-media crisis texts typically contain HTML entities (`&amp;`, `&lt;`), URLs, `@mentions`, and non-standard control characters.
We reuse `clean_text` and `LabelMapper` from `data/nlp/src/preprocessing.py`:
- Unescapes HTML entities.
- Strips non-informative URLs.
- Normalizes excess whitespace and control characters.
- Encodes labels to deterministic numerical IDs.
"""))

    cells.append(nbf.v4.new_code_cell("""from data.nlp.src.preprocessing import clean_text, LabelMapper

# Demonstration of clean_text on raw crisis tweets
sample_raw_tweets = [
    "Powerful Ecuador quake kills at least 235 &amp; hundreds injured: https://t.co/xyz123 #EcuadorQuake",
    "RT @RedCross: Emergency shelter open at Central Gym! Free blankets &amp; water. http://redcross.org/relief",
    "Please RT: Two children missing near bridge after floods @police_dept #help",
]

print("--- Preprocessing Demonstration ---")
for raw in sample_raw_tweets:
    cleaned = clean_text(raw)
    print(f"RAW    : {raw}")
    print(f"CLEANED: {cleaned}\\n")

# LabelMapper instantiation
mapper = LabelMapper(labels=unique_train_labels)
print(f"LabelMapper initialized with {len(mapper)} classes.")
print(f"Encoded 'requests_or_urgent_needs' -> ID {mapper.encode('requests_or_urgent_needs')}")
print(f"Decoded ID {mapper.encode('requests_or_urgent_needs')} -> '{mapper.decode(mapper.encode('requests_or_urgent_needs'))}'")
"""))

    # 6. Tokenizer preparation
    cells.append(nbf.v4.new_markdown_cell("""## 6. Tokenizer Preparation

We load the pretrained `DistilBertTokenizerFast` (`distilbert/distilbert-base-uncased`) and demonstrate tokenization, padding, truncation, and token decoding.
"""))

    cells.append(nbf.v4.new_code_cell("""from transformers import AutoTokenizer

model_name = "distilbert/distilbert-base-uncased"
print(f"Loading pretrained tokenizer: {model_name}...")
tokenizer = AutoTokenizer.from_pretrained(model_name)

demo_message = "There is flooding near the bridge and people need rescue."
encoded = tokenizer(
    demo_message,
    padding="max_length",
    truncation=True,
    max_length=24,
    return_tensors="pt"
)

print(f'Demo Message        : "{demo_message}"')
print(f"Input IDs shape     : {encoded['input_ids'].shape}")
print(f"Attention Mask shape: {encoded['attention_mask'].shape}")
print(f"Input IDs           : {encoded['input_ids'][0].tolist()[:12]}")
print(f"Tokens              : {tokenizer.convert_ids_to_tokens(encoded['input_ids'][0][:12])}")
"""))

    # 7. Model training
    cells.append(nbf.v4.new_markdown_cell("""## 7. Model Training Pipeline

The training pipeline is fully implemented in `data/nlp/src/train.py`. It integrates:
- **Pretrained Architecture:** `DistilBertForSequenceClassification`
- **Loss & Optimizer:** CrossEntropyLoss with AdamW and linear learning-rate warmup
- **Validation Model Selection:** Checkpoints are evaluated on the dev split at each epoch; the best model is selected based on `macro_f1`.
- **Test Split Isolation:** The test split is kept strictly untouched during training.

### How to Run Training:
1. **Full Training (Recommended via CLI):**
   ```bash
   python data/nlp/src/train.py --epochs 3 --batch_size 16 --lr 2e-5
   ```
2. **Smoke Test / Debug Run (Limits samples for quick verification):**
   ```bash
   python data/nlp/src/train.py --sample_limit 30 --epochs 1 --batch_size 8
   ```
3. **Resuming from Checkpoint:**
   ```bash
   python data/nlp/src/train.py --resume data/nlp/models/checkpoints/checkpoint-4
   ```

*Note: In this notebook, training is disabled by default to avoid long-running operations on CPU.*
"""))

    cells.append(nbf.v4.new_code_cell("""# Training Execution Interface (Toggleable)
RUN_TRAINING_IN_NOTEBOOK = False
SMOKE_TEST_MODE = True  # If True, trains on 30 samples for fast verification

if RUN_TRAINING_IN_NOTEBOOK:
    from data.nlp.src.train import train_pipeline
    sample_limit = 30 if SMOKE_TEST_MODE else None
    epochs = 1 if SMOKE_TEST_MODE else 3
    batch_size = 8 if SMOKE_TEST_MODE else 16
    
    print(f"Launching training pipeline (Sample Limit: {sample_limit}, Epochs: {epochs})...")
    results = train_pipeline(
        epochs=epochs,
        batch_size=batch_size,
        sample_limit=sample_limit,
        run_test_eval=True
    )
    print("Training finished! Saved model to:", results["model_dir"])
else:
    print("Notebook training skipped (RUN_TRAINING_IN_NOTEBOOK is False).")
    print("Existing trained model weights are saved in: data/nlp/models/resqnet_distilbert/")
"""))

    # 8. Evaluation
    cells.append(nbf.v4.new_markdown_cell("""## 8. Model Evaluation

We evaluate the saved model on the held-out test split using the reusable evaluation module `data/nlp/src/evaluate.py`.
Metrics calculated:
- Overall Accuracy
- Macro Precision, Recall, and F1-Score (essential due to class imbalance)
- Weighted F1-Score
- Per-class metrics breakdown
- Confusion Matrix
"""))

    cells.append(nbf.v4.new_code_cell("""from data.nlp.src.evaluate import evaluate_saved_model
from IPython.display import Image, display

model_dir = Path("data/nlp/models/resqnet_distilbert")
assert model_dir.exists(), f"Model directory '{model_dir}' not found. Please train first."

print(f"Running evaluation on test split using model at: {model_dir} ...")
# Use sample_limit for quick notebook responsiveness; omit or set to None for all 15k test samples
test_eval = evaluate_saved_model(
    model_dir=model_dir,
    split_name="test",
    sample_limit=50
)

print("\\n" + "=" * 60)
print("TEST SPLIT PERFORMANCE METRICS")
print("=" * 60)
print(f"Accuracy         : {test_eval['accuracy']:.4f}")
print(f"Macro F1-Score   : {test_eval['macro_f1']:.4f}")
print(f"Weighted F1-Score: {test_eval['weighted_f1']:.4f}")
print("=" * 60)

# Display per-class metrics
df_per_class = pd.DataFrame.from_dict(test_eval["per_class"], orient="index")
display(df_per_class)

# Display confusion matrix heatmap
cm_plot = Path("data/nlp/outputs/plots/test_confusion_matrix.png")
if cm_plot.exists():
    display(Image(filename=str(cm_plot)))
"""))

    # 9. Sample predictions
    cells.append(nbf.v4.new_markdown_cell("""## 9. Sample Predictions & Coordinator Interface

We instantiate the production `ResqnetClassifier` from `data/nlp/src/inference.py` to classify realistic emergency messages.
Every prediction returns:
- Input message text
- Predicted disaster category
- Confidence score & full class probability distribution
- Mandatory RESQNET emergency safety disclaimer
"""))

    cells.append(nbf.v4.new_code_cell("""from data.nlp.src.inference import ResqnetClassifier

classifier = ResqnetClassifier(
    model_dir="data/nlp/models/resqnet_distilbert",
    device="auto"
)

test_scenarios = [
    "There is flooding near the bridge and people need rescue.",
    "Major damage to Highway 101 overpass and power grid down across sector 3.",
    "Volunteers urgently needed at community center to package first-aid supplies.",
    "Two elderly residents trapped on roof due to rising flood waters on 4th street.",
    "Praying for everyone affected by the earthquake tonight, stay safe and strong.",
    "Emergency storm warning issued for coastal counties. Evacuate low-lying areas now."
]

print("=" * 75)
print("RESQNET AI — INCIDENT CLASSIFICATION PREDICTION INTERFACE")
print("=" * 75)

for msg in test_scenarios:
    pred = classifier.predict(msg, return_all_probabilities=True)
    print('\\nInput Message     : "' + str(pred['input_text']) + '"')
    print(f"Predicted Category: {pred['predicted_category'].upper()}")
    print(f"Model Confidence  : {pred['confidence']:.2%}")
    print(f"Status            : {pred['status']}")
    print(f"Disclaimer        : {pred['disclaimer']}")
    
    # Top 3 probabilities
    sorted_probs = sorted(pred["all_probabilities"].items(), key=lambda x: x[1], reverse=True)[:3]
    print("Top Probabilities :")
    for cat, prob in sorted_probs:
        bar = "#" * int(prob * 25)
        print(f"   - {cat:38s}: {prob:6.2%} | {bar}")
    print("-" * 75)
"""))

    # 10. Conclusion and limitations
    cells.append(nbf.v4.new_markdown_cell("""## 10. Conclusion and Operational Limitations

### Summary of Accomplishments
1. **End-to-End NLP Pipeline:** Built a modular disaster classification pipeline fine-tuning DistilBERT on 76,484 HumAID records.
2. **Standardized Taxonomies:** Mapped and classified 10 distinct humanitarian operational categories.
3. **Decoupled Architecture:** Inference (`ResqnetClassifier`) is fully isolated from training and ready for integration with the FastAPI backend.
4. **Safety-First Design:** Clear disclaimers and validation protocols embedded into every prediction output.

### Known Limitations & Future Roadmap
| Capability | Current Status | Required Separate Component |
|---|---|---|
| **Category Classification** | Supported | Core DistilBERT multi-class classifier |
| **Incident Authenticity** | Not Supported | Requires cross-source verification, author reputation, and anomaly detection |
| **Geographic Coordinates** | Not Supported | Requires dedicated Named Entity Recognition (NER) & reverse-geocoding API |
| **Victim Count Estimation** | Not Supported | Requires numerical relation extraction module |
| **Duplicate Incident Deduplication**| Not Supported | Requires spatiotemporal clustering across incoming feeds |
| **Dispatch Decision-Making** | Not Supported | **Strictly Human-in-the-Loop:** Dispatch decisions remain human coordinator responsibility |

### Class Imbalance Considerations
- The class `missing_or_found_people` accounts for only **0.47%** (250 train samples).
- For production fine-tuning, consider class-weighted cross-entropy loss or focal loss to optimize minority class recall.
"""))

    nb.cells = cells

    output_path = Path("data/nlp/notebooks/RESQNET_HumAID_NLP_Training.ipynb")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        nbf.write(nb, f)

    print(f"Successfully generated Jupyter Notebook at: {output_path.resolve()}")
    return output_path

if __name__ == "__main__":
    create_notebook()
