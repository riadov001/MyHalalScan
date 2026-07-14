---
name: HalalScan halal_products seed strategy
description: How the internal Postgres halal_products table (Step-0 instant lookup in the API) is seeded from OpenFoodFacts, and OFF rate-limit/coverage quirks to expect when re-running the seed.
---

## What it's for
`halal_products` (Postgres, `lib/db/src/schema/halal-products.ts`) is the instant "Step 0"
lookup the API server (`artifacts/api-server/src/routes/halal.ts`) checks before ever
calling OpenFoodFacts or AI. Seeding it well means common products resolve instantly,
even if OFF/AI are slow, down, or rate-limited.

## Seed script
`scripts/src/seed-halal-products.ts` (`pnpm --filter @workspace/scripts run seed-halal`):
- HALAL rows: OFF `labels` search for `en:halal` (also catches certifier variants like
  `en:halal-avs` via `tag_contains=contains`) across many regional OFF mirrors (world, fr,
  de, it, es, be, gb, nl, at, ch, us, ma, dz, tn).
- HARAM rows: OFF `categories` search for pork/alcohol categories, same mirrors.
- On conflict, explicit HALAL certification always wins over a HARAM category match
  (protects against OFF mislabeling); see `protectExisting` param in `seedFromTag`.
- Supports `SEED_MIRRORS`, `SEED_SKIP_HALAL`, `SEED_SKIP_HARAM` env vars to split a full
  run into several shorter invocations — each pass is idempotent (upsert by barcode), so
  it's safe to resume/retry per-mirror.

## Why split into multiple invocations
**Why:** OFF's `/cgi/search.pl` returns HTTP 503 fairly often under load, and a full
14-mirror × (1 label + ~6 category) run comfortably exceeds a single 5-minute exec
timeout. Also: backgrounding the seed process with `nohup ... &` inside a single shell
command did NOT survive past that command's return in this sandbox — the process got
reaped/killed silently (and once even took the running dev workflows down with it via
SIGTERM). **How to apply:** run the seed synchronously in per-mirror or per-mode batches
(e.g. `SEED_MIRRORS=world,fr SEED_SKIP_HARAM=1 timeout 250 pnpm ...`), and always
restart/verify all workflows afterward — don't rely on background `&` for long-running
one-off scripts here.
