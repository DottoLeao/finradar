-- Moeda original de cada transação (pra permitir conversão histórica na exibição).
alter table transactions add column currency text not null default 'AUD';

-- category_source não usa mais 'ai' — categorização é 'rule' (heurística) ou 'manual'
-- (usuário reclassificou pela UI).
alter table transactions drop constraint transactions_category_source_check;
alter table transactions add constraint transactions_category_source_check
  check (category_source in ('rule', 'manual'));

-- RLS: leitura pública (app é uma demo sem login), escrita só via service_role
-- (admin.ts, que ignora RLS) — bloqueia qualquer escrita direta via REST API
-- usando a anon key exposta no browser.
alter table statements enable row level security;
alter table transactions enable row level security;
alter table reports enable row level security;

create policy "public read" on statements for select to anon, authenticated using (true);
create policy "public read" on transactions for select to anon, authenticated using (true);
create policy "public read" on reports for select to anon, authenticated using (true);
