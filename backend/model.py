"""Train and run the text-based phishing classifier."""

import json
import os
import re
from collections import Counter

import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import FeatureUnion, Pipeline


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)
MODEL_DIR = os.path.join(BASE_DIR, "models")
MODEL_PATH = os.path.join(MODEL_DIR, "phishing_model.pkl")
LOCAL_DATA_PATH = os.path.join(PROJECT_ROOT, "dataset", "messages.csv")
EXTERNAL_DATA_PATH = os.path.join(
    PROJECT_ROOT, "dataset", "external", "phishing_texts.json"
)


def load_training_data():
    """Load local examples and optional verified external text samples."""
    if not os.path.exists(LOCAL_DATA_PATH):
        raise FileNotFoundError(f"Training data not found: {LOCAL_DATA_PATH}")

    local = pd.read_csv(LOCAL_DATA_PATH)
    if not {"message", "label"}.issubset(local.columns):
        raise ValueError("dataset/messages.csv must contain message,label columns")
    frames = [local[["message", "label"]].copy()]

    if os.path.exists(EXTERNAL_DATA_PATH):
        with open(EXTERNAL_DATA_PATH, encoding="utf-8") as corpus_file:
            external_samples = json.load(corpus_file)
        external = pd.DataFrame(external_samples)
        if not {"text", "label"}.issubset(external.columns):
            raise ValueError("External corpus must contain text,label fields")
        external = external.rename(columns={"text": "message"})
        external["label"] = external["label"].map({0: "safe", 1: "phishing"})
        frames.append(external[["message", "label"]])

    data = pd.concat(frames, ignore_index=True)
    data["message"] = data["message"].fillna("").astype(str).str.strip()
    data["label"] = data["label"].astype(str).str.strip().str.lower()
    data = data[data["label"].isin(["safe", "phishing"]) & data["message"].ne("")]
    data["_normalized"] = data["message"].str.casefold()
    data = data.drop_duplicates("_normalized").drop(columns="_normalized")

    if data["label"].nunique() != 2:
        raise ValueError("Training requires both 'safe' and 'phishing' examples")

    counts = Counter(data["label"])
    print(f"Loaded {len(data):,} unique messages: {dict(counts)}")
    return data["message"], data["label"].map({"safe": 0, "phishing": 1})


def build_pipeline():
    """Use word and character n-grams to handle wording and obfuscated text."""
    features = FeatureUnion([
        (
            "word_ngrams",
            TfidfVectorizer(
                lowercase=True,
                strip_accents="unicode",
                ngram_range=(1, 2),
                min_df=2,
                max_features=180_000,
                sublinear_tf=True,
            ),
        ),
        (
            "character_ngrams",
            TfidfVectorizer(
                analyzer="char_wb",
                lowercase=True,
                ngram_range=(3, 5),
                min_df=2,
                max_features=220_000,
                sublinear_tf=True,
            ),
        ),
    ])
    classifier = LogisticRegression(
        C=2.0,
        class_weight="balanced",
        max_iter=1000,
        solver="liblinear",
        random_state=42,
    )
    return Pipeline([("features", features), ("classifier", classifier)])


def train_model():
    """Report held-out metrics, then train and save the final full-data model."""
    messages, labels = load_training_data()
    train_messages, test_messages, train_labels, test_labels = train_test_split(
        messages,
        labels,
        test_size=0.2,
        random_state=42,
        stratify=labels,
    )

    evaluation_model = build_pipeline()
    print(f"Training evaluation model on {len(train_messages):,} examples...")
    evaluation_model.fit(train_messages, train_labels)
    probabilities = evaluation_model.predict_proba(test_messages)[:, 1]
    predictions = (probabilities >= 0.5).astype(int)
    matrix = confusion_matrix(test_labels, predictions, labels=[0, 1])
    metrics = {
        "accuracy": accuracy_score(test_labels, predictions),
        "precision": precision_score(test_labels, predictions, zero_division=0),
        "recall": recall_score(test_labels, predictions, zero_division=0),
        "f1": f1_score(test_labels, predictions, zero_division=0),
    }
    print("Stratified 80/20 holdout metrics (positive class: phishing):")
    for name, value in metrics.items():
        print(f"  {name}: {value:.3f}")
    print(f"  confusion matrix [safe, phishing]: {matrix.tolist()}")

    final_model = evaluation_model
    print(f"Training final model on all {len(messages):,} unique examples...")
    final_model.fit(messages, labels)
    final_model.training_metadata = {
        "training_examples": int(len(messages)),
        "class_counts": {key: int(value) for key, value in Counter(labels).items()},
        "holdout_metrics": metrics,
        "thresholds": {"safe_max": 30, "suspicious_max": 60},
        "sources": ["dataset/messages.csv"] + (
            ["Hugging Face ealvaradob/phishing-dataset texts.json"]
            if os.path.exists(EXTERNAL_DATA_PATH)
            else []
        ),
    }

    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(final_model, MODEL_PATH, compress=3)
    print(f"Model saved to {MODEL_PATH}")
    return metrics


def _load_model():
    if hasattr(predict, "_model"):
        return predict._model
    if not os.path.exists(MODEL_PATH):
        print(f"Model not found at {MODEL_PATH}. Run 'python backend/model.py' first.")
        return None
    predict._model = joblib.load(MODEL_PATH)
    return predict._model


def predict(message: str) -> dict:
    """Return a model estimate plus human-readable indicators and guidance."""
    if not isinstance(message, str) or not message.strip():
        raise ValueError("Message must be a non-empty string")

    pipeline = _load_model()
    if pipeline is None:
        return None

    model_classes = list(pipeline.named_steps["classifier"].classes_)
    phishing_index = model_classes.index(1)
    probability = float(pipeline.predict_proba([message])[0][phishing_index])
    risk_score = int(round(probability * 100))

    if risk_score > 60:
        verdict = "DANGEROUS"
    elif risk_score > 30:
        verdict = "SUSPICIOUS"
    else:
        verdict = "SAFE"

    msg_lower = message.lower()
    urgency_words = (
        "urgent", "act now", "immediately", "limited time", "expires",
        "within 24 hours", "action required", "account suspended", "locked",
    )
    has_urgency = any(word in msg_lower for word in urgency_words)
    has_url = bool(re.search(r"https?://|www\.|\b[\w.-]+\.[a-z]{2,}\b", msg_lower))
    urgency_signal = min(100, (85 if has_urgency else 10) + (15 if risk_score > 60 else 0))
    url_signal = min(100, (85 if has_url else 10) + (15 if risk_score > 60 else 0))

    reasons = [{
        "title": "Text pattern analysis",
        "detail": f"The trained classifier estimates a {risk_score}% phishing risk from the message text.",
    }]
    if has_urgency:
        reasons.append({
            "title": "Urgency language",
            "detail": "The message pressures the reader to act quickly.",
        })
    if has_url:
        reasons.append({
            "title": "Link present",
            "detail": "The message contains a link; inspect its destination before opening it.",
        })

    recommended_action = (
        "Do not click any links or reply. Delete and report."
        if verdict == "DANGEROUS"
        else "Verify through an official channel before acting."
        if verdict == "SUSPICIOUS"
        else "No action needed. Stay alert for unexpected requests."
    )
    return {
        "verdict": verdict,
        "risk_score": risk_score,
        "signals": {
            "phishing": risk_score,
            "urgency": urgency_signal,
            "url_risk": url_signal,
            "scam_pattern": max(10, min(100, int(risk_score * 0.95))),
        },
        "reasons": reasons,
        "recommended_action": recommended_action,
    }


if __name__ == "__main__":
    train_model()
