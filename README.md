# ReasonLens

ReasonLens answers questions from the Engineering Physics document using the existing FAISS index and Gemini. The Next.js app calls its same-origin `/api/ask` route, which forwards the question to the FastAPI `/ask` endpoint. The Gemini key stays in the backend environment.

## Run locally

Install the backend requirements once in your Python environment:

```powershell
python -m pip install -r requirements.txt
```

Then start the FastAPI backend from the project root in one terminal:

```powershell
python -m uvicorn ml.api:app --reload --host 127.0.0.1 --port 8000
```

The backend needs its Python dependencies installed and `GEMINI_API_KEY` configured in the root `.env` file. The existing `data/vector_store/physics.index` and `metadata.json` are loaded at startup; no index rebuild is needed.

Start Next.js in another terminal:

```powershell
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The Next.js server uses `http://127.0.0.1:8000` by default. Set `REASONLENS_API_URL` if the backend runs at another address.

## Production

```powershell
npm run build
npm run start
```

Keep the FastAPI service running alongside Next.js. Configure `REASONLENS_API_URL` in the server environment when needed. Do not expose the Gemini key through a `NEXT_PUBLIC_*` variable.
