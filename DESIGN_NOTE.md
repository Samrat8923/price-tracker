# INE Product Price Tracker — Technical Design Note

## 1. Executive Summary & Architecture Overview

The **INE Product Price Tracker** is a production-grade, full-stack web application engineered to monitor product pricing and stock availability on INE's hosted mock storefront (`https://demo.inelabteamdev.com/`).

### System Architecture

```
┌────────────────────────────────────────────────────────┐
│               Frontend: React + Vite                   │
│   • Search Bar & Storefront Catalog Browser            │
│   • Active Tracked Products Grid & Stock Badges        │
│   • Recharts Price Trend History & Scrape Audit Table  │
└──────────────────────────┬─────────────────────────────┘
                           │ REST (JSON)
┌──────────────────────────▼─────────────────────────────┐
│             Backend API: Node.js / Express             │
│   • GET /api/health                                    │
│   • GET /api/products/search?q= (In-Memory TTL Cache)   │
│   • POST, GET, DELETE /api/tracked-products            │
│   • POST /api/tracked-products/:id/scrape              │
│   • POST /api/cron/scrape (CRON_SECRET protected)      │
└────────────┬─────────────────────────────┬─────────────┘
             │                             │
┌────────────▼────────────┐   ┌────────────▼────────────┐
│   Database: Supabase    │   │  Scraper: Playwright    │
│       PostgreSQL        │   │       (Chromium)        │
│ • tracked_products      │   │ • Mouse-move gate solver│
│ • price_history         │   │ • Honeypot filtering    │
│ • scrape_logs           │   │ • Number format decoders│
└─────────────────────────┘   └────────────┬────────────┘
                                           │ Headed / Headless
                              ┌────────────▼────────────┐
                              │  Target Mock Storefront │
                              │ demo.inelabteamdev.com  │
                              └─────────────────────────┘
```

---

## 2. Storefront Reverse-Engineering & DOM Analysis

Prior to implementing any scrapers, deep inspection and bundle reverse-engineering of `https://demo.inelabteamdev.com/` were performed. Several sophisticated anti-scraping and dynamic rendering mechanisms were identified:

### 2.1. Client-Side Rendering (SPA)
Inspection of `GET https://demo.inelabteamdev.com/` confirmed that the initial HTML payload is an empty `<div id="root"></div>` with client-side React bundles (`index-B9UiQq4X.js` and `index-DrctpSuy.css`). Plain HTTP GET requests to product pages return no prices or stock markup.

### 2.2. Human Interaction & Mouse-Movement Gate
On product detail pages (`/product/:id`), prices are initially masked (`Price hidden`). Reverse engineering of the React component revealed an interaction tracker class `Ar`:
```javascript
new Ar({ minMoves: 8, minDwellMs: 600 })
```
- The `Reveal price` button (`button[aria-label="Reveal price"]`) is strictly disabled (`disabled={p !== null}`) until the user moves the mouse at least **8 times** with at least **40ms intervals** over the `.price-block` container and maintains a dwell time of at least **600ms**.
- **Engineered Solution**: In `server/src/scraper/scrapeEngine.js`, our Playwright scraper calculates the bounding box of `.price-block`, executes 14 coordinate-varying mouse movements, waits 750ms dwell time, verifies `isEnabled()`, and clicks the button.

### 2.3. WebAssembly Cryptographic Challenge
Clicking "Reveal price" invokes `Dr(productId, tracker.snapshot())`:
1. Fetches `/api/challenge`.
2. Executes a WebAssembly-based proof-of-work algorithm parameterized by the mouse movement entropy.
3. Submits the verification payload to `/api/verify` to acquire a short-lived bearer token.
4. Queries `/api/quote/:id` with the bearer token and decrypts the pricing payload via XOR keystream.
- **Engineered Solution**: Because this cryptographic verification is tightly bound to DOM interaction, headless Playwright executes the native challenge inside the browser runtime cleanly without fragile manual token emulation.

### 2.4. Honeypot / Decoy Element Elimination
Inspection of `.price-main` revealed intentional decoy markup designed to entrap naive CSS scrapers:
- `<span class="price-value" aria-hidden="true" style="display: none;">₹14,133</span>`
- `<span class="amount" data-price="true" aria-hidden="true" style="display: none;">₹16,171</span>`
- **Engineered Solution**: The scraper specifically ignores elements containing `aria-hidden="true"`, `display: none`, strikethrough styling (`line-through` for MRP), or `.amount` classes. It extracts the genuine price rendered dynamically inside the visible carrier element.

### 2.5. Dynamic Scrambled CSS Classes
Inspection of `GET /api/layout` revealed dynamic randomized CSS classes generated per session:
```json
{
  "classes": {
    "priceWrap": "pw-k2",
    "priceValue": "pv-k2",
    "mrp": "mr-k2",
    "sale": "sl-k2",
    "badge": "bd-k2",
    "stock": "st-k2"
  }
}
```
- **Engineered Solution**: Selectors in `scrapeEngine.js` avoid binding to transient randomized class names (like `.pv-k2`). Instead, the scraper targets semantic containers (`.price-block`, `.price-main`, `.stock-badge`, `h1`, button attributes) and computes visibility through DOM computed styles.

### 2.6. Localized Number Format Variations
The storefront cycles through diverse international and Indian currency formatting variations:
1. `spaced`: `₹15 335` (thousands separated by space)
2. `euro`: `₹15.335,00` (thousands separated by dot, comma decimal)
3. `trailing`: `₹15,335/- (incl. of all taxes)`
4. `unicode`: `₹１５３３５` (fullwidth Unicode digits `\uFF10-\uFF19`)
5. `nbsp`: `₹\u200B1\u00A05\u200B3\u200B3\u200B5` (interleaved zero-width spaces and non-breaking spaces)
6. `lakh`: `Rs. 15,335.00`
- **Engineered Solution**: `server/src/scraper/sanitize.js` applies `normalize('NFKD')`, strips zero-width characters (`\u200B-\u200D\uFEFF`), strips currency symbols and trailing text, resolves European dot/comma notation, and strips intra-digit whitespace to produce clean floating-point numbers.

---

## 3. Hybrid Scraping & Search Architecture

To satisfy Requirement 10:
> *"Prefer lightweight HTTP + HTML parsing if the storefront allows it, but use Playwright where JavaScript/asynchronous rendering genuinely requires it."*

- **Product Catalog Search**: Handled via lightweight HTTP GET requests to `https://demo.inelabteamdev.com/api/catalog?page=1&pageSize=60`. The backend maintains an in-memory cache with a 15-minute TTL. Search queries against partial or full names execute in **< 10ms**, providing instant user feedback without browser overhead.
- **Price & Stock Extraction**: Handled via Playwright with Chromium, as JavaScript execution, mouse interaction, and WebAssembly verification are mandatory.

---

## 4. Scraper Reliability, Validation & Resilience Strategy

| Failure Scenario | Mitigation Strategy |
| :--- | :--- |
| **Transient Network / HTTP 5xx** | Configurable retries (default 3) with exponential backoff and randomized jitter (`1500ms * attempt + random(500ms)`). |
| **Cookie Overlay Blocking Clicks** | DOM check for `.cookie-overlay` with automatic button dismissal, overlay removal, and `force: true` click handling. |
| **Slow Challenge Execution** | Navigation timeout set to 35s; state selector timeout set to 18s. |
| **Missing Price / Stock Extraction** | Strict dual-validation in `validateScrapedData()`. If either price <= 0 or stock is empty/placeholder, the attempt fails immediately. |
| **Database Protection on Failure** | If scraping fails after all retries, **no record is added to `price_history`**. Previous valid prices are preserved. |
| **Audit Traceability** | Every attempt (start, end, duration_ms, http_status, error_message) is saved into `scrape_logs` regardless of outcome. |
| **Memory / Zombie Process Leaks** | Guaranteed cleanup of browser pages and contexts in `finally` blocks. Shared browser instance with graceful SIGINT/SIGTERM shutdown hooks. |

---

## 5. Observable & Headed Mode

Requirement 9 specifies:
> *"Provide a headed/observable scraper mode using Playwright so the scraper can be watched."*

A standalone CLI script is provided in `server/src/scraper/headedScraper.js`:
- **Headed Observable Mode**:
  ```bash
  npm run scrape:headed -- https://demo.inelabteamdev.com/product/961
  ```
  Launches Chromium with `headless: false` and a `slowMo: 400ms` delay, visibly animating the mouse movements over the price card, clicking the reveal button, and displaying the extraction results in real-time.
- **Safe Test Mode (Dry Run)**:
  ```bash
  npm run scrape:test -- https://demo.inelabteamdev.com/product/961
  ```
  Demonstrates full scraping and retry mechanics without writing to production history.

---

## 6. Database Schema Design (Supabase PostgreSQL)

The database schema (`supabase/schema.sql`) implements three normalized relational tables:
1. `tracked_products`: Primary entity storing product metadata, URL, and active status.
2. `price_history`: Time-series ledger of validated prices and stock statuses linked via foreign key with `ON DELETE CASCADE`.
3. `scrape_logs`: Audit log of every scrape attempt with attempt index, status (`SUCCESS` or `FAILURE`), duration in milliseconds, HTTP code, and error trace.

### Optimized Indexes
- `CREATE INDEX idx_tracked_products_is_active ON tracked_products(is_active);`
- `CREATE INDEX idx_price_history_product_scraped ON price_history(tracked_product_id, scraped_at DESC);`
- `CREATE INDEX idx_scrape_logs_product_started ON scrape_logs(tracked_product_id, started_at DESC);`

---

## 7. Scheduled Cron Execution (cron-job.org)

Requirement 4 mandates:
> *"Run scraping every 2 hours through an external cron service."*

- **Endpoint**: `POST /api/cron/scrape`
- **Security**: Requires `CRON_SECRET` configured in the backend environment. Authorization is accepted via:
  - Header: `Authorization: Bearer <CRON_SECRET>`
  - Header: `x-cron-secret: <CRON_SECRET>`
  - Query Parameter: `?secret=<CRON_SECRET>`
- **Execution**: Iterates through all active products, runs resilient scraping, updates `price_history` and `scrape_logs`, and returns a detailed JSON execution summary.
- **cron-job.org Setup**: Configured with a recurring 2-hour interval pointing to `https://<your-render-app>.onrender.com/api/cron/scrape`.
