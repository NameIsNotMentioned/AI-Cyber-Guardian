import os
import re
import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.metrics import accuracy_score

# Resolve paths robustly relative to this file's location
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)
MODEL_DIR = os.path.join(BASE_DIR, 'models')
MODEL_PATH = os.path.join(MODEL_DIR, 'phishing_model.pkl')

def get_dataset_path():
    candidates = [
        os.path.join(PROJECT_ROOT, 'dataset', 'messages.csv'),
        os.path.join(BASE_DIR, '..', 'dataset', 'messages.csv'),
        'dataset/messages.csv',
        '../dataset/messages.csv'
    ]
    for path in candidates:
        if os.path.exists(path):
            return os.path.abspath(path)
    return os.path.join(PROJECT_ROOT, 'dataset', 'messages.csv')

def train_model():
    """
    Trains a phishing detection model using a TF-IDF + Logistic Regression pipeline.
    """
    dataset_path = get_dataset_path()
    print(f"Loading dataset from: {dataset_path}")
    if not os.path.exists(dataset_path):
        raise FileNotFoundError(f"Dataset not found at {dataset_path}")

    df = pd.read_csv(dataset_path)

    # Map labels to binary: phishing=1, safe=0
    df['label_bin'] = df['label'].map({'phishing': 1, 'safe': 0})

    X = df['message']
    y = df['label_bin']

    # Split data
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # Build Pipeline
    # LogisticRegression is chosen over Naive Bayes because it handles
    # overlapping features better and provides well-calibrated probabilities
    # which we need for the risk_score.
    pipeline = Pipeline([
        ('tfidf', TfidfVectorizer(stop_words='english', lowercase=True, ngram_range=(1, 2))),
        ('clf', LogisticRegression(C=1.0, max_iter=200))
    ])

    print("Training model...")
    pipeline.fit(X_train, y_train)

    # Evaluate
    predictions = pipeline.predict(X_test)
    acc = accuracy_score(y_test, predictions)
    print(f"Model Training Complete. Accuracy: {acc:.2%}")

    # Save model
    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(pipeline, MODEL_PATH)
    print(f"Model saved to {MODEL_PATH}")

def predict(message: str) -> dict:
    """
    Predicts if a message is phishing using the saved ML model.
    """
    # Cache model at module level
    if not hasattr(predict, "_model"):
        try:
            predict._model = joblib.load(MODEL_PATH)
        except Exception:
            # Fallback path check
            alt_path = os.path.join('backend', 'models', 'phishing_model.pkl')
            if os.path.exists(alt_path):
                predict._model = joblib.load(alt_path)
            else:
                print(f"Model not found at {MODEL_PATH}. Please run 'python model.py' first.")
                return None

    # Get probability for phishing class (index 1)
    proba = predict._model.predict_proba([message])[0][1]
    risk_score = int(round(proba * 100))

    # Evaluate signals heuristically to enrich model prediction
    msg_lower = message.lower()
    urgency_words = ['urgent', 'immediately', 'now', '24 hours', 'action required', 'suspended', 'alert', 'warning', 'locked', 'overdue']
    has_urgency = any(w in msg_lower for w in urgency_words)
    has_url = bool(re.search(r'https?://|[a-zA-Z0-9.-]+\.(?:com|net|org|xyz|top|site|club|ru|info)', msg_lower))

    urgency_signal = min(100, (85 if has_urgency else 20) + (15 if risk_score > 60 else 0))
    url_signal = min(100, (85 if has_url else 10) + (15 if risk_score > 60 else 0))
    scam_signal = max(10, min(100, int(risk_score * 0.95)))

    verdict = "SAFE"
    if risk_score > 60:
        verdict = "DANGEROUS"
    elif risk_score > 30:
        verdict = "SUSPICIOUS"

    reasons = []
    if verdict != "SAFE":
        reasons.append({
            "title": "ML Pattern Classifier",
            "detail": f"Model classified content as {verdict.lower()} with {risk_score}% threat confidence."
        })
        if has_urgency:
            reasons.append({
                "title": "Urgency Trigger",
                "detail": "Message contains high-pressure psychological urgency phrases."
            })
        if has_url:
            reasons.append({
                "title": "Embedded Hyperlink",
                "detail": "Contains hyperlinks directing users to external endpoints."
            })
    else:
        reasons.append({
            "title": "ML Clean Classification",
            "detail": f"Classified as benign/safe with {100 - risk_score}% confidence."
        })

    recommended_action = (
        "Do not click any links or provide credentials. Block sender and delete immediately."
        if verdict == "DANGEROUS"
        else "Verify sender identity through independent channels before responding or clicking."
        if verdict == "SUSPICIOUS"
        else "No immediate threat detected. Standard vigilance is recommended."
    )

    return {
        "verdict": verdict,
        "risk_score": risk_score,
        "signals": {
            "phishing": risk_score,
            "urgency": urgency_signal,
            "url_risk": url_signal,
            "scam_pattern": scam_signal
        },
        "reasons": reasons,
        "recommended_action": recommended_action
    }

if __name__ == "__main__":
    train_model()
