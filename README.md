# FinRadar

**Suba o extrato de qualquer banco, veja pra onde seu dinheiro foi — sem categorizar nada na mão.**

Dashboard que recebe um ou mais extratos bancários em CSV (formatos diferentes de banco pra banco), categoriza os gastos automaticamente por regras, com sugestão opcional de IA rodando 100% no navegador pro que sobra, e gera um resumo executivo determinístico a partir dos números reais do período — sem nenhuma chamada de IA em nuvem, sem custo por requisição.

> 🔗 Live: _[adicionar link após deploy]_

---

## O problema real

CSV genérico de exemplo é um exercício abstrato. Extrato bancário é um problema de verdade: cada banco exporta num formato diferente, sem padronização, com colunas, ordem e ruído próprios. Um app que assume um schema fixo quebra assim que troca de banco.

Dois formatos bem distintos foram usados como referência de arquitetura:

| | CommBank (AU) | Wise |
|---|---|---|
| Header | Nenhum | Completo, 23 colunas |
| Colunas | 4 (data, valor, descrição, saldo) | 23, incluindo `Merchant` (nome limpo do comerciante) e `Transaction Details Type` |
| Valor | String sinalizada (`"-1.00"`, `"+705.81"`) | Numérico |
| Câmbio | Não se aplica | Linhas `CONVERSION` (BRL↔AUD) — não é gasto, é câmbio |

Nenhum extrato real desses bancos foi usado como dado público — os arquivos em [`data/sample/`](data/sample/) são **sintéticos**, com nomes e valores fictícios, desenhados pra reproduzir a mesma estrutura e os mesmos casos-limite dos originais (incluindo transações que não batem com nenhuma regra de categorização, de propósito).

---

## Arquitetura: adaptador de formato

O parser nunca assume um schema fixo. Ele detecta o formato por heurística e despacha pro adaptador certo:

```
Upload CSV(s)
  → lib/parsers/detect-format.ts   heurística: header contém "TransferWise ID"?
                                    → wise. Sem header, 4 colunas, coluna 0 é
                                    dd/mm/yyyy? → commbank. Header com date/
                                    amount/description? → generic. Senão, erro.
  → lib/parsers/{commbank,wise,generic}.ts
                                    → cada um normaliza pro mesmo schema:
                                    { date, amount, currency, description,
                                    merchant?, direction, sourceBank,
                                    isExchange, raw }
  → deduplicação                   transações repetidas entre arquivos do
                                    mesmo upload (extratos com período
                                    sobreposto) não são inseridas 2x
  → lib/categorize/                categorização por regras (ver abaixo)
  → Supabase (statements/transactions/reports)
  → /report/[id]                   dashboard, recalcula tudo ao vivo a
                                    partir de `transactions`
```

Adicionar um banco novo é implementar um parser novo (`lib/parsers/<banco>.ts`) que devolve o mesmo `NormalizedTransaction[]` — o resto do pipeline não muda.

---

## Categorização: regras + IA local opcional

Nenhuma chamada de IA em nuvem em nenhum momento — nem pra categorizar, nem pro resumo. Duas camadas, as duas rodando no seu próprio navegador ou no servidor sem depender de API externa:

1. **Regras primeiro** ([`lib/categorize/rules.ts`](lib/categorize/rules.ts)) — dicionário de palavras-chave por categoria (`UBER`/`TRANSLINK` → Transporte, `COLES`/`WOOLWORTHS` → Mercado, `CONVERSION` → Câmbio, `RENT PAYMENT` → Aluguel, `PAYROLL` → Renda, `MEDICAL CENTRE` → Saúde, etc). Cobre a maioria dos casos reais, sem custo, instantâneo. No conjunto de exemplo (`npm run process-samples`): **51 de 56 transações (91%) caem numa regra**, sem precisar de nada além disso.

2. **Sugestão de IA local, opcional, pro que sobra** ([`lib/ai-local/`](lib/ai-local/)) — um botão no relatório ("Sugerir com IA local") que baixa um modelo de embeddings pequeno (`Xenova/multilingual-e5-small`, ~100MB, uma vez, cacheado no navegador) e roda inteiramente client-side via [`@huggingface/transformers`](https://github.com/huggingface/transformers.js), numa Web Worker (WebGPU com fallback pra WASM). Combina dois sinais: um classificador linear treinado offline sobre esses mesmos embeddings (`scripts/train-category-classifier.ts`, ~91% de acurácia de validação num dataset aberto de 68k transações bancárias) e a similaridade de cosseno contra frases de referência por categoria — só sugere quando os dois concordam, senão cai pro cosseno sozinho (mais confiável pra texto fora do inglês). Cada sugestão aparece como um chip que o usuário aceita ou descarta — nunca escreve no banco sozinha.

3. **Categorização manual** — qualquer transação pode ser reclassificada direto na tabela do relatório, com busca e filtro por categoria.

Transações de **câmbio** (`CONVERSION` no Wise) são marcadas com `isExchange: true` e excluídas do total de gasto — aparecem separadas porque não são consumo, são conversão de moeda.

---

## Resumo executivo

Gerado por template determinístico ([`lib/summary/build-summary.ts`](lib/summary/build-summary.ts)) a partir dos agregados já calculados (categoria com maior gasto, tendência período a período, maior transação, quantas ainda faltam categorizar) — sem chamada de rede, sem custo, sem variação entre execuções.

---

## Outras features

- **Conversão de moeda histórica** — seletor AUD/USD/EUR/BRL/GBP no relatório, recalcula usando a taxa de câmbio da *data de cada transação* (via [Frankfurter](https://frankfurter.dev), API gratuita sem chave).
- **i18n** — inglês por padrão, com toggle pra português; categorias, resumo executivo e toda a interface traduzidos.
- **Deduplicação no upload** — subir dois extratos com período sobreposto no mesmo upload não duplica as transações em comum (mas preserva repetições legítimas dentro de um único arquivo).
- **Filtro e busca** na tabela de transações.

---

## Stack

- **Frontend:** Next.js 16 (App Router, Turbopack), React 19, Tailwind v4, shadcn/ui
- **Backend:** Next.js Route Handlers
- **Dados:** Supabase (Postgres) — `statements`, `transactions`, `reports`
- **IA local:** `@huggingface/transformers` (transformers.js), 100% client-side — sem API de IA em nuvem
- **Gráficos:** Recharts
- **Deploy:** Vercel

## Setup local

```bash
npm install
cp .env.example .env.local   # preencher as 3 variáveis abaixo
```

`.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Aplicar o schema (`supabase/migrations/*.sql`) no projeto Supabase — via `supabase db push` (com `supabase link` autenticado) ou colando o SQL direto no SQL Editor do painel.

```bash
npm run dev                # http://localhost:3000
npm run process-samples    # roda o pipeline de categorização nos 2 CSVs de exemplo, sem UI
npm run train-classifier   # retreina o classificador de IA local (offline, opcional)
```

## Fora de escopo (próximos passos)

- Login/autenticação de usuário.
- Suporte a mais de 2-3 formatos de banco — o objetivo aqui é provar o adaptador, não suportar todo banco do mundo.
- Detecção de gastos recorrentes/assinaturas por análise de padrão.
- Exportação de relatório em PDF.
- Conexão bancária real (Open Banking, Plaid) — só upload de CSV.
- Deduplicação entre uploads diferentes (hoje só compara arquivos do mesmo upload — ver comentário em [`app/api/statements/upload/route.ts`](app/api/statements/upload/route.ts)).
