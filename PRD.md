# PRD v2 — FinRadar (Dashboard de Gastos com Categorização por IA)
**Autor:** Lorenzo Leão Dotto
**Tipo:** Projeto de portfólio
**Prazo:** 2 dias (16h úteis)
**Status:** Rascunho v2 — pivô do PRD original (CSV genérico → extratos bancários)
---
## 1. Visão Geral
Ferramenta web onde o usuário sobe um ou mais extratos bancários (formatos diferentes de banco pra banco) e recebe um dashboard com os gastos automaticamente categorizados (mercado, transporte, assinaturas, transferências, etc.) e um resumo em linguagem natural gerado por IA.
**Por que mudou:** CSV genérico é um exercício abstrato. Extrato bancário é um problema real, com dor real (ninguém sabe pra onde o dinheiro vai) e dados de verdade, que já vêm bagunçados e em formatos diferentes — isso é muito mais forte pra mostrar critério de engenharia.
**Pitch de uma frase:** "Suba o extrato de qualquer banco, veja pra onde seu dinheiro foi — sem categorizar nada na mão."
---
## 2. Contexto dos Dados Reais (usados como referência de formato)
Dois formatos bem distintos foram usados como base de teste:
### Formato A — CommBank (AU), sem cabeçalho
```
data, valor, descrição, saldo_após_transação
11/07/2026, "-1.00", "TRANSLINK TICKETING QLD AUS Card xx0816...", "+705.81"
```
- 4 colunas, sem header.
- Valores com sinal explícito (`+`/`-`) como string.
- Descrição é um texto livre cheio de ruído (nome do terminal, data de referência do lançamento, etc.).
### Formato B — Wise, com cabeçalho completo
```
"TransferWise ID", Date, "Date Time", Amount, Currency, Description,
"Payment Reference", "Running Balance", "Exchange From", "Exchange To",
"Exchange Rate", ..., "Transaction Type", "Transaction Details Type"
```
- 23 colunas, com header.
- Já vem com `Transaction Type` (`CREDIT`/`DEBIT`) e `Transaction Details Type` (`CARD`, `TRANSFER`, `CONVERSION`) — meio caminho andado pra categorização.
- Inclui conversões de moeda (BRL↔AUD) que não são "gasto" de verdade, e sim câmbio — precisa tratar separado.
**Implicação de arquitetura:** o parser não pode assumir um schema fixo. Precisa de um **adaptador por formato** (detecta o banco pelo shape do CSV) que normaliza tudo pra um schema interno comum antes de qualquer análise.
---
## 3. Escopo (o que ENTRA)
### 3.1 Fluxo principal
1. Usuário sobe 1+ arquivos CSV de extrato (ou usa os 2 exemplos pré-carregados).
2. Sistema detecta automaticamente qual formato é cada arquivo (CommBank, Wise, ou "genérico" como fallback).
3. Normaliza tudo pra um schema comum: `{ data, valor, descrição, tipo (crédito/débito), origem (banco) }`.
4. Categoriza cada transação (ver seção 4) em categorias como: Mercado, Transporte, Assinaturas, Transferências, Alimentação/Delivery, Câmbio, Outros.
5. Gera dashboard: gasto total, gasto por categoria (gráfico de pizza/barra), evolução no tempo (linha), maiores gastos individuais.
6. Chama a Anthropic API com o resumo categorizado (não as transações cruas) pra gerar 3-5 insights em texto (ex: "Transporte via Uber representou X% do seu gasto no período").
### 3.2 Categorização — abordagem híbrida (importante para o prazo)
Categorização 100% via LLM pra cada transação seria lento e caro. Abordagem em 2 camadas:
1. **Camada de regras (rápida, cobre ~80% dos casos):** dicionário de palavras-chave → categoria.
   - `UBER`, `TRANSLINK`, `TAXI` → Transporte
   - `COLES`, `WOOLWORTHS`, `IGA` → Mercado
   - `TRANSFER`, `PAYID`, `FAST TRANSFER` → Transferência
   - `CONVERSION`, `Exchange` → Câmbio
   - etc.
2. **Camada de IA (fallback, só pro que a regra não capturou):** manda só as descrições não-categorizadas (em lote, uma chamada só) pro Claude, pedindo categoria estruturada em JSON.
Isso mantém custo e latência baixos e ainda mostra "critério de engenharia" (não jogar tudo pra IA por preguiça).
### 3.3 Fora de escopo
- Login/autenticação de usuário.
- Suporte a mais de 2-3 formatos de banco (o objetivo é provar o conceito de adaptador, não suportar todo banco do mundo).
- Edição manual de categoria pelo usuário (fica como "próximo passo" no README).
- Detecção de gastos recorrentes/assinaturas via análise de padrão (mencionar como ideia futura, não implementar).
- Exportação de relatório em PDF.
- Qualquer forma de conexão bancária real (Open Banking, Plaid, etc.) — só upload de CSV.
---
## 4. Requisitos Técnicos
### Stack
- **Frontend:** Next.js 14 (App Router), Tailwind, Recharts
- **Backend:** Next.js API Routes
- **Storage/DB:** Supabase (Storage para os CSVs, Postgres para transações normalizadas + resultado)
- **IA:** Anthropic API (Claude Sonnet 4.6) — só para fallback de categorização e para o resumo final
- **Deploy:** Vercel
### Arquitetura do fluxo de dados
```
Upload CSV(s)
  → Detecta formato (heurística: nome/quantidade de colunas, presença de header)
  → Adaptador específico normaliza pro schema comum
  → Camada de regras categoriza por palavra-chave
  → Transações não-categorizadas vão em lote pro Claude (1 chamada, não 1 por transação)
  → Merge do resultado → salva no Supabase
  → Agrega por categoria/período → gera dados pros gráficos
  → Chamada separada ao Claude: resumo executivo baseado nos agregados (não nas transações cruas)
  → Renderiza dashboard
```
### Schema do banco (Supabase)
```sql
create table statements (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  source_bank text,           -- 'commbank' | 'wise' | 'generic'
  created_at timestamptz default now()
);
create table transactions (
  id uuid primary key default gen_random_uuid(),
  statement_id uuid references statements(id),
  date date not null,
  amount numeric not null,
  description text,
  direction text,              -- 'credit' | 'debit'
  category text,               -- categoria final
  category_source text,        -- 'rule' | 'ai'
  raw jsonb                    -- linha original, pra debug
);
create table reports (
  id uuid primary key default gen_random_uuid(),
  statement_ids uuid[],
  category_summary jsonb,       -- total por categoria
  ai_insights jsonb,
  created_at timestamptz default now()
);
```
### Detecção de formato (heurística simples, sem IA)
- Sem header + 4 colunas + coluna 1 é data (`dd/mm/yyyy`) → `commbank`
- Header contém `TransferWise ID` ou `Transaction Details Type` → `wise`
- Caso não bata com nenhum → `generic`: tenta inferir por nome de coluna (`date`, `amount`, `description` case-insensitive) — se falhar, erro amigável pedindo formato suportado.
---
## 5. Critérios de Aceite
- [ ] Sistema reconhece corretamente os 2 formatos de exemplo (CommBank e Wise) sem configuração manual.
- [ ] Consegue processar os dois arquivos juntos num único dashboard consolidado (soma os gastos de ambas as contas).
- [ ] Categorização por regras cobre a maioria das transações dos exemplos reais sem cair no fallback de IA a cada linha.
- [ ] Transações de câmbio/conversão (`CONVERSION`) não entram como "gasto" no total — são tratadas à parte.
- [ ] Dashboard mostra: total gasto, gasto por categoria (gráfico), evolução temporal, top 5 maiores transações.
- [ ] Resumo em texto da IA cita números reais do próprio extrato (não genérico).
- [ ] Erro amigável se o CSV não bater com nenhum formato conhecido.
- [ ] Deploy funcionando na Vercel.
- [ ] README explica o adaptador de formatos e a estratégia híbrida de categorização (esse é o diferencial técnico a vender).
---
## 6. Plano de Execução — 2 Dias
### Dia 1 — Parser, normalização e categorização
- Setup do projeto (Next.js, Tailwind, Supabase, SDK Anthropic)
- Upload de múltiplos CSVs
- Detecção de formato + adaptadores (CommBank, Wise)
- Normalização pro schema comum
- Camada de regras de categorização (dicionário de keywords)
- Fallback de categorização via Claude (lote único)
- Persistência no Supabase
- **Meta do fim do dia:** os 2 arquivos de exemplo processados e categorizados corretamente, mesmo sem UI bonita
### Dia 2 — Dashboard, insights e deploy
- Agregações (por categoria, por período)
- Gráficos com Recharts (pizza por categoria, linha temporal, ranking de maiores gastos)
- Chamada à IA pro resumo executivo
- Landing + upload UI + tratamento de erro
- Deploy na Vercel
- README + GIF de demo pro portfólio
---
## 7. Riscos e Mitigações
| Risco | Mitigação |
|---|---|
| Terceiro formato de banco aparecer nos testes e quebrar tudo | Fallback genérico por nome de coluna + mensagem de erro clara, sem crashar |
| Regras de categorização ficarem pobres/erradas | Aceitar que fallback de IA cobre o resto; não precisa ser perfeito, precisa ser demonstrável |
| Dados financeiros reais sendo usados como exemplo público | Anonimizar/mascarar valores e nomes antes de usar como dataset de demo público (ver seção 8) |
| Escopo crescer pra "todo banco do Brasil" | Trava explícita em 2-3 formatos no PRD |
---
## 8. Nota de Privacidade (importante antes de publicar)
Os arquivos usados como referência são extratos bancários reais. Antes de usar qualquer um deles como **dataset de demonstração público** no projeto no ar:
- Substituir nomes reais (ex: "Lorenzo leao dotto", "H PASIANI TANAMATI") por nomes fictícios.
- Ajustar ou embaralhar valores (mantendo a forma/distribuição, não os números exatos) se o extrato for usado publicamente.
- Mascarar números de conta e IDs de transação.
- Alternativa mais simples: gerar um dataset sintético com a mesma estrutura dos dois formatos, em vez de anonimizar o real — evita qualquer risco e ainda prova o conceito do adaptador.
---
## 9. Métricas de Sucesso (para o portfólio)
- Recrutador consegue subir os 2 arquivos de exemplo (ou os próprios) e ver resultado em <15s, sem cadastro.
- README explica claramente a arquitetura de adaptador de formato + estratégia híbrida de categorização — isso é o que diferencia de "só chamei uma IA pra tudo".
- Projeto no ar com link "View live", igual ao padrão do Torre Ativa no portfólio atual.
