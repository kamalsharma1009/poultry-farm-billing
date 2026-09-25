# Poultry Billing & Customer Management System
**Client:** Broilers Express — Wholesale & Retail Dealers  
**Location:** Motton Market, Jaysingpur  

A production-ready V1 poultry farm billing application designed specifically for quick, reliable daily billing operations.

---

## 🚀 Key Features

1. **Customer Management**
   - Auto-generated unique Customer IDs (`CUST-00001`, `CUST-00002`...)
   - Search by ID, Customer Name, Business/Shop Name, or Mobile Number
   - Activate / Deactivate customer status
   - Individual customer bill history

2. **Bill Generation (Core Workflow)**
   - Dynamic searchable customer selection
   - Quick inline link to add new customers if missing
   - Automatic calculation: `Amount = Weight (KG) × Rate (₹)`
   - Multi-item support (e.g. Broiler Chicken, Country Chicken)
   - Subtotal, Discount, Other Charges, and Grand Total
   - **Double-click submission protection** & **Backend calculation validation**
   - Sequential, atomic bill numbering starting from configurable number (default `68923`)

3. **Computerized PDF Invoicing**
   - Generated server-side using **Puppeteer** with dedicated HTML/CSS template
   - Visual structure modelled after the physical Broilers Express bill format
   - Clean printable layout without application UI elements
   - One-click PDF download & direct browser print

4. **WhatsApp Bill Sharing**
   - Direct click-to-chat integration (`https://wa.me/91<mobile>?text=...`)
   - Pre-fills professional bill message including customer name, bill number, date, total amount, and business address
   - Validates Indian mobile numbers and converts them to 91-prefixed format
   - Service abstraction ready for future WhatsApp Cloud API integration

5. **Financial Years & Auditability**
   - Auto-detects Indian Financial Year (e.g., `2026-27` from April 1 to March 31)
   - Tracks `createdBy` user IDs on customers and bills

6. **Zero Dummy Data Guarantee**
   - Database starts completely empty (0 customers, 0 bills, 0 transactions)
   - Empty states rendered everywhere with clear guidance for billing operators

---

## 🛠 Tech Stack

### Frontend
- **Framework**: React.js (Vite) — **100% JavaScript (No TypeScript)**
- **Styling**: Tailwind CSS (v4)
- **Routing**: React Router DOM (v7)
- **State & Data Fetching**: TanStack React Query (v5), Axios
- **Forms & Validation**: React Hook Form, Zod
- **Icons**: Lucide React

### Backend
- **Runtime**: Node.js & Express.js (CommonJS JavaScript)
- **Database ORM**: Prisma ORM (v6)
- **Authentication**: JWT & bcryptjs password hashing
- **PDF Engine**: Puppeteer
- **Security & Logging**: Helmet, CORS, Morgan

### Database
- **Production**: Neon PostgreSQL
- **Local Dev**: SQLite (`dev.db`) / PostgreSQL

---

## 📁 Directory Structure

```
Poultry/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma            # Local SQLite schema
│   │   └── schema.postgresql.prisma # Neon PostgreSQL production schema
│   ├── src/
│   │   ├── config/                  # Prisma client instance
│   │   ├── middleware/              # Auth & Error handling
│   │   ├── routes/                  # Express REST routes (auth, customer, bill, settings, dashboard)
│   │   ├── services/                # WhatsApp sharing service abstraction
│   │   ├── utils/                   # Puppeteer PDF generator & Financial Year helper
│   │   ├── scripts/                 # Seed admin & DB reset scripts
│   │   ├── app.js                   # Express application
│   │   └── server.js                # Server entrypoint
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/              # Header, Sidebar, EmptyState, LoadingSpinner
│   │   ├── context/                 # AuthContext
│   │   ├── layouts/                 # DashboardLayout
│   │   ├── lib/                     # Axios API client
│   │   ├── pages/                   # Login, Dashboard, Customers, Bills, Settings
│   │   ├── App.jsx                  # Main router setup
│   │   └── main.jsx                 # React root
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── README.md
```

---

## 🔑 Initial Admin Credentials

Upon initial server start, if no users exist in the database, the backend automatically seeds the system administrator account:

- **Email**: `admin@broilersexpress.com`
- **Password**: `Admin@123`

---

## ⚙️ Environment Variables Setup

### Backend (`backend/.env`)

```env
PORT=5000
DATABASE_URL="file:./dev.db" # Or Neon PostgreSQL: postgresql://<user>:<password>@<endpoint>.neon.tech/neondb?sslmode=require
JWT_SECRET="broilers_express_super_secret_jwt_key_2026_poultry_billing"
CLIENT_URL="http://localhost:5173"
```

### Frontend (`frontend/.env`)

```env
VITE_API_URL="/api"
```

---

## 🚦 How to Run Locally

### 1. Backend Setup

```bash
cd backend
npm install
npx prisma db push
npm run dev
```

The backend server will run on `http://localhost:5000`.

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will run on `http://localhost:5173`.

---

## 🌐 Production Deployment Guide

### Database (Neon PostgreSQL)
1. Create a PostgreSQL project on [Neon.tech](https://neon.tech).
2. Copy the connection string (e.g., `postgresql://user:pass@ep-xyz.neon.tech/neondb?sslmode=require`).
3. Replace `backend/prisma/schema.prisma` with `backend/prisma/schema.postgresql.prisma`.
4. Run `npx prisma db push` with `DATABASE_URL` set to your Neon URL.

### Backend (Railway / Render / Heroku)
1. Deploy the `backend/` directory.
2. Set Environment Variables (`DATABASE_URL`, `JWT_SECRET`, `PORT`, `CLIENT_URL`).
3. Deploy command: `npm start`.

### Frontend (Vercel)
1. Deploy the `frontend/` directory to Vercel.
2. Set Environment Variable: `VITE_API_URL=https://your-backend.railway.app/api`.
3. Build command: `npm run build`, Output directory: `dist`.

---

## 📞 Support & Business Info

**Broilers Express**  
Motton Market, Jaysingpur  
Mobile: 9326153310
