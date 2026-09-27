# 🚀 Broilers Express — Version 1.0 Production Deployment Guide

This guide walks you through deploying **Version 1.0** of the **Broilers Express Poultry Billing System** today.

---

## 🏗️ Architecture Overview
* **Database:** Neon Serverless PostgreSQL
* **Backend:** Node.js / Express + Prisma ORM + Puppeteer (Render / Railway)
* **Frontend:** React + Vite + TailwindCSS (Vercel / Netlify)

---

## Step 1: Database Setup (Neon PostgreSQL)

1. Log in to [Neon Console](https://console.neon.tech/).
2. Create a new project (e.g. `broilers-express-db`).
3. Under **Dashboard > Connection Details**, select:
   * **Connection string**
   * **Pooled connection** (recommended for production)
4. Copy the connection string. It looks like:
   ```env
   postgresql://neondb_owner:YOUR_PASSWORD@ep-sample-123456-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
5. On your machine, apply the Prisma schema to Neon:
   ```powershell
   cd backend
   # In backend/.env, update DATABASE_URL with your Neon connection string
   npx prisma db push
   ```

---

## Step 2: Deploy Backend (Render / Railway)

### Option A: Render (Recommended & Free/Low Cost)
1. Go to [Render.com](https://dashboard.render.com/) and click **New > Web Service**.
2. Connect your GitHub repository.
3. Configure the service:
   * **Name:** `broilers-express-api`
   * **Root Directory:** `backend`
   * **Environment:** `Node`
   * **Build Command:** `npm install && npm run build`
   * **Start Command:** `npm start`
4. Add **Environment Variables**:
   * `PORT`: `5000` (or leave default Render port)
   * `DATABASE_URL`: *(Your Neon PostgreSQL connection string)*
   * `JWT_SECRET`: *(A secure random 32+ character string)*
   * `CLIENT_URL`: `https://your-frontend.vercel.app` *(Your Vercel URL)*
   * `NODE_ENV`: `production`
5. Click **Create Web Service**.
6. When deployment finishes, copy your backend URL (e.g. `https://broilers-express-api.onrender.com`).

---

## Step 3: Deploy Frontend (Vercel / Netlify)

### Option A: Vercel (Recommended)
1. Go to [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New > Project**.
2. Import your GitHub repository.
3. Configure project settings:
   * **Framework Preset:** `Vite`
   * **Root Directory:** Click `Edit` and select `frontend`
   * **Build Command:** `npm run build`
   * **Output Directory:** `dist`
4. Add **Environment Variable**:
   * `VITE_API_URL`: `https://broilers-express-api.onrender.com/api` *(Your backend URL + /api)*
5. Click **Deploy**.
6. The app is live! `vercel.json` is already configured for Single-Page-App (SPA) routing so all routes (`/bills`, `/bills/new`, `/customers`) load properly.

---

## Step 4: Verification Checklist

1. **Health Check:**
   Visit `https://broilers-express-api.onrender.com/health` — it should return:
   ```json
   {"success": true, "status": "OK"}
   ```
2. **First Login:**
   * Open your Vercel URL: `https://your-app.vercel.app`
   * Default Admin credentials (auto-seeded):
     * **Username:** `admin`
     * **Password:** `admin123`
   * Go to **Settings** immediately after login to change your password and store phone numbers.
3. **Bill Creation & Slip Test:**
   * Create a customer, then generate a test bill.
   * Verify PDF Download, WhatsApp Invoice link, and Print Slip.

---

## 💡 Troubleshooting
* **CORS Error:** Verify that `CLIENT_URL` on the backend matches your Vercel URL without a trailing slash (e.g. `https://broilers-express.vercel.app`).
* **404 on page refresh:** `vercel.json` and `_redirects` are already committed to `frontend/` to route all page requests to `index.html`.
