# Deployment Guide - AI Cyber Guardian

## Frontend: GitHub Pages

The repository's GitHub Actions workflow publishes the `frontend/` directory to GitHub Pages
whenever a commit is pushed to `main`. The site is available at
<https://nameisnotmentioned.github.io/AI-Cyber-Guardian/> after the first deployment completes.

You can also run **Deploy frontend to GitHub Pages** manually from the repository's Actions tab.

GitHub Pages serves static files only; it cannot run the Flask API. Until the API is deployed
separately, message scans use the frontend's demo fallback and URL scans use local heuristics.

To connect a deployed API, set `BASE_URL` in `frontend/js/api-config.js` to its `/api` URL, and
configure the API's CORS policy to allow the Pages site origin.

## Backend

Deploy the Flask backend separately on a Python-capable host. Install dependencies from
`backend/requirements.txt`, train the model with `python backend/model.py`, and start the API
with `python backend/app.py`. Configure the host to run the application without Flask debug mode
and make sure the generated model is available to the API process.
