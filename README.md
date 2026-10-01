# NeuroNotes

NeuroNotes is a note and task capture app designed to help people collect thoughts, organize them, and focus on one next step. It has a React web frontend and a FastAPI backend.

## Features

- Supabase email authentication and session restoration
- Voice and typed capture flows backed by the API
- Typed brain dumps classified into inbox items
- Inbox filters, task completion, and archiving
- Focus flow, timer, and task roulette
- Mood check-in, companion chat, and activity/stat screens
- Settings, profile, and RevenueCat Web Billing paywall
- Responsive web app with reduced-motion support

Some screens and statistics currently use local/demo data. Provider-backed features require valid local configuration and have not been tested against your production accounts by this repository setup.

## Tech Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS, Zustand
- Authentication: Supabase Auth
- Billing: RevenueCat Web Billing (`@revenuecat/purchases-js`)
- Backend: Python, FastAPI, SQLAlchemy, PostgreSQL
- AI services: OpenAI Whisper transcription, Gemini classification, and Groq chat

## Project Structure

```text
.
├── neuronotes_frontend/
│   ├── src/
│   │   ├── App.tsx             # Active app routes and screen components
│   │   ├── components/         # Shared UI components
│   │   ├── screens/            # Additional screen implementations
│   │   ├── services/           # API, auth, and RevenueCat clients
│   │   └── store/              # Zustand application state
│   ├── public/                 # Static web assets
│   ├── android/                # Capacitor Android project
│   ├── .env.example            # Frontend environment template
│   └── package.json
└── neuronotes_backend/
    ├── main.py                 # FastAPI application
    ├── database.py             # Database engine and session setup
    ├── models.py               # SQLAlchemy models
    ├── routers/                # Auth, capture, chat, stats, billing APIs
    ├── services/               # AI classification and transcription
    ├── .env.example            # Backend environment template
    └── requirements.txt
```

## Prerequisites

- Node.js and npm
- Python 3.11 or newer
- A PostgreSQL database (for example, a Supabase project)
- Supabase project credentials for authentication
- Provider credentials for the AI or billing features you want to exercise

## Environment Variables

The frontend and backend use separate local environment files:

- `neuronotes_frontend/.env` — see [`neuronotes_frontend/.env.example`](neuronotes_frontend/.env.example)
- `neuronotes_backend/.env` — see [`neuronotes_backend/.env.example`](neuronotes_backend/.env.example)

The frontend template contains the API URL, Supabase URL and publishable key, and RevenueCat Web Billing public API key. These `VITE_` values are included in browser code; **never put a service-role key, private API key, or other server secret in a frontend variable**.

The backend template contains the PostgreSQL URL, Supabase URL, JWT signing secret, AI provider keys, optional RevenueCat webhook authorization, environment mode, and allowed frontend origins. Keep all real values in the local `.env` files or deployment secret manager.

## Installation

Install frontend dependencies:

```powershell
cd neuronotes_frontend
npm ci
Copy-Item .env.example .env
```

Create a Python environment and install backend dependencies:

```powershell
cd ..\neuronotes_backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

On macOS/Linux, use `python3 -m venv .venv`, activate with `source .venv/bin/activate`, and copy templates with `cp .env.example .env`.

## Running Locally

Start the backend in one terminal from `neuronotes_backend`:

```powershell
.\.venv\Scripts\Activate.ps1
uvicorn main:app --reload --port 8000
```

Start the frontend in another terminal from `neuronotes_frontend`:

```powershell
npm run dev
```

Vite serves the app at `http://localhost:4173`. The API health endpoint is `http://localhost:8000/health`. API documentation is enabled when the backend `ENVIRONMENT` is set to `development`.

## Configuration

After copying each `.env.example` to `.env`, replace placeholders with credentials for your own services. Set `DATABASE_URL`, `SUPABASE_URL`, and `SECRET_KEY` in the backend environment. Set the matching Supabase project URL and publishable key in the frontend environment. Configure the allowed frontend origin in `ALLOWED_ORIGINS`.

For email verification, add the local frontend callback URL (`http://localhost:4173/auth/callback`) to the Supabase Auth redirect allowlist and configure email delivery in Supabase. For billing, configure the RevenueCat Web Billing offering and public key. AI capture, transcription, and chat require the corresponding backend provider keys.

## GitHub Safety

Never commit `.env` files, API keys, passwords, tokens, database connection strings, or private keys. The root `.gitignore` excludes local environment files, databases, dependency folders, generated builds, IDE settings, and local development artifacts. Commit only the placeholder `.env.example` templates.
