# CareOps AI

Hospital workflow automation: patient booking, nurse check-in, doctor SOAP notes (Gemini), pharmacy WhatsApp (Twilio).

## Live URLs

| Service | URL | Status (Jun 2026) |
|---------|-----|-------------------|
| Frontend (Vercel) | https://careops-ai-gamma.vercel.app | Active (HTTP 200) |
| Backend (Railway) | https://careops-ai-production.up.railway.app | **Redeploy required** — returns 404 if service is stopped |
| Health check | `{BACKEND_URL}/health` | Expect `{"status":"ok","service":"CareOps API"}` when backend is running |

## Local development

### 1. Backend

```bash
cd backend
cp .env.example .env
# Fill FIREBASE_SERVICE_ACCOUNT_JSON, optional GEMINI_API_KEY and Twilio vars
npm install
npm run dev
```

Runs on **http://localhost:4000** (or `PORT` in `.env`).

### 2. Frontend

```bash
cd frontend
cp .env.example .env
# Paste Firebase web config from Firebase Console
npm install
npm run dev
```

Open **http://localhost:5173**

### 3. Demo accounts

Create users in **Firebase Authentication → Users**, then add matching **Firestore `users/{uid}`** docs:

| Email | `role` | Dashboard |
|-------|--------|-----------|
| `doctor@careops.com` | `doctor` | `/doctor` |
| `nurse@careops.com` | `nurse` | `/nurse` |
| `pharmacy@careops.com` | `pharmacist` | `/pharmacy` |
| `patient@careops.com` | `patient` | `/patient` |
| `ops@careops.com` | `ops` | `/ops` |

Each Firestore user document:

```json
{
  "name": "Display Name",
  "role": "doctor",
  "clinicId": "clinic-001"
}
```

Sync Firestore roles for `@careops.com` emails (non-destructive merge):

```bash
cd backend
node scripts/sync-users.js
```

Passwords are set only in Firebase Auth (not stored in this repo).

## End-to-end test checklist

1. **Patient** — profile + conditions/allergies → book appointment  
2. **Nurse** — today's list → check-in → vitals  
3. **Doctor** — live queue → notes → Generate SOAP → confirm to pharmacy  
4. **Pharmacy** — pending → Mark ready → WhatsApp (Twilio sandbox)  
5. **Ops** — `/ops` summary loads  
6. **i18n** — switch language on Login / Doctor / Pharmacy  

## Environment variables

See [backend/.env.example](backend/.env.example) and [frontend/.env.example](frontend/.env.example).

**Production:** set `VITE_*` on Vercel (redeploy after changes). Set backend vars on Railway. Set `ALLOWED_ORIGIN` to your Vercel URL.

### Production deploy checklist (Phase 8)

1. **Railway** — redeploy backend; confirm `/health` returns `ok`. Set `FIREBASE_SERVICE_ACCOUNT_JSON`, optional `GEMINI_API_KEY`, Twilio vars, `ALLOWED_ORIGIN=https://careops-ai-gamma.vercel.app`.
2. **Vercel** — set `VITE_API_URL` to Railway URL; redeploy after env changes.
3. **Firebase Console** — add Vercel domain to Authorized domains; Email/Password auth enabled.
4. **Smoke test** — login all 5 roles, run E2E checklist above against production.

## Twilio WhatsApp sandbox

1. Patient phone saved in profile (E.164 or 10-digit India mobile).  
2. Patient joins Twilio sandbox (send join code to `+1 415 523 8886`).  
3. `TWILIO_WHATSAPP_FROM=whatsapp:+14155238886` on Railway.

## Tests

```bash
cd backend && npm test
cd frontend && npm test && npm run build
```

CI runs on push via GitHub Actions (backend tests + frontend tests + build).

## Firestore indexes

Composite indexes for clinic-scoped queues are defined in [`firestore.indexes.json`](firestore.indexes.json). Deploy with Firebase CLI:

```bash
firebase deploy --only firestore:indexes
```

## Architecture

- React (Vite) + Tailwind frontend  
- Express API on Railway  
- Firebase Auth + Firestore + RTDB + Storage  
- Gemini for triage / SOAP / decision panel  
- Twilio for pharmacy WhatsApp  

All clinical writes go through the Express API (not direct Gemini/Twilio from the browser).
