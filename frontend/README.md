# Vastu360 Frontend (React + Vite)

Rebuilt from the original static `index.html` into a componentized React app.
Same design system, same copy, same booking → payment → report → chat flow —
now backed by React state instead of vanilla DOM manipulation.

## Run it

```
npm install
npm run dev
```

Opens at http://localhost:5173. It talks to the backend at `http://localhost:3000`
by default (see `src/config.js`) — make sure the backend from `Vastu360-fixed.zip`
is running first (`cd backend && npm start`).

To point at a different backend (e.g. once deployed), create a `.env` file:

```
VITE_BACKEND_URL=https://your-backend-url.example.com
```

## Structure

- `src/App.jsx` — page assembly
- `src/components/` — one component per section (Nav, Hero, Approach, Services,
  Booking, Chat, PaymentReturn, etc.)
- `src/data/questionSets.js` — the Bronze/Silver/Gold direction question sets
- `src/index.css` — full design system (ported 1:1 from the original CSS)

## Build for production

```
npm run build
```

Outputs static files to `dist/` — deploy that folder anywhere that serves
static files (Vercel, Netlify, S3 + CloudFront, etc.).
