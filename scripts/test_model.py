from pathlib import Path
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification

model_path = Path("data/nlp/models/resqnet_distilbert_full").resolve()

print("Loading RESQNET model...")

tokenizer = AutoTokenizer.from_pretrained(str(model_path))
model = AutoModelForSequenceClassification.from_pretrained(str(model_path))
model.eval()

print("Model loaded successfully!")

text = "Several people are trapped after an earthquake."

# Tokenize the text
inputs = tokenizer(
    text,
    return_tensors="pt",
    truncation=True,
    max_length=160
)

# DistilBERT does not use token_type_ids
inputs.pop("token_type_ids", None)

# Generate prediction
with torch.no_grad():
    outputs = model(**inputs)
    probabilities = torch.softmax(outputs.logits, dim=-1)
    predicted_id = probabilities.argmax(dim=-1).item()
    confidence = probabilities[0, predicted_id].item()

# Read the actual category name
id2label = model.config.id2label
predicted_label = id2label.get(predicted_id, id2label.get(str(predicted_id), str(predicted_id)))

print("\nInput:", text)
print("Predicted category:", predicted_label)
print(f"Confidence: {confidence:.2%}")
