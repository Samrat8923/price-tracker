# INE Product Price Tracker

A resilient, full-stack web application that tracks product prices and stock availability on the INE mock storefront ([demo.inelabteamdev.com](https://demo.inelabteamdev.com/)).

Built with **React**, **Vite**, **Tailwind CSS**, **Recharts**, **Node.js/Express**, **Playwright**, and **Supabase PostgreSQL**.

---

## 🌟 Key Features

1. **Storefront Search**: Search the INE mock storefront catalog by partial or full product name with instant (<10ms) responses via in-memory caching.
2. **One-Click Tracking**: Track any product and trigger an immediate initial price and stock scrape.
3. **Resilient Playwright Scraper**:
   - Reverse-engineered mouse-movement interaction solver (`minMoves: 8, minDwellMs: 600`) to unlock the "Reveal price" gate.
   - Executes the storefront's native WebAssembly cryptographic verification challenge.
   - Actively filters out decoy / honeypot price tags (`aria-hidden="true"`, `display: none`).
   - Normalizes complex international and Indian number formatting (`spaced`, `euro`, `trailing`, `unicode`, `nbsp`, `lakh`).
4. **Observable Headed Mode**: Visible browser execution with cursor movement and slowMo animation (`npm run scrape:headed`).
5. **Safe Dry-Run Test Mode**: Verify scraping and retry handling without polluting production history (`npm run scrape:test`).
6. **Strict Validation & Zero Data Corruption**: Never saves invalid or null prices; preserves previous valid price history if a scrape fails.
7. **Complete Audit Trail**: Records every single scrape attempt in `scrape_logs` with duration, HTTP status code, and error trace.
8. **Automated Scheduled Scraping**: External cron endpoint (`POST /api/cron/scrape`) protected by `CRON_SECRET` for 2-hour recurring scrapes via [cron-job.org](https://cron-job.org).
9. **Interactive Dashboard**: Recharts price trend visualization, stock availability badges, and scrape attempt logs.

---

## 📁 Project Structure

```
ine-price-tracker/
├── client/                     # React + Vite + Tailwind CSS frontend
│   ├── src/
│   │   ├── components/         # UI components (Header, SearchBar, PriceChart, etc.)
│   │   ├── api.js              # Backend API client
│   │   ├── App.jsx             # Main application dashboard
│   │   └── main.jsx
│   ├── .env.example            # Frontend environment variables template
│   ├── vercel.json             # Vercel SPA routing configuration
│   └── package.json
├── server/                     # Node.js + Express backend & Playwright scraper
│   ├── src/
│   │   ├── db/                 # Supabase client & repository (with local fallback)
│   │   ├── scraper/            # Playwright browser manager, engine, sanitizer
│   │   ├── services/           # Catalog search service & tracker orchestration
│   │   └── routes/             # REST endpoints (health, products, tracked, cron)
│   ├── test/                   # Automated unit & integration test suites
│   ├── render.yaml             # Render Blueprint specification
│   ├── .env.example            # Backend environment variables template
│   ├── index.js                # Server entrypoint
│   └── package.json
├── supabase/
│   └── schema.sql              # PostgreSQL DDL tables, indexes, constraints, and RLS
├── README.md                   # Setup, architecture & deployment documentation
├── DESIGN_NOTE.md              # Technical design note & reverse-engineering analysis
└── .gitignore                  # Git ignore rules
```

---

## 🚀 Quickstart & Local Setup

### Prerequisites
- Node.js 18+ (tested on Node v22)
- npm 9+

### 1. Database Setup (Supabase PostgreSQL)
1. Create a free project at [Supabase](https://supabase.com/).
2. Navigate to the **SQL Editor** in your Supabase dashboard.
3. Open `supabase/schema.sql` and run the script. This creates:
   - `tracked_products` table
   - `price_history` table
   - `scrape_logs` table
   - Performance indexes and Row Level Security policies.
4. Retrieve your project URL and `service_role` secret key from **Project Settings → API**.

> **Note**: For local development or testing without cloud credentials, the server automatically operates with a local JSON fallback (`server/data/local_db.json`). Once you supply your Supabase credentials, it seamlessly connects to live PostgreSQL.

### 2. Backend Setup
```bash
cd server
npm install

# Install Playwright browser binaries
npx playwright install chromium

# Copy environment template
cp .env.example .env
```

Configure `server/.env`:
```env
PORT=5000
CLIENT_URL=http://localhost:5173
CRON_SECRET=your_secure_cron_secret_here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SCRAPER_HEADLESS=true
SCRAPER_TIMEOUT_MS=35000
SCRAPER_MAX_RETRIES=3
STOREFRONT_BASE_URL=https://demo.inelabteamdev.com
```

Start the backend server:
```bash
# Production mode
npm start

# Or development mode with file watch
npm run dev
```
The server will start on `http://localhost:5000`.

### 3. Frontend Setup
In a new terminal:
```bash
cd client
npm install

# Copy environment template
cp .env.example .env
```

Start the Vite development server:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧪 Testing & Verification

### 1. Automated Test Suite
The project includes automated unit and integration tests covering data sanitization, live Playwright scraping, and all REST API endpoints:
```bash
cd server
npm test
```
**Tests Executed**:
- **Sanitizer Tests**: Validates cleaning of currency symbols, European number formats (`₹15.335,00`), spaced numbers (`₹15 335`), fullwidth Unicode digits (`１５３３５`), zero-width spaces (`\u200B`), and rejects invalid/negative inputs.
- **Live Scraper Tests**: Executes real headless Playwright scraping against `https://demo.inelabteamdev.com/product/961`, verifies genuine price and stock extraction, ensures honeypots are ignored, and verifies clean error handling for invalid 404 URLs.
- **API Tests**: Tests `GET /api/health`, `GET /api/products/search`, `POST /api/cron/scrape` (authentication enforcement), and full product tracking CRUD lifecycle.

### 2. Observable Headed Mode (Watch the Scraper)
To visibly watch Playwright open Chromium, move the cursor across the price card to satisfy the human-interaction gate, click "Reveal price", and extract the data:
```bash
cd server
npm run scrape:headed -- https://demo.inelabteamdev.com/product/961
```

### 3. Safe Test Mode (Dry Run)
Demonstrate retry and failure handling without modifying real database history:
```bash
cd server
npm run scrape:test -- https://demo.inelabteamdev.com/product/961
```

### 4. Frontend Production Build Verification
```bash
cd client
npm run build
```

---

## 📡 API Reference

| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Service and database health check | Public |
| `GET` | `/api/products/search?q=` | Search mock storefront catalog | Public |
| `POST` | `/api/tracked-products` | Track a product & run initial scrape | Public |
| `GET` | `/api/tracked-products` | List all tracked products | Public |
| `GET` | `/api/tracked-products/:id` | Get product details with history & logs | Public |
| `GET` | `/api/tracked-products/:id/history` | Get price & stock history | Public |
| `GET` | `/api/tracked-products/:id/logs` | Get scrape attempt audit logs | Public |
| `POST` | `/api/tracked-products/:id/scrape` | Trigger on-demand scrape | Public |
| `DELETE` | `/api/tracked-products/:id` | Untrack product and cascade records | Public |
| `POST` | `/api/cron/scrape` | Scheduled batch scrape for all active products | `Bearer <CRON_SECRET>` |

---

## 🌐 Deployment Guide

### 1. Database (Supabase PostgreSQL)
- Ensure all tables from `supabase/schema.sql` are created in your Supabase project.

### 2. Backend (Render)
1. Connect your repository to [Render](https://render.com/).
2. Create a new **Web Service** with the following settings:
   - **Root Directory**: `server`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npx playwright install --with-deps chromium`
   - **Start Command**: `node index.js`
3. Add the following **Environment Variables**:
   - `NODE_ENV`: `production`
   - `PORT`: `10000`
   - `SCRAPER_HEADLESS`: `true`
   - `SCRAPER_TIMEOUT_MS`: `35000`
   - `SCRAPER_MAX_RETRIES`: `3`
   - `STOREFRONT_BASE_URL`: `https://demo.inelabteamdev.com`
   - `CRON_SECRET`: Generate a secure random string (e.g. `openssl rand -hex 24`)
   - `SUPABASE_URL`: Your Supabase Project URL
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase Service Role Key
4. Deploy the service and note the Render URL (e.g. `https://ine-price-tracker-api.onrender.com`).

### 3. Frontend (Vercel)
1. Connect your repository to [Vercel](https://vercel.com/).
2. Set **Root Directory** to `client`.
3. Framework Preset: **Vite**.
4. Add **Environment Variable**:
   - `VITE_API_BASE_URL`: `https://ine-price-tracker-api.onrender.com` (your Render backend URL).
5. Deploy. The included `client/vercel.json` ensures client-side routing works properly.

### 4. Scheduled Scraping (cron-job.org)
1. Create a free account at [cron-job.org](https://cron-job.org/).
2. Click **Create Cronjob**:
   - **Title**: `INE Price Tracker 2-Hour Scrape`
   - **URL**: `https://<your-render-app>.onrender.com/api/cron/scrape`
   - **Execution Schedule**: **Every 2 hours** (`0 */2 * * *`)
   - **Request Method**: `POST`
   - **Headers**: Add `Authorization: Bearer <YOUR_CRON_SECRET>` (or add `?secret=<YOUR_CRON_SECRET>` to the URL).
3. Save and enable the cron job. It will trigger the external scraper every 2 hours as required.

---

## 🔒 Security & Secrets Management
- All secrets are managed via environment variables.
- Actual secrets and `.env` files are ignored via `.gitignore` and **never committed**.
- Only `.env.example` templates are tracked in version control.
