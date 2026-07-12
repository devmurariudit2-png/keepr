# Deployment Guide — Keepr MVP

> **Stack**: FastAPI → Railway · Next.js → Vercel · PostgreSQL (Railway-managed)

---

## TL;DR Deploy Checklist

```
[ ] 1. Push code to GitHub
[ ] 2. Deploy PostgreSQL on Railway
[ ] 3. Deploy backend on Railway (set 4 env vars)
[ ] 4. Deploy frontend on Vercel (set 1 env var)
[ ] 5. Open deployed frontend → Login → click "Reset Demo Data"
[ ] 6. Done — share the Vercel URL
```

---

## 1. Push to GitHub

```bash
cd /Users/uditdevmurari/Downloads/keepr
git init          # if not already
git add .
git commit -m "feat: Keepr MVP — Days 1-5"
git remote add origin https://github.com/<your-username>/keepr.git
git push -u origin main
```

---

## 2. Deploy Backend on Railway

### 2a. Create PostgreSQL service
1. Go to [railway.app](https://railway.app) → **New Project** → **Provision PostgreSQL**
2. Copy the `DATABASE_URL` from the service's **Variables** tab.

### 2b. Create FastAPI service
1. In the same project → **New** → **GitHub Repo** → select your `keepr` repo
2. Set **Root Directory** → `backend`
3. Railway will auto-detect `nixpacks.toml` and use Python 3.11 + the Procfile start command.
4. Under **Variables**, add:

| Variable | Value |
|---|---|
| `DATABASE_URL` | *(paste from step 2a)* |
| `GEMINI_API_KEY` | *(your Gemini API key from Google AI Studio)* |
| `JWT_SECRET` | *(run `openssl rand -hex 32` locally and paste result)* |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60` |
| `FRONTEND_URL` | *(set after you know your Vercel URL — e.g. `https://keepr.vercel.app`)* |

5. Click **Deploy**. Wait ~2 min for build.
6. Copy the public domain: `https://keepr-backend-xxxx.up.railway.app`

> **Note**: After first deploy, Railway will auto-create DB tables via SQLAlchemy `create_all()`. Seed data is loaded by clicking "Reset Demo Data" in the dashboard UI.

---

## 3. Deploy Frontend on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project** → select `keepr` repo
2. Set **Root Directory** → `frontend`
3. Under **Environment Variables** add:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | *(Railway backend URL from step 2.6)* |

4. Click **Deploy**. Build takes ~1 min.
5. Copy your Vercel URL (e.g. `https://keepr.vercel.app`)
6. Go back to Railway → update `FRONTEND_URL` to the Vercel URL → redeploy.

---

## 4. Initialize Production Data

1. Open your Vercel URL → click **Login**
2. Use credentials: `sarah@keepr.ai` / `password123`

> ⚠️ **Change the password after first login** in production. The seed password is public.

3. On the dashboard, click **Reset Demo Data** (top-right button) to populate 20 demo leads.

---

## 5. Demo Credentials (local + prod)

| Field | Value |
|---|---|
| Email | `sarah@keepr.ai` |
| Password | `password123` |
| Company | Keepr Realty Demo |

---

## 6. Local Development

```bash
# Terminal 1 — Backend
cd keepr
PYTHONPATH=./backend ./backend/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000

# Terminal 2 — Frontend
cd keepr/frontend
npm run dev
```

Visit `http://localhost:3000`
