create extension if not exists "pgcrypto";

create table statements (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  source_bank text,                 -- 'commbank' | 'wise' | 'generic'
  created_at timestamptz not null default now()
);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  statement_id uuid not null references statements(id) on delete cascade,
  date date not null,
  amount numeric not null,
  description text,
  direction text not null check (direction in ('credit','debit')),
  category text,
  category_source text check (category_source in ('rule','ai')),
  is_exchange boolean not null default false,   -- linhas de conversão de moeda; excluídas dos totais de gasto
  raw jsonb
);

create index transactions_statement_idx on transactions (statement_id);
create index transactions_date_idx on transactions (date);
create index transactions_category_idx on transactions (category);

create table reports (
  id uuid primary key default gen_random_uuid(),
  statement_ids uuid[] not null,
  category_summary jsonb not null,   -- ReportAggregates: totalSpent, totalExchange, byCategory, byPeriod, top5, ruleCount, aiCount
  ai_insights jsonb,                 -- { insights: string[] }
  created_at timestamptz not null default now()
);
