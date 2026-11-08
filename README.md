<div align="center">

# FinRadar

**Upload any bank's statement CSV and see where your money went.**

[![Live demo](https://img.shields.io/badge/Live_demo-finradar--zeta.vercel.app-2dbd82?style=flat-square&labelColor=0c0d0b)](https://finradar-zeta.vercel.app)

![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=flat-square&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React_19-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-000000?style=flat-square&logo=shadcnui&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)
![Transformers.js](https://img.shields.io/badge/Transformers.js-FFD21E?style=flat-square&logo=huggingface&logoColor=black)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat-square&logo=vercel&logoColor=white)

</div>

## About

Every bank exports statements in its own CSV format, with different columns, ordering and noise, so an app that assumes one fixed schema breaks as soon as you switch banks. FinRadar detects the format, normalises each file through a per-bank adapter, categorises transactions with rules first, and builds a dashboard and a plain-language summary straight from the numbers. Nothing is sent to an external model API: the optional classifier for leftover transactions runs entirely in the browser.

## Features

- **Format detection and adapters** for CommBank, Wise and a generic CSV with a date/amount/description header; adding a bank means adding one parser that returns the same normalised shape
- **Rules-first categorisation** with a keyword dictionary; on the bundled samples, 52 of 56 transactions match a rule (`npm run process-samples`)
- **Optional in-browser classifier** for what the rules miss: a multilingual embeddings model (`Xenova/multilingual-e5-small`) running in a Web Worker on WASM, combined with a linear classifier trained offline; suggestions are chips the user accepts or dismisses
- **Manual recategorisation** of any transaction, with search and category filter
- **Deterministic summary** built from the computed aggregates: top category, period trend, largest transaction and what still needs a category
- **FX handling**: Wise `CONVERSION` rows are flagged and kept out of the spending total
- **Historical currency conversion** (AUD, USD, EUR, BRL, GBP) at each transaction's date, via the key-less Frankfurter API
- **Deduplication** of overlapping statements uploaded together
- **Print-ready report**: "Export PDF" uses the browser's print dialog with a print stylesheet
- English and Portuguese interface

## Tech stack

| Area | Choice |
|---|---|
| App | Next.js 16 (App Router, Turbopack), React 19, TypeScript |
| UI | Tailwind CSS 4, shadcn/ui, Recharts |
| Backend | Next.js Route Handlers, Papa Parse |
| Data | Supabase (Postgres): `statements`, `transactions`, `reports` |
| In-browser classifier | `@huggingface/transformers` (Transformers.js) in a Web Worker |
| Deploy | Vercel |

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in the variables below
npm run dev                  # http://localhost:3000
```

Environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Apply the schema in `supabase/migrations/` to your Supabase project, with `supabase db push` or by pasting the SQL into the SQL Editor.

Other scripts:

```bash
npm run process-samples    # run the parsing and categorisation pipeline on the sample CSVs, no UI
npm run train-classifier   # retrain the in-browser classifier weights (offline, optional)
npm run lint
```

The CSVs in [`data/sample/`](data/sample/) are synthetic, with fictional names and values that reproduce the structure and edge cases of real exports.

## Project structure

```
app/                pages and route handlers (upload, transactions, locale)
app/report/[id]/    report dashboard, recalculated live from `transactions`
components/shared/  charts, tables, upload form, summary, currency and language switchers
lib/parsers/        format detection and per-bank adapters
lib/categorize/     keyword rules
lib/ai-local/       in-browser classifier (Web Worker, weights, reference phrases)
lib/summary/        deterministic summary template
lib/currency/       Frankfurter rates and conversion
supabase/           config and SQL migrations
scripts/            sample pipeline and classifier training
```

## Roadmap

Listed as out of scope for now:

- User accounts and authentication
- Recurring expense and subscription detection
- Deduplication across separate uploads (today only files in the same upload are compared)

## Author

**Lorenzo Leão Dotto**, full-stack developer.

[![Portfolio](https://img.shields.io/badge/Portfolio-lorenzodotto.com.br-2dbd82?style=flat-square&labelColor=0c0d0b)](https://lorenzodotto.com.br)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-lorenzodotto-2dbd82?style=flat-square&logo=linkedin&logoColor=white&labelColor=0c0d0b)](https://www.linkedin.com/in/lorenzodotto)
[![GitHub](https://img.shields.io/badge/GitHub-DottoLeao-2dbd82?style=flat-square&logo=github&logoColor=white&labelColor=0c0d0b)](https://github.com/DottoLeao)
