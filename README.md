# Vastu360

Full project: Node/Express backend + React (Vite) frontend.

## Quick start

**1. Backend** (in one terminal)
```
cd backend
npm install
cp .env.example .env
```
Edit `.env`:
- Add `ANTHROPIC_API_KEY` to enable the AI chat feature
- Leave `MOCK_PAYMENT=true` to test the full flow without real TNG Digital credentials

```
npm start
```
Runs on http://localhost:3000

**2. Frontend** (in a second terminal)
```
cd frontend
npm install
npm run dev
```
Runs on http://localhost:5173 and talks to the backend at localhost:3000 by default.

## What's inside

- `backend/` — Express API: booking submission, Vastu scoring, PDF report
  generation, Touch 'n Go payment (mock mode by default), AI chat (Claude via
  Anthropic API)
- `frontend/` — React + Vite site: landing page, booking form, payment return
  flow, report download, chat widget

See each folder's own README/comments for more detail — `backend/.env.example`
in particular documents every environment variable you'll need before going
live.

## Admin dashboard

A team-only dashboard lives at **`/admin`** on the frontend (e.g.
`http://localhost:5173/admin`). It gives the team a single place to:

- See live stats — total/paid/pending bookings, revenue, customers, and a
  14-day booking trend
- Search, filter, and page through every booking
- Open a booking to see its full Vastu score breakdown, uploaded floor plans,
  and chat transcript
- Mark floor plans as reviewed and correct an order's payment status by hand
  (e.g. for an offline/bank transfer payment)
- See every registered customer and their order counts

**Logging in:** set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `backend/.env`
(see `.env.example`) — the account is created automatically the next time the
backend starts. Sign in at `/admin` with those credentials. Change the
password before going live; anyone with it can see every customer's bookings,
floor plans, and chat history.

**Deploying:** if you host the built frontend as static files, make sure your
host rewrites unknown paths (like `/admin`) to `index.html`, the same as any
single-page app — Vite's dev server already does this automatically.
