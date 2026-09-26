# Signal Office

A tactile, editorial message-security demo. It reviews suspicious message text using the local Flask API when available, then falls back to a small client-side heuristic. The page is built with React, Vite, Anime.js, and `@samasante/liquid-glass`.

## Run locally

From this directory:

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. For API-backed results, run the AI Cyber Guardian Flask backend on `http://localhost:5000`; the page still works without it using its offline preview rules.

Create a production build with `npm run build` and preview it with `npm run preview`.
