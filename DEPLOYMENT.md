# Deployment Guide - AI Cyber Guardian

This guide describes how to deploy the AI Cyber Guardian suite to a production environment.

## 1. Frontend Deployment
The frontend is a static site and can be hosted on any static hosting service (Vercel, Netlify, Firebase Hosting, GitHub Pages).

### Deployment Steps:
1. Push the `frontend/` directory to a GitHub repository.
2. Connect the repository to Vercel or Netlify.
3. Set the root directory to `frontend/` in the deployment settings.

### Configuring the API URL:
To point the frontend to your deployed backend:
1. Open `frontend/js/scanner.js` and `frontend/js/dashboard.js`.
2. Change the `API_BASE_URL` constant (if centralized) or the hardcoded `http://localhost:5000` to your deployed backend URL (e.g., `https://ai-cyber-guardian-api.onrender.com`).

## 2. Backend Deployment
The Flask backend can be deployed to platforms like Render, Railway, or Heroku.

### Deployment Steps (Render):
1. Create a new **Web Service** on Render.
2. Connect your GitHub repository.
3. Set the following configurations:
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `gunicorn backend.app:app` (Note: you may need to install `gunicorn` in `requirements.txt`).

### Environment Variables:
If you add a database or secrets later, add them in the Render "Environment" tab.

## 3. Production Checklist
- [ ] Ensure `debug=False` in `app.py` for production.
- [ ] Set up a proper CORS policy to only allow your frontend domain.
- [ ] Pre-train the ML model (`python backend/model.py`) and commit the `.pkl` file to the repo.
