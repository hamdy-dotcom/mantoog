# Mantoog — Project Blueprint

Developer onboarding document for the Mantoog codebase. Last aligned with `main` as of June 2026.

---

## 1. Project overview

**Mantoog** (منتوج) is a bilingual (Arabic/English) e-commerce platform for MENA merchants. Merchants can:

1. Sign up and configure a branded store in minutes
2. Create AI-assisted product landing pages
3. Receive COD (cash-on-delivery) orders from customers
4. Manage orders, analytics, and credits from a dark-themed dashboard
5. Connect TikTok Ads accounts for live campaign management and reporting
6. Research winning products (AliExpress, Meta/TikTok spy tools, static market lists)

**Canonical domain:** [https://mantoog.com](https://mantoog.com)

**Primary users:**
- **Merchants** — `/dashboard/*`
- **Customers** — `/{storeSlug}` and `/{storeSlug}/{productId}` (public, no auth)
- **Admins** — `/admin` (email allowlist: `admin@mantoog.com`)

---

## 2. Tech stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js **16.2.7** (App Router) |
| UI | React **19.2.4**, Tailwind CSS **v4** |
| Language | TypeScript **5** |
| Database & Auth | Supabase (PostgreSQL + Auth + Storage) |
| Charts | Recharts **3.8.1** |
| AI | Anthropic Claude (`@anthropic-ai/sdk`) |
| Scraping | Cheerio, node-fetch |
| Excel export | xlsx **0.18.5** |
| Icons | lucide-react, inline SVGs |
| Fonts | Geist (via `next/font`) |
| Deploy | Vercel |

---

## 3. Architecture overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser / Client                         │
├──────────────┬──────────────────────┬───────────────────────────┤
│ Public pages │ Merchant dashboard    │ Admin panel               │
│ /, /login    │ /dashboard/*          │ /admin                    │
│ /[storeSlug] │ Sidebar + pages       │ Stats, merchants, orders  │
│ /privacy     │                       │                           │
└──────┬───────┴──────────┬───────────┴─────────────┬─────────────┘
       │                  │                         │
       ▼                  ▼                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js App Router (src/app)                  │
│  Server Components + Client Components ('use client')            │
│  API Routes (src/app/api/*)                                      │
│  Middleware proxy (src/proxy.ts) — auth cookie gate              │
└──────┬──────────────────┬──────────────────┬────────────────────┘
       │                  │                  │
       ▼                  ▼                  ▼
┌─────────────┐  ┌───────────────┐  ┌────────────────────────────┐
│  Supabase   │  │ External APIs │  │ Supabase Storage             │
│  PostgreSQL │  │ TikTok Biz API│  │ bucket: store-assets         │
│  Auth       │  │ Anthropic     │  │ (logos, product images)      │
│  RPC        │  │ RapidAPI      │  └────────────────────────────┘
└─────────────┘  │ AliExpress API│
                 │ Meta Ad Library│
                 └───────────────┘
```

### Auth model

- **Merchants:** Supabase Auth (email/password). Session cookies checked by `src/proxy.ts` for `/dashboard/*`.
- **Admin:** Same Supabase Auth; `/admin/*` protected by proxy; admin UI checks `ADMIN_EMAILS` allowlist client-side.
- **API routes:** Mix of user-scoped Supabase client (`@/lib/supabase/server`) and service-role client for privileged ops (TikTok tokens, admin credits, cron).

### Data access patterns

| Pattern | Where |
|---------|-------|
| Client-side Supabase | Dashboard pages (`createClient` from `@/lib/supabase/client`) |
| Server-side Supabase | API routes, TikTok lib (`@/lib/supabase/server`) |
| Service role | TikTok OAuth/callback, connections, set-active, admin credits, cron, track-visit fallback |

---

## 4. Folder structure

```
mantoog/
├── docs/                          # Project documentation (this file, ERD)
├── public/                        # Static assets (logo.svg, favicon.svg)
├── supabase/migrations/           # Incremental SQL migrations (ALTER TABLE)
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── [storeSlug]/           # Public store + product landing pages
│   │   ├── admin/                 # Admin panel + login
│   │   ├── api/                   # REST API routes (see §6)
│   │   ├── dashboard/             # Merchant dashboard pages
│   │   ├── login, signup/         # Auth pages
│   │   ├── privacy/               # Public privacy policy (TikTok review)
│   │   ├── theme-preview/         # Theme preview iframes for settings
│   │   ├── layout.tsx             # Root layout, metadata, LanguageProvider
│   │   ├── page.tsx               # Marketing homepage
│   │   └── globals.css            # Global Tailwind styles
│   ├── components/
│   │   ├── dashboard/             # Sidebar, TikTok table, filters, date picker
│   │   ├── icons/                 # TikTokIcon SVG
│   │   └── landing/               # FashionTheme, BeautyTheme, HomeTheme
│   ├── lib/
│   │   ├── dashboard/             # Date range utilities
│   │   ├── i18n/                  # LanguageContext, translations.ts
│   │   ├── supabase/              # client.ts, server.ts
│   │   └── tiktok/                # TikTok API server lib, types, mutations
│   └── proxy.ts                   # Route protection middleware
├── vercel.json                    # Cron schedule
├── package.json
├── next.config.ts
├── AGENTS.md / CLAUDE.md          # Agent rules (Next.js version warnings)
└── tsconfig.json
```

### Key directories explained

| Path | Purpose |
|------|---------|
| `src/app/[storeSlug]/[productSlug]/page.tsx` | **Largest file** — classic theme landing + checkout + map picker + pixels |
| `src/components/landing/*` | Themed landing page React components |
| `src/lib/tiktok/` | All TikTok Business API v1.3 integration logic |
| `src/components/dashboard/TikTokCampaignTable.tsx` | Multi-level ads table with bulk actions |
| `src/components/dashboard/DashboardFiltersBar.tsx` | Dashboard filter bar |
| `src/lib/i18n/translations.ts` | All EN/AR UI strings |

---

## 5. Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | **Yes** | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Yes** | Supabase anon key (client + some API routes) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | Service role key — TikTok tokens, admin credits, cron, visit tracking |
| `TIKTOK_CLIENT_KEY` | **Yes** (for TikTok) | TikTok app ID |
| `TIKTOK_CLIENT_SECRET` | **Yes** (for TikTok) | TikTok app secret |
| `TIKTOK_REDIRECT_URI` | **Yes** (for TikTok) | OAuth redirect URL (must match TikTok app settings) |
| `ANTHROPIC_API_KEY` | **Yes** (for AI features) | Claude — landing page generation, product analysis, AliExpress title translation |
| `TIKTOK_RAPIDAPI_KEY` | Optional | TikTok spy + top ads/products RapidAPI endpoints |
| `RAPIDAPI_KEY` | Optional | AliExpress cron refresh (RapidAPI datahub) |
| `ALIEXPRESS_APP_KEY` | Optional | AliExpress DS API import |
| `ALIEXPRESS_APP_SECRET` | Optional | AliExpress DS API import |
| `META_AD_TOKEN` | Optional | Meta ad library spy (`/api/ad-spy/meta`) |
| `CRON_SECRET` | **Yes** (for cron) | Bearer token for `/api/cron/refresh-aliexpress` |
| `NODE_ENV` | Auto | `production` enables secure OAuth cookies |

> **Security note:** TikTok connect/callback routes currently `console.log` secret lengths and keys. Remove before hardening production logs.

---

## 6. API routes (by feature)

### TikTok Ads (`/api/tiktok/*`)

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/tiktok/connect` | Start OAuth; redirect to TikTok portal |
| GET | `/api/tiktok/callback` | OAuth callback; upsert `tiktok_connections` |
| GET | `/api/tiktok/connections` | List connected advertisers for store |
| POST | `/api/tiktok/set-active` | Set active advertiser (`is_active`) |
| GET | `/api/tiktok/report` | Integrated performance report by date range |
| GET | `/api/tiktok/campaigns` | Multi-level entity data + daily sparklines |
| POST | `/api/tiktok/campaign/toggle` | Pause/resume campaign |
| POST | `/api/tiktok/campaign/budget` | Update campaign budget |
| POST | `/api/tiktok/entity/bulk` | Bulk pause/resume/budget |
| POST | `/api/tiktok/entity/bid` | Bid edits |
| POST | `/api/tiktok/entity/rename` | Rename entity |
| POST | `/api/tiktok/entity/schedule` | Schedule edits |
| POST | `/api/tiktok/entity/duplicate` | Duplicate entity |
| GET | `/api/tiktok/top-ads` | RapidAPI TikTok top ads (spy) |
| GET | `/api/tiktok/top-products` | RapidAPI TikTok top products (spy) |

### AI (`/api/ai/*`)

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/ai/generate-landing-page` | Generate landing page copy from product data |
| POST | `/api/ai/analyze-product` | Analyze scraped product for pricing/copy |

### Product research & import

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/aliexpress/products` | List cached `aliexpress_products` |
| POST | `/api/aliexpress/import` | Import AliExpress item into merchant `products` |
| POST | `/api/scrape-product` | Scrape product URL (AliExpress, etc.) |
| POST | `/api/scrape-bestsellers` | Scrape bestseller lists by source |
| POST | `/api/winning-products` | Static + AI winning product suggestions by country |
| POST | `/api/hot-on-mantoog` | Platform-wide hot products (API kept; UI removed from research) |
| POST | `/api/ad-spy/meta` | Meta ad library search |

### Operations

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/track-visit` | Increment `landing_pages.visits` |
| POST | `/api/admin/add-credits` | Admin: add order credits via service role |
| GET | `/api/cron/refresh-aliexpress` | Daily cron: refresh AliExpress product cache |

---

## 7. Dashboard pages

| Route | Description |
|-------|-------------|
| `/dashboard` | Unified analytics: KPIs, filters, daily orders chart, status breakdown, top products/regions, latest orders |
| `/dashboard/setup` | First-time store creation wizard |
| `/dashboard/products` | Product list |
| `/dashboard/products/new` | AI/manual product creation + landing page |
| `/dashboard/products/[id]` | Edit product + landing page content |
| `/dashboard/products/research` | Winning products research (AliExpress, spy tools) |
| `/dashboard/orders` | Order management, status updates, Excel export |
| `/dashboard/tiktok` | TikTok Ads dashboard + campaign table |
| `/dashboard/tiktok-spy` | TikTok ad spy browser |
| `/dashboard/billing` | Order credits balance and history |
| `/dashboard/settings` | Store info, theme, checkout builder, pixels, domain |

**Removed routes (no redirect):** `/dashboard/ads`, `/dashboard/analytics`

---

## 8. Data flow diagrams

### 8.1 Merchant signup → store setup

```
User visits /signup
    │
    ▼
supabase.auth.signUp({ email, password, phone })
    │
    ▼
merchants.upsert({ id: user.id, email, phone })
    │
    ▼
Redirect → /dashboard/setup
    │
    ▼
Multi-step wizard:
  1. Store name
  2. Currency + language
  3. Logo upload → store-assets bucket
  4. Shipping type + cost
    │
    ▼
stores.insert({ merchant_id, name, slug, currency, language, logo_url, ... })
    │
    ▼
Redirect → /dashboard
```

### 8.2 Product creation

```
Merchant → /dashboard/products/new
    │
    ├─ Mode: URL scrape
    │     POST /api/scrape-product → images, title, price
    │     POST /api/ai/generate-landing-page → headline, benefits, CTA, etc.
    │
    └─ Mode: Manual entry
    │
    ▼
Upload images → store-assets bucket
    │
    ▼
products.insert({ store_id, merchant_id, title, price, images, sizes, colors, ... })
    │
    ▼
landing_pages.insert({ product_id, headline, subheadline, sections JSON, published: true })
    │
    ▼
Public URL: /{store.slug}/{product.id}
```

### 8.3 Customer order (checkout)

```
Customer visits /{storeSlug}/{productId}
    │
    ▼
Load: stores, products, landing_pages (client Supabase)
    │
    ▼
POST /api/track-visit { landing_page_id } → visits++
    │
    ▼
Render theme component based on store.theme:
  classic → inline in page.tsx
  fashion → FashionTheme.tsx
  beauty  → BeautyTheme.tsx
  home    → HomeTheme.tsx
    │
    ▼
Checkout form (dynamic from store settings):
  - address_mode: text fields OR map pin (Leaflet)
  - show_quantity, show_note, note_required
  - location_required (map mode)
    │
    ▼
orders.insert({
  store_id, merchant_id, product_id,
  customer_name, customer_phone,
  address_governorate, address_line1,
  quantity, note, unit_price, total_price,
  lat, lng, location_address, map_link,
  payment_method: 'cod', status: 'pending'
})
    │
    ▼
Fire pixel events: fbq (Meta), ttq (TikTok) if configured
    │
    ▼
Show order confirmation
```

### 8.4 Dashboard analytics (filtered)

```
/dashboard loads all orders + products + landing_pages (client)
    │
    ▼
DashboardFiltersBar:
  date range (default: last 14 days)
  product, region, status
    │
    ▼
applyOrderFilters() — client-side AND logic
    │
    ▼
Derived metrics:
  KPIs, ordersByDay chart, status breakdown,
  top products (with CVR), top regions, latest 5 orders
```

### 8.5 TikTok Ads integration

```
Merchant → Settings or /dashboard/tiktok
    │
    ▼
GET /api/tiktok/connect
  - Verify auth + store
  - Build state = nonce.storeId.userId
  - Set tiktok_oauth_state cookie
  - Redirect → TikTok OAuth portal
    │
    ▼
TikTok redirects → GET /api/tiktok/callback?auth_code&state
  - Validate state cookie
  - POST TikTok /oauth2/access_token/
  - Fetch advertiser list + currency
  - upsert tiktok_connections (store_id, advertiser_id)
  - Redirect → /dashboard/tiktok?tiktok=connected
    │
    ▼
/dashboard/tiktok
  - GET /api/tiktok/connections → account selector
  - POST /api/tiktok/set-active → is_active flag
  - GET /api/tiktok/report?start_date&end_date → hero charts
  - GET /api/tiktok/campaigns?... → TikTokCampaignTable
    │
    ▼
Inline edits / bulk actions:
  POST /api/tiktok/campaign/* or /api/tiktok/entity/*
  - resolveActiveConnection() → access_token
  - TikTok Business API v1.3 mutation
  - On auth error (40001, 401xx): markConnectionExpired() → reauth_required
    │
    ▼
UI shows ReauthBanner → link to /api/tiktok/connect
```

---

## 9. Theme system

### Available themes

| `stores.theme` | Renderer | Notes |
|----------------|----------|-------|
| `classic` | `[productSlug]/page.tsx` inline | Default; full-featured legacy layout |
| `fashion` | `FashionTheme.tsx` | Sizes + colors selectors, apparel-focused |
| `beauty` | `BeautyTheme.tsx` | Variant sizes (ml), beauty aesthetic |
| `home` | `HomeTheme.tsx` | Specs table, home goods aesthetic |

### Theme selection

- Configured in `/dashboard/settings` → Store tab
- Preview via `/theme-preview/{theme}` (dummy product data)
- Settings shows iframe thumbnails linking to previews

### Shared checkout contract

All theme components receive `onSubmit({ name, phone, address, note, qty, selectedSize?, selectedColor? })` and delegate to the parent `handleSubmit()` in the product page, which writes to `orders`.

---

## 10. Checkout builder logic

Store-level settings in `stores` table control the checkout form:

| Setting | Column | Effect |
|---------|--------|--------|
| Address mode | `address_mode` | `text` = governorate + street fields; `map` = Leaflet pin picker |
| Legacy fallback | `enable_location` | If `address_mode` unset, treated as map when true |
| Location required | `location_required` | Map mode: blocks submit without pin |
| Show quantity | `show_quantity` | Shows qty stepper; `orders.quantity` > 1 |
| Show note | `show_note` | Shows customer note field |
| Note required | `note_required` | Validates note when shown |

**Shipping:** Product-level `shipping_type` / `shipping_cost` overrides store defaults. Total = `price × qty + shipping`.

**Order fields written:** See `docs/ERD.md` → `orders` table.

---

## 11. TikTok Ads — implementation details

### Library layout (`src/lib/tiktok/`)

| File | Role |
|------|------|
| `server.ts` | Connection resolution, reports, auth error detection, `markConnectionExpired` |
| `entities.ts` | Fetch/normalize campaigns, ad groups, ads, videos + daily metrics |
| `campaigns.ts` | Campaign-level API helpers |
| `mutations.ts` | POST helpers to TikTok API |
| `types.ts` | Client-safe types, Smart+ detection, permission matrix |
| `api-errors.ts` | Standardized API error responses |

### Smart+ campaigns

TikTok Smart+ campaigns have limited API mutability. The app:
- Detects via `is_smart_performance_campaign` / `campaign_automation_type`
- Shows purple Smart+ badge
- Disables unsupported inline controls
- Bulk actions skip Smart+ rows with toast: "X applied, Y skipped (Smart+)"

### Entity levels

`campaigns` → `adgroups` → `ads` → `videos` (drill-down in `TikTokCampaignTable`)

---

## 12. i18n

- `LanguageProvider` wraps the app in `layout.tsx`
- `useLang()` returns `{ lang, setLang, dir }` where `dir` is `rtl` or `ltr`
- All dashboard strings in `src/lib/i18n/translations.ts` (keys for EN + AR)
- Privacy policy has inline bilingual content in `privacy/page.tsx`

---

## 13. Deployment

### Vercel

- Standard Next.js deploy
- Environment variables set in Vercel project settings (see §5)
- `metadataBase: https://mantoog.com` in root layout

### Cron jobs (`vercel.json`)

```json
{
  "crons": [{
    "path": "/api/cron/refresh-aliexpress",
    "schedule": "0 7 * * *"
  }]
}
```

**Daily at 07:00 UTC:** Fetches AliExpress products via RapidAPI, translates titles with Claude Haiku, archives old rows, inserts fresh `aliexpress_products`.

**Auth:** `Authorization: Bearer {CRON_SECRET}`

### Supabase

- Run migrations in `supabase/migrations/` against production DB
- Ensure `store-assets` bucket is public-read for image URLs
- Ensure `increment_visits` RPC exists (or track-visit falls back to read-then-update)

### TikTok app configuration

- Redirect URI must match `TIKTOK_REDIRECT_URI`
- Privacy policy URL: `https://mantoog.com/privacy`

---

## 14. Admin panel

**Route:** `/admin` (protected by proxy + admin email check)

**Features:**
- Merchant list with store info and credit balances
- Order browser (500 recent) with product name column
- Excel export (`xlsx`) for orders
- Add credits via `POST /api/admin/add-credits`
- Product browser with visit counts
- Mobile-responsive tabs and scrollable tables

---

## 15. Order credits system

- `order_credits` table tracks bundles per merchant
- UI shows `credits_remaining`, `credits_total`, `credits_used`
- Low-credit warnings on dashboard (≤20) and sidebar
- Billing page shows transaction history
- Payment integration for self-serve purchase: **not yet implemented** (modal shows "coming soon")
- Admin can manually add credits

---

## 16. Known limitations

| Area | Limitation |
|------|------------|
| Dashboard CVR | Uses all-time `landing_pages.visits`, not filtered by date range |
| Dashboard filtering | Client-side only; all orders loaded at once |
| Order credits | No automatic decrement on new order visible in app code |
| Payment | Credit purchase UI is placeholder |
| Dead routes | `/dashboard/ads`, `/dashboard/analytics` return 404 |
| TikTok logs | Connect/callback log env var metadata to console |
| Bulk selection | `TikTokCampaignTable` may still have debug `console.log` |
| Schema docs | Base CREATE TABLE not in repo; ERD inferred from code |
| `ads*` i18n keys | Orphaned strings after ads page removal |
| Product slug | Uses UUID in URL, not human-readable slug |
| AliExpress scrape | Bestsellers route may return `aliexpress_blocked` |

---

## 17. Cleanup candidates

1. Remove debug `console.log` from TikTok OAuth routes and campaign table
2. Add redirects: `/dashboard/analytics` → `/dashboard`, `/dashboard/ads` → `/dashboard/tiktok`
3. Document env vars in README or `.env.example`
4. Export shared `DateRangeFilter` usage in TikTok page (currently duplicated helpers)
5. Server-side dashboard filtering for merchants with large order volumes
6. Replace TikTok spy sidebar external image with inline icon
7. Add base schema SQL migration to repo for reproducible setup
8. Scrub `credits_remaining` — confirm if DB generated column and document in migration

---

## 18. Quick reference — recent changes (June 2026)

For context when picking up active development:

- **TikTok Ads** — Full OAuth, dashboard, multi-level table, bulk actions, Smart+ handling, reauth flow
- **Dashboard** — Analytics merged; filter bar; area chart; top products/regions
- **Landing** — 4 themes, checkout builder, map picker, dynamic reviews
- **Admin** — Mobile responsive, Excel export, product column, credits API
- **Privacy** — `/privacy` for TikTok API review
- **Removed** — `/dashboard/ads`, `/dashboard/analytics`, Hot on Mantoog UI from research

See `docs/ERD.md` for full database schema reference.
