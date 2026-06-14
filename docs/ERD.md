# Mantoog — Entity Relationship Document

> **Schema source note:** The repository contains incremental SQL migrations under `supabase/migrations/` (ALTER TABLE only). Core table definitions predate these migrations and are **not** checked into the repo. Column definitions below are reconstructed from application code, migrations, and runtime usage. Types use PostgreSQL conventions. Verify against your live Supabase schema if anything diverges.

---

## Entity overview

```
auth.users (Supabase Auth)
    │
    └── merchants (1:1, merchants.id = auth.users.id)
            │
            ├── stores (1:1 typical; merchant_id FK)
            │       │
            │       ├── products (store_id, merchant_id)
            │       │       └── landing_pages (1:1 per product typical)
            │       │
            │       ├── orders (store_id, merchant_id, product_id)
            │       │
            │       └── tiktok_connections (store_id, merchant_id; many advertisers per store)
            │
            └── order_credits (merchant_id; purchase/usage ledger)

aliexpress_products — standalone cache (no merchant FK; populated by cron)
```

**Storage (Supabase Storage, not a SQL table):** bucket `store-assets` — logos and product images.

**Database functions (RPC):** `increment_visits(lp_id uuid)` — atomically increments `landing_pages.visits`.

---

## merchants

Merchant profile. Primary key equals Supabase Auth user ID.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | NO | — | PK; FK → `auth.users.id` |
| email | text | YES | — | Set on signup |
| phone | text | YES | — | E.164-style with country code |
| full_name | text | YES | — | Editable in settings |
| created_at | timestamptz | YES | `now()` | Inferred |
| updated_at | timestamptz | YES | — | Set on settings save |

**Relationships:**
- `merchants.id` → `auth.users.id` (1:1)
- One merchant typically owns one `stores` row and many `products` / `orders` via `merchant_id`

---

## stores

Merchant storefront configuration. Created during `/dashboard/setup`.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | NO | `gen_random_uuid()` | PK |
| merchant_id | uuid | NO | — | FK → `merchants.id` |
| name | text | NO | — | Display name |
| slug | text | NO | — | URL segment: `/{slug}` |
| currency | text | NO | — | e.g. `EGP`, `SAR`, `AED` |
| language | text | YES | — | `ar` or `en` |
| logo_url | text | YES | NULL | Public URL from `store-assets` bucket |
| primary_color | text | YES | — | Brand accent hex |
| shipping_type | text | YES | — | `static` or `free` |
| static_shipping_cost | numeric | YES | NULL | Used when `shipping_type = static` |
| custom_domain | text | YES | NULL | Planned custom domain |
| theme | text | YES | `'classic'` | Migration: `classic`, `fashion`, `beauty`, `home` |
| meta_pixel_id | text | YES | NULL | Migration |
| tiktok_pixel_id | text | YES | NULL | Migration |
| address_mode | text | YES | `'text'` | Migration: `text` or `map` |
| show_quantity | boolean | YES | `false` | Migration: checkout quantity field |
| show_note | boolean | YES | `false` | Migration: customer note field |
| note_required | boolean | YES | `false` | Migration |
| location_required | boolean | YES | `false` | Map mode: pin required to submit |
| enable_location | boolean | YES | `false` | Legacy flag; falls back when `address_mode` unset |
| created_at | timestamptz | YES | `now()` | Inferred |
| updated_at | timestamptz | YES | — | Set on settings save |

**Relationships:**
- `stores.merchant_id` → `merchants.id`
- Referenced by `products.store_id`, `orders.store_id`, `landing_pages.store_id`, `tiktok_connections.store_id`

---

## products

Sellable items. Product URL uses **product UUID** as slug: `/{storeSlug}/{productId}`.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | NO | `gen_random_uuid()` | PK; used in public URL |
| store_id | uuid | NO | — | FK → `stores.id` |
| merchant_id | uuid | NO | — | FK → `merchants.id` |
| title | text | NO | — | |
| description | text | YES | — | Long description / AI copy |
| price | numeric | NO | — | Unit price |
| compare_at_price | numeric | YES | NULL | Strikethrough “was” price |
| currency | text | NO | — | Copied from store |
| images | jsonb / text[] | YES | — | Array of public image URLs |
| status | text | YES | `'active'` | e.g. `active` |
| source_platform | text | YES | — | `manual`, `url`, `aliexpress` |
| source_url | text | YES | NULL | Original scrape/import URL |
| ai_generated | boolean | YES | `false` | |
| shipping_type | text | YES | — | Per-product override: `static`, `free` |
| shipping_cost | numeric | YES | NULL | Migration; per-product shipping |
| sizes | jsonb / text[] | YES | NULL | Fashion theme size options |
| colors | jsonb | YES | NULL | `[{ name, hex }]` for themed layouts |
| variants | jsonb / text[] | YES | NULL | Beauty theme (e.g. `30ml`, `50ml`) |
| specs | jsonb | YES | NULL | Home theme key-value specs |
| created_at | timestamptz | YES | `now()` | |
| updated_at | timestamptz | YES | — | Set on product edit |

**Relationships:**
- `products.store_id` → `stores.id`
- `products.merchant_id` → `merchants.id`
- Referenced by `landing_pages.product_id`, `orders.product_id`

---

## landing_pages

One landing page per product (typical). Drives storefront content and visit tracking.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | NO | `gen_random_uuid()` | PK; passed to `/api/track-visit` |
| product_id | uuid | NO | — | FK → `products.id` |
| store_id | uuid | NO | — | FK → `stores.id` |
| merchant_id | uuid | NO | — | FK → `merchants.id` |
| headline | text | YES | — | Hero headline |
| subheadline | text | YES | — | Subtitle |
| cta_text | text | YES | — | Button label |
| sections | jsonb / text | YES | — | JSON string: `benefits`, `urgency_text`, `trust_text`, `description_long` |
| visits | integer | YES | `0` | Incremented via RPC or fallback update |
| ai_generated | boolean | YES | `false` | |
| published | boolean | YES | `true` | |
| created_at | timestamptz | YES | `now()` | Inferred |
| updated_at | timestamptz | YES | — | Set on edit |

**Relationships:**
- `landing_pages.product_id` → `products.id`
- `landing_pages.store_id` → `stores.id`
- `landing_pages.merchant_id` → `merchants.id`

---

## orders

Customer COD orders placed on product landing pages.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | NO | `gen_random_uuid()` | PK |
| store_id | uuid | NO | — | FK → `stores.id` |
| merchant_id | uuid | NO | — | FK → `merchants.id` |
| product_id | uuid | NO | — | FK → `products.id` |
| customer_name | text | NO | — | |
| customer_phone | text | NO | — | |
| address_governorate | text | YES | — | Region/governorate (used in dashboard filters) |
| address_line1 | text | YES | — | Street address or map-derived address |
| address_country | text | YES | — | ISO-ish: `EG`, `SA`, `AE` |
| quantity | integer | YES | `1` | Migration |
| note | text | YES | NULL | Migration; customer note |
| unit_price | numeric | NO | — | Product price at order time |
| total_price | numeric | NO | — | `unit_price × quantity + shipping` |
| currency | text | NO | — | |
| shipping_price | numeric | YES | `0` | |
| payment_method | text | YES | `'cod'` | Cash on delivery |
| status | text | YES | `'pending'` | See status values below |
| lat | numeric | YES | NULL | Map picker latitude |
| lng | numeric | YES | NULL | Map picker longitude |
| location_address | text | YES | NULL | Reverse-geocoded or pinned label |
| map_link | text | YES | NULL | Google Maps query URL |
| created_at | timestamptz | YES | `now()` | |
| updated_at | timestamptz | YES | — | Inferred |

**Status values used in app:** `pending`, `confirmed`, `processing`, `shipped`, `delivered`, `cancelled`, `returned`

**Relationships:**
- `orders.store_id` → `stores.id`
- `orders.merchant_id` → `merchants.id`
- `orders.product_id` → `products.id`

---

## order_credits

Order credit bundles per merchant. Each row is a credit transaction/bundle; app queries latest by `created_at`.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | NO | `gen_random_uuid()` | PK |
| merchant_id | uuid | NO | — | FK → `merchants.id` |
| credits_total | integer | NO | — | Credits added in this bundle |
| credits_used | integer | YES | `0` | Consumed credits |
| credits_remaining | integer | YES | — | Likely generated column or view: `credits_total - credits_used` |
| bundle_type | text | YES | — | e.g. `free`, `manual`, paid bundle id |
| price_paid | numeric | YES | `0` | Amount paid for bundle |
| created_at | timestamptz | YES | `now()` | |

**Relationships:**
- `order_credits.merchant_id` → `merchants.id`

---

## tiktok_connections

OAuth-linked TikTok ad advertiser accounts per store. Multiple advertisers per store; one marked `is_active`.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | NO | `gen_random_uuid()` | PK (inferred) |
| store_id | uuid | NO | — | FK → `stores.id` |
| merchant_id | uuid | NO | — | FK → `merchants.id` |
| advertiser_id | text | NO | — | TikTok advertiser ID |
| advertiser_name | text | YES | NULL | From TikTok API |
| access_token | text | NO | — | OAuth access token (sensitive) |
| refresh_token | text | YES | NULL | OAuth refresh token |
| scope | text | YES | NULL | Comma-joined OAuth scopes |
| currency | text | YES | NULL | Migration; cached advertiser currency |
| is_active | boolean | YES | `false` | Migration; only one active per store |
| status | text | YES | `'active'` | Set to `expired` on token failure |
| created_at | timestamptz | YES | `now()` | Inferred |
| updated_at | timestamptz | YES | — | Updated on OAuth callback / expiry |

**Unique constraint:** `(store_id, advertiser_id)` — used in OAuth upsert `onConflict`.

**Relationships:**
- `tiktok_connections.store_id` → `stores.id`
- `tiktok_connections.merchant_id` → `merchants.id`

---

## aliexpress_products

Global product cache for research/import. Not tied to merchants. Refreshed daily by cron.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | NO | `gen_random_uuid()` | PK (inferred) |
| product_id | text | NO | — | AliExpress item ID |
| title | text | YES | — | Arabic-translated title |
| image | text | YES | — | Image URL |
| price | numeric | YES | NULL | Promotion price |
| original_price | numeric | YES | NULL | |
| currency | text | YES | `'USD'` | |
| category | text | YES | — | Arabic category label |
| country | text | YES | `'ALL'` | |
| status | text | YES | `'active'` | `active` or `archived` |
| fetched_at | timestamptz | YES | `now()` | Sort key for API |

**Relationships:** None (standalone cache table).

---

## Helper / external entities

### auth.users (Supabase managed)

Standard Supabase Auth table. `merchants.id` mirrors `auth.users.id`.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| email | text | Login email |
| encrypted_password | text | Hashed |
| … | … | Other Supabase Auth columns |

### store-assets (Supabase Storage bucket)

| Path pattern | Purpose |
|--------------|---------|
| `logos/{userId}-{timestamp}.{ext}` | Store logos |
| `products/{userId}-{timestamp}-{random}.{ext}` | Product images |

---

## Foreign key relationships (summary)

| From table | Column | To table | Column | Cardinality |
|------------|--------|----------|--------|-------------|
| merchants | id | auth.users | id | 1:1 |
| stores | merchant_id | merchants | id | N:1 (typically 1:1) |
| products | store_id | stores | id | N:1 |
| products | merchant_id | merchants | id | N:1 |
| landing_pages | product_id | products | id | N:1 (typically 1:1) |
| landing_pages | store_id | stores | id | N:1 |
| landing_pages | merchant_id | merchants | id | N:1 |
| orders | store_id | stores | id | N:1 |
| orders | merchant_id | merchants | id | N:1 |
| orders | product_id | products | id | N:1 |
| order_credits | merchant_id | merchants | id | N:1 |
| tiktok_connections | store_id | stores | id | N:1 |
| tiktok_connections | merchant_id | merchants | id | N:1 |

**Logical unique constraints (from app behavior):**
- `stores.slug` — must be unique for public routing
- `tiktok_connections (store_id, advertiser_id)` — upsert conflict target
- At most one `tiktok_connections.is_active = true` per store (enforced in app, not necessarily DB)

---

## Indexes (recommended / inferred)

Not defined in repo migrations. Likely present in production:

- `stores.slug`
- `stores.merchant_id`
- `products.store_id`, `products.merchant_id`
- `orders.merchant_id`, `orders.created_at`, `orders.product_id`
- `landing_pages.product_id`
- `tiktok_connections.store_id`, `tiktok_connections (store_id, is_active)`
- `aliexpress_products.status`, `aliexpress_products.fetched_at`

---

## Migration history (in repo)

| File | Change |
|------|--------|
| `add_checkout_form_columns.sql` | Store checkout settings + order `quantity`, `note` |
| `add_store_theme_column.sql` | `stores.theme` |
| `add_store_pixel_columns.sql` | `stores.meta_pixel_id`, `stores.tiktok_pixel_id` |
| `add_product_shipping_columns.sql` | `products.shipping_cost`, `products.shipping_type` |
| `add_tiktok_connections_currency.sql` | `tiktok_connections.currency` |
| `add_tiktok_connections_is_active.sql` | `tiktok_connections.is_active` |
