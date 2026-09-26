# AI Cyber Guardian

AI Cyber Guardian is a phishing and scam message detector featuring a 3D cybersecurity-themed frontend.

## GitHub Pages

The frontend is deployed automatically to GitHub Pages whenever changes are pushed to `main`.
Visit [the published site](https://nameisnotmentioned.github.io/AI-Cyber-Guardian/) after the
first deployment workflow completes.

GitHub Pages hosts only the static frontend; it does not run the Python API. Without a separately
deployed backend, message scanning uses the frontend's demo fallback and URL checks use local
heuristics. To use the ML API, set `BASE_URL` in `frontend/js/api-config.js` to the URL of a
deployed backend that allows requests from the Pages site.

## How to Run

### Frontend
Open `frontend/index.html` directly in your browser or serve the `frontend` directory using any static web server.

# AI Cyber Guardian

AI Cyber Guardian is a phishing and scam message detector featuring a 3D cybersecurity-themed frontend.

## How to Run

### Frontend
Open `frontend/index.html` directly in your browser or serve the `frontend` directory using any static web server.

### Backend
1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\\Scripts\\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the server:
   ```bash
   python app.py
   ```

### Train the phishing model

The message API uses the trained TF-IDF classifier by default when its model
artifact exists, and falls back to the rule-based detector before training.
To reproduce training from the pinned public corpus:

```bash
python backend/fetch_training_data.py
python backend/model.py
```

The first command downloads and verifies the Apache-2.0 text corpus into the
git-ignored `dataset/external/` directory. The second prints stratified
holdout metrics and saves `backend/models/phishing_model.pkl` (also ignored).
The scanner can explicitly use the heuristic detector with
`POST /api/scan?engine=rules`.

The reported metrics are from a random holdout of this corpus and are not a
guarantee of real-world phishing detection accuracy. Keep human review and
official-channel verification in place for consequential messages.
