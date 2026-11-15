# BillionaireWatch.in — Buyer Handover & Operations Guide

Welcome to the technical and operational handover documentation for **BillionaireWatch.in**.  
This guide covers the project layout, deployment workflow, scheduled public-data valuation pipeline, environment variables, content expansion steps, and asset transfer items.

---

## 1. Project Structure

```text
./                                 # Web root deployed to hosting (Netlify / Cloudflare Pages / Vercel / Apache)
├── index.html                     # Pre-rendered SSR homepage (Top 10 Global, Top 5 India, Top 5 USA + <noscript> table)
├── about.html                     # Editorial methodology, update schedule & team roles
├── contact.html                   # Editorial/privacy/partnership desks + interactive Netlify contact form
├── privacy-policy.html            # GDPR, EU/UK Consent Mode v2 & AdSense cookie disclosure
├── disclaimer.html                # Independent educational estimates & non-affiliation statement
├── terms.html                     # Website terms of use
├── articles.html                  # Research & insights directory
├── analysis.html                  # Macro wealth & AI valuation analysis
├── spend-elon-money.html          # Interactive net worth simulator
├── 404.html                       # Smart 404 handler with clean slug/case redirects
├── sitemap.xml                    # Auto-generated XML sitemap with dynamic lastmod dates
├── robots.txt                     # Crawler directives pointing to https://billionairewatch.in/sitemap.xml
├── logo.png                       # Publisher brand mark referenced by JSON-LD & headers
├── _redirects                     # Netlify / Cloudflare Pages 301 canonical www & slug rules
├── netlify.toml                   # Netlify build command, headers, redirects & scheduled cron
├── .htaccess                      # Apache / LiteSpeed canonical host, HTTPS & clean URL rules
├── vercel.json                    # Vercel clean URLs & 301 canonical redirects
├── data/
│   ├── holdings-config.json       # Source of truth: SEC EDGAR / BSE-NSE share counts, private stakes, bio, FAQs
│   └── billionaires.json          # Cached real-time output read by client JS, SSR generator & serverless chat
├── profiles/
│   └── <id>.html                  # 17 auto-generated static billionaire profile pages + JSON-LD + Chart.js
├── insights/                      # Editorial research articles & insights hub
├── images/
│   ├── og-image.jpg               # Homepage Open Graph card (1200x630)
│   ├── og-*.jpg                   # Dedicated Open Graph cards for tools & insights
│   ├── og-billionaires/<id>.jpg   # Unique Open Graph card per billionaire profile
│   └── avatars/<id>.jpg           # Local compressed 400x400 portrait tiles (zero external placeholder latency)
├── assets/js/
│   ├── networth-updater.js        # Static-first cache hydration, live USD/INR toggle & SSR DOM preservation
│   ├── growth-sparkline.js        # Deferred D3.js sparklines rendered on cards
│   ├── wealth-bot.js              # Interactive AI wealth analyst widget
│   └── consent-banner.js          # EU/UK GDPR & Google Consent Mode v2 banner + preference modal
├── scripts/
│   ├── sync-networth.mjs          # Scheduled quote + FX fetcher -> writes billionaires.json & regenerates HTML/OG/sitemap
│   ├── generate-site.mjs          # Pre-renders index.html, builds all profiles/*.html, updates sitemap.xml & robots.txt
│   ├── generate-og-images.mjs     # Renders compressed JPG avatars & 1200x630 OG cards via ImageMagick
│   └── profile-template.html      # Reusable HTML template for individual billionaire pages
├── netlify/functions/
│   ├── chat.js                    # Grounded serverless chat endpoint (reads billionaires.json + Google Search)
│   └── update-networth.js         # Scheduled Netlify function checking FX & firing NETLIFY_BUILD_HOOK_URL
└── .github/workflows/
    └── update-networth.yml        # Daily GitHub Actions cron running sync-networth.mjs & committing updates
```

---

## 2. How to Deploy

### Option A: Netlify / Cloudflare Pages / Vercel (Recommended Static + Scheduled)
1. Point the hosting provider's **Publish / Root directory** to this folder (`public/live-site/` if deploying from the monorepo, or `.` if pushed as standalone repo).
2. **Build Command**: `node scripts/sync-networth.mjs` (refreshes public quotes/FX if stale, regenerates `index.html`, `profiles/*.html`, `sitemap.xml`, and `robots.txt`).
3. **DNS & Canonical Host**:
   - Point both `billionairewatch.in` (apex) and `www.billionairewatch.in` to your host.
   - `_redirects`, `netlify.toml`, `vercel.json`, and `.htaccess` enforce a **301 permanent redirect** from `https://www.billionairewatch.in/*` to `https://billionairewatch.in/:splat`.
4. **Contact Form (Netlify)**: The `#bwContactForm` in `contact.html` uses `data-netlify="true"`, capturing submissions automatically inside the Netlify Forms dashboard without exposing personal email addresses in client code.

---

## 3. Hosting, Domain & Account Transfer Checklist

When transferring ownership to the buyer, transfer or reconfigure the following accounts and records:
- [ ] **Domain Registrar (`billionairewatch.in`)**: Unlock `.in` domain, obtain EPP/Auth code, and push/transfer to the buyer's registrar; verify DNS `A`/`CNAME` and `TXT` records.
- [ ] **Git Repository & Hosting**: Transfer GitHub repository ownership and Netlify / Vercel / Cloudflare site project.
- [ ] **Google AdSense (`ca-pub-2776727085751679`)**: Replace the publisher ID across HTML files (`scripts/profile-template.html`, `index.html`, `insights/*.html`, and utility pages) and update `ads.txt` if present with the buyer's AdSense publisher ID.
- [ ] **Google Search Console & Analytics**: Add the buyer as Delegated/Verified Owner for `https://billionairewatch.in` (Domain property) and transfer any GA4 measurement property if connected.
- [ ] **Email Routing (`@billionairewatch.in`)**: Configure Cloudflare Email Routing, Zoho Mail, or Google Workspace aliases for `editorial@billionairewatch.in`, `privacy@billionairewatch.in`, and `partnerships@billionairewatch.in`.
- [ ] **GitHub Actions Secrets**: Re-enter repository secrets under `Settings -> Secrets and variables -> Actions` on the buyer's repository.

---

## 4. How the Real-Time Data Pipeline Works

The site uses a **compliant, static-first architecture** with zero scraping of third-party rankings:

1. **Regulatory Share Counts**: Public equity shareholdings and vested option strike prices from SEC Form 4 / Schedule 13D / Proxy Statements and Indian BSE/NSE promoter filings live in `data/holdings-config.json`.
2. **Public Market Quotes & FX**: On schedule (never blocking visitor initial HTML paint), `scripts/sync-networth.mjs` fetches:
   - Live USD/INR and USD/EUR reference FX rates from `open.er-api.com` (fallback `exchangerate-api.com`).
   - Public stock prices via optional `FINNHUB_API_KEY` (licensed US equity quotes) or public Yahoo Finance v8 chart JSON.
3. **Resilient Fallback & Caching**:
   - Honors a configurable cache TTL (`cacheTtlMinutes: 60`).
   - If any quote or FX endpoint fails or rate-limits, each holding falls back to the last verified price in `holdings-config.json` / `billionaires.json`, ensuring builds never emit broken or zeroed numbers.
   - Records `liveQuotesResolved`, `lastUpdated`, and `currencyUsdInrRate` inside `data/billionaires.json`.
4. **Static HTML & SEO Regeneration**: Immediately after updating `billionaires.json`, `sync-networth.mjs` runs `generate-og-images.mjs` and `generate-site.mjs` to rebuild pre-rendered `index.html`, all 17 `profiles/<id>.html` pages, OG cards, and `sitemap.xml`.

### Running the Pipeline Manually
```bash
# Respects 60-minute cache TTL if recently synced
node scripts/sync-networth.mjs

# Force immediate market quote fetch + full HTML/OG/sitemap rebuild
node scripts/sync-networth.mjs --force

# Regenerate static HTML & sitemap from cached billionaires.json without network calls
node scripts/generate-site.mjs
```

---

## 5. Environment Variables (Placeholders Only)

Set these in GitHub Actions Secrets, Netlify Environment Variables, or `.env` (never commit real secrets):

| Variable | Required? | Where Used | Purpose |
| :--- | :--- | :--- | :--- |
| `FINNHUB_API_KEY` | Optional | `scripts/sync-networth.mjs` | Licensed real-time US equity quote lookups (falls back to Yahoo v8 / cached prices if omitted). |
| `ALPHA_VANTAGE_API_KEY` | Optional | Backup pipeline integration | Placeholder for secondary equity feed expansion. |
| `GEMINI_API_KEY` | Optional | `netlify/functions/chat.js` | Powers optional AI Wealth Analyst replies (`wealth-bot.js` falls back cleanly to local deterministic Q&A if unset). |
| `NETLIFY_BUILD_HOOK_URL` | Optional | `netlify/functions/update-networth.js` | Netlify build hook URL triggered by the scheduled function to rebuild static HTML automatically. |

---

## 6. How to Add a New Billionaire

1. Open `data/holdings-config.json` and append a new entry to `"billionaires"` with `id`, `name`, `country`, `countryName`, `age`, `source`, `industries`, `bio`, `publicHoldings`, `privateAndOptionHoldings`, `history`, `composition`, and `faqs`.
2. Run:
   ```bash
   node scripts/sync-networth.mjs --force
   ```
3. The pipeline automatically generates `profiles/<id>.html`, `images/avatars/<id>.jpg`, `images/og-billionaires/<id>.jpg`, internal cross-links, homepage cards, and updates `sitemap.xml`.

---

## 7. Key Buyer Strengths

- **Full Static SSR & Crawler Accessibility**: All rankings, net worth breakdowns, `<noscript>` fallback tables, biographies, disclosures, and FAQs render in raw HTML before JavaScript executes.
- **17 Programmatic Profile Pages + Internal Link Graph**: Every ranked billionaire has a dedicated, indexable profile page cross-linked by Country, Sector, and Adjacent Global Ranks.
- **Legally Compliant Public-Filing Pipeline**: Valuations derive transparently from SEC EDGAR / BSE-NSE share counts and open market/FX APIs on a cached cron schedule — no scraping of third-party rankings or trademark misuse.
- **EU/UK GDPR & AdSense Consent Mode v2 Ready**: Ships with interactive Consent Mode v2 banner, persistent footer preferences link, domain desk emails, methodology page, and reserved ad slots (`ca-pub-2776727085751679`).
- **Low Operating Overhead**: Runs as static HTML/JSON on CDN edge hosting with automated GitHub Actions / Netlify cron updates and graceful fallback caching.
