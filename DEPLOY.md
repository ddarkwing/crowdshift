# CrowdShift — Deploy now

## Local verification
```bash
npm run check
npm start
```
Open `http://127.0.0.1:8080` and verify `/api/health`.

## Required production environment variable
Set `FEATHERLESS_API_KEY` in the hosting dashboard. Do **not** commit `.env`.
Optional model: `FEATHERLESS_MODEL=Qwen/Qwen2.5-7B-Instruct`.

## Render
Push the project to GitHub and create a new Render Web Service from the repository. The included `render.yaml` uses `npm start` and `/api/health`. Add `FEATHERLESS_API_KEY` as a secret environment variable.

## Railway
Push to GitHub, create a Railway project from the repository, and add `FEATHERLESS_API_KEY` in Variables. The included `railway.json` starts with `npm start`.

## Docker-compatible hosts
The included Dockerfile listens through the app's `PORT` environment variable and binds to `HOST=0.0.0.0` from `.env.example` / hosting environment.

## Before submitting
- `/` landing works
- `/tool` works
- `/api/health` returns `ok: true`
- Live Europe loads
- MapLibre / deck.gl render
- ActionCast badge says `Featherless · LIVE` when you present live AI
