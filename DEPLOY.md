# Deployment Guide

## Quick Deploy Steps

### 1. Deploy Backend to Render

1. Go to [render.com](https://render.com) and sign up/login
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repo (or use public repo URL)
4. Configure:
   - **Name**: `dataroom-backend`
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `chmod +x build.sh && ./build.sh`
   - **Start Command**: `gunicorn app.main:app --bind 0.0.0.0:$PORT`

5. Add Environment Variables:
   ```
   FRONTEND_ORIGIN=https://your-app.vercel.app
   DATABASE_URL=(Render will auto-add this if you create a PostgreSQL database)
   ```

6. Create a PostgreSQL database:
   - Click **"New +"** → **"PostgreSQL"**
   - Name: `dataroom-db`
   - The DATABASE_URL will be auto-linked

7. Click **"Create Web Service"**

8. Copy your backend URL (e.g., `https://dataroom-backend.onrender.com`)

9. **IMPORTANT**: Update Google OAuth settings:
   - Go to Google Cloud Console → APIs & Services → Credentials
   - Edit your OAuth 2.0 Client
   - Add to **Authorized redirect URIs**:
     ```
     https://dataroom-backend.onrender.com/auth/google/callback
     ```
   - Add to **Authorized JavaScript origins**:
     ```
     https://dataroom-backend.onrender.com
     https://your-app.vercel.app
     ```

---

### 2. Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) and sign up/login
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repo
4. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`

5. Add Environment Variables:
   ```
   VITE_BACKEND_URL=https://dataroom-backend.onrender.com
   ```

6. Click **"Deploy"**

7. Copy your frontend URL (e.g., `https://your-app.vercel.app`)

8. Go back to Render and update:
   - Set `FRONTEND_ORIGIN=https://your-app.vercel.app`

---

### 3. Update Google OAuth (Final Step)

In Google Cloud Console, make sure you have:

**Authorized JavaScript origins:**
- `https://dataroom-backend.onrender.com`
- `https://your-app.vercel.app`

**Authorized redirect URIs:**
- `https://dataroom-backend.onrender.com/auth/google/callback`

---

## Environment Variables Summary

### Backend (Render)
| Variable | Value |
|----------|-------|
| `FRONTEND_ORIGIN` | `https://your-app.vercel.app` |
| `DATABASE_URL` | (auto-set by Render PostgreSQL) |
| `GOOGLE_REDIRECT_URI` | `https://dataroom-backend.onrender.com/auth/google/callback` (optional, auto-detected) |

### Frontend (Vercel)
| Variable | Value |
|----------|-------|
| `VITE_BACKEND_URL` | `https://dataroom-backend.onrender.com` |

---

## Troubleshooting

### "403 Access Denied" on Google Login
- Make sure your Render backend URL is in Google OAuth authorized redirect URIs
- Make sure your email is added as a test user (if app is in Testing mode)

### CORS Errors
- Verify `FRONTEND_ORIGIN` on Render matches your Vercel URL exactly

### Database Errors
- Check Render logs for PostgreSQL connection issues
- The free tier database may spin down after inactivity

