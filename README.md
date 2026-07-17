# FinRadar

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38BDF8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)

**Upload a bank statement from any bank, see where your money went — without categorizing anything by hand.**

A dashboard that ingests one or more bank statement CSVs (every bank exports differently), categorizes spending automatically through rules, offers an optional in-browser AI suggestion for what's left over, and generates an executive summary from the real numbers for the period — with zero cloud AI calls and zero per-request cost.

> 🔗 **Live:** [finradar-zeta.vercel.app](https://finradar-zeta.vercel.app)

---

## The real problem

A generic sample CSV is an abstract exercise. A bank statement is a real problem: every bank exports in its own format, with its own columns, ordering, and noise, and nothing is standardized. An app that assumes a fixed schema breaks the moment it sees a different bank.

Two genuinely different formats were used as the architectural reference:

| | CommBank (AU) | Wise |
|---|---|---|
| Header | None | Full, 23 columns |
| Columns | 4 (date, amount, description, balance) | 23, including `Merchant` (cleaned merchant name) and `Transaction Details Type` |
| Amount | Signed string (`"-1.00"`, `"+705.81"`) | Numeric |
| Currency exchange | Not applicable | `CONVERSION` rows (BRL↔AUD) — not spending, an exchange |

None of the real statements from these banks were used as public data — the files in [`data/sample/`](data/sample/) are **synthetic**, with fictional names and values, designed to reproduce the same structure and edge cases as the originals (including transactions that intentionally match no categorization rule).

---

## Architecture: format adapter

The parser never assumes a fixed schema. It detects the format heuristically and dispatches to the matching adapter:

```
Upload CSV(s)
  → lib/parsers/detect-format.ts   heuristic: header contains "TransferWise ID"?
                                    → wise. No header, 4 columns, column 0 is
                                    dd/mm/yyyy? → commbank. Header has date/
                                    amount/description? → generic. Else, error.
  → lib/parsers/{commbank,wise,generic}.ts
                                    → each normalizes to the same schema:
                                    { date, amount, currency, description,
                                    merchant?, direction, sourceBank,
                                    isExchange, raw }
  → deduplication                  transactions repeated across files in the
                                    same upload (overlapping statement periods)
                                    aren't inserted twice
  → lib/categorize/                rule-based categorization (see below)
  → Supabase (statements/transactions/reports)
  → /report/[id]                   dashboard, recomputed live from
                                    `transactions` on every load
```

Adding a new bank means writing one new parser (`lib/parsers/<bank>.ts`) that returns the same `NormalizedTransaction[]` — the rest of the pipeline doesn't change.

---

## Categorization: rules + optional local AI

No cloud AI call, ever — not for categorization, not for the summary. Three layers, all running in your own browser or on the server with no external API dependency:

1. **Rules first** ([`lib/categorize/rules.ts`](lib/categorize/rules.ts)) — a keyword dictionary per category (`UBER`/`TRANSLINK` → Transport, `COLES`/`WOOLWORTHS` → Groceries, `CONVERSION` → Exchange, `RENT PAYMENT` → Rent, `PAYROLL` → Income, `MEDICAL CENTRE` → Healthcare, etc). Covers the large majority of real-world cases, free and instant. On the sample dataset (`npm run process-samples`): **52 of 56 transactions (93%) match a rule**, no further step needed.

2. **Optional local AI suggestion for the rest** ([`lib/ai-local/`](lib/ai-local/)) — a "Suggest with local AI" button on the report page that downloads a small embedding model (`Xenova/multilingual-e5-small`, ~100MB, cached in the browser after the first run) and runs entirely client-side via [`@huggingface/transformers`](https://github.com/huggingface/transformers.js), inside a Web Worker (WebGPU with a WASM fallback). It combines two signals: a linear classifier trained offline on the same embeddings (`scripts/train-category-classifier.ts`, ~91% validation accuracy on an open dataset of 68k bank transactions) and cosine similarity against reference phrases per category — a suggestion only surfaces when both agree, otherwise it falls back to cosine similarity alone (more reliable for non-English text). Each suggestion appears as a chip the user accepts or dismisses — it never writes to the database on its own.

3. **Manual categorization** — any transaction can be reclassified directly in the report's transaction table, with search and category filtering.

**Exchange** transactions (`CONVERSION` on Wise) are flagged with `isExchange: true` and excluded from the spend total — they're shown separately because they're a currency conversion, not consumption.

---

## Executive summary

Generated by a deterministic template ([`lib/summary/build-summary.ts`](lib/summary/build-summary.ts)) from the aggregates that are already computed — biggest spending category, period-over-period trend, largest single transaction, how many are still uncategorized — no network call, no cost, no run-to-run variance.

---

## Other features

- **Historical currency conversion** — an AUD/USD/EUR/BRL/GBP selector on the report recalculates every value using the exchange rate on *that transaction's own date* (via [Frankfurter](https://frankfurter.dev), a free, keyless API).
- **i18n** — English by default, with a toggle for Portuguese; categories, the executive summary, and the entire interface are translated.
- **Upload deduplication** — uploading two statements with an overlapping period in the same batch doesn't duplicate the transactions they share (while preserving legitimate repeats within a single file).
- **Filter and search** across the transaction table.
- **Export to PDF** — via the browser's native print dialog ("Save as PDF"), styled through a print stylesheet. No PDF-generation library, no memory risk on mobile.

---

## Stack

- **Frontend:** Next.js 16 (App Router, Turbopack), React 19, Tailwind v4, shadcn/ui
- **Backend:** Next.js Route Handlers
- **Data:** Supabase (Postgres) — `statements`, `transactions`, `reports`
- **Local AI:** `@huggingface/transformers` (transformers.js), 100% client-side — no cloud AI API
- **Charts:** Recharts
- **Deploy:** Vercel

## Local setup

```bash
npm install
cp .env.example .env.local   # fill in the 3 variables below
```

`.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Apply the schema (`supabase/migrations/*.sql`) to your Supabase project — either via `supabase db push` (with `supabase link` authenticated) or by pasting the SQL directly into the dashboard's SQL Editor.

```bash
npm run dev                # http://localhost:3000
npm run process-samples    # runs the categorization pipeline on the 2 sample CSVs, no UI
npm run train-classifier   # retrains the local AI classifier (offline, optional)
```

## Out of scope (next steps)

- User login/authentication.
- Support for more than 2–3 bank formats — the goal here is to prove the adapter pattern, not to support every bank in the world.
- Recurring spend / subscription detection via pattern analysis.
- Real bank connections (Open Banking, Plaid) — CSV upload only.
- Deduplication across separate uploads (today it only compares files within the same upload — see the comment in [`app/api/statements/upload/route.ts`](app/api/statements/upload/route.ts)).
