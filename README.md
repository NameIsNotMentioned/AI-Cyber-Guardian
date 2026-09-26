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
