# FinRadar — Handoff de contexto

Documento pra retomar o trabalho numa sessão nova do Claude Code (rodando com raiz em `FinRadar/`, não em `Projetos/`). Leia isto antes de mexer em qualquer coisa — tem decisões e pegadinhas que não são óbvias só lendo o código.

## Por que essa sessão nova existe

A sessão anterior estava rodando com raiz em `C:\Users\dotto\Documents\Programacao\Projetos` (a pasta pai, que reúne vários projetos). O `.mcp.json` do servidor MCP do Supabase só existia dentro de `FinRadar/`, então nunca era carregado — Claude Code só lê `.mcp.json` da raiz da sessão. Migrar a sessão pra rodar direto em `FinRadar/` resolve isso de vez (o `.mcp.json` já está no lugar certo aqui dentro) e também é a configuração correta a longo prazo: `FinRadar` tem `package.json`, `node_modules`, `.claude/skills` e `.mcp.json` próprios — devia ser raiz de projeto, não subpasta.

## Estado do projeto: PRD original → pivô grande nesta sessão

O `PRD.md` na raiz descreve a visão **original**: categorização híbrida regras+IA via Anthropic API, resumo executivo por LLM. **Isso não reflete mais o código.** Numa sessão anterior, depois de ficar bloqueado com a conta Anthropic zerada de créditos, o usuário pediu um pivô grande, que foi implementado e está completo:

- **Removida a dependência da Anthropic API por completo** (não é só um modo de dev — foi tirada de vez). Categorização agora é só regras (heurística de palavras-chave); o que não bate vira `"uncategorized"` e fica pendente de classificação manual pelo usuário no próprio dashboard. Resumo executivo agora é gerado por template determinístico a partir dos agregados, sem chamada de rede.
- **i18n**: inglês por padrão, com toggle pra português (botão no header). Categorias têm chave neutra em inglês (`groceries`, `transport`, `subscriptions`, `transfer`, `dining`, `exchange`, `other`, `uncategorized`) com rótulo traduzido por idioma.
- **Conversão de moeda histórica**: moeda padrão de exibição é AUD, com seletor (AUD/USD/EUR/BRL/GBP) que recalcula os valores usando a taxa de câmbio da **data de cada transação** via Frankfurter (`https://api.frankfurter.dev/v2/rates`, gratuita, sem chave).
- **Categorização manual**: tabela com *todas* as transações (não só top 5) no relatório, com um dropdown de categoria editável por linha — chama `PATCH /api/transactions/[id]`.
- **Loading progressivo** no upload: estágios traduzidos (`Reading files… → Detecting format… → ...`) avançando num timer enquanto a requisição está em voo. É simulado (uma request/response só, sem SSE) — documentado como tal no código, não é progresso granular real do servidor.

O `README.md` atual **ainda descreve a arquitetura antiga** (Claude Sonnet/Haiku, categorização híbrida com IA) — está desatualizado e precisa ser reescrito pra refletir o pivô acima antes de qualquer deploy/portfólio. Isso ficou pendente.

Todo o plano detalhado desse pivô (decisões, arquivos, por quê) está em `C:\Users\dotto\.claude\plans\tem-como-fazer-a-abundant-donut.md` — vale ler se precisar entender uma decisão de design específica.

## O que está implementado e passando

- `npx tsc --noEmit`, `npm run lint`, `npm run build` — todos limpos, checados nesta sessão.
- `npm run process-samples` roda 100% offline (sem API key nenhuma) e mostra o split regra/sem-categoria no console.
- Migrations `0001_init.sql` e `0002_currency_manual_rls.sql` — **usuário confirmou que já rodou as duas** no banco (project ref `mthuvyatnrvwgduatzin`). `0002` adiciona a coluna `currency` em `transactions`, troca o `category_source` check de `('rule','ai')` pra `('rule','manual')`, e habilita RLS com policy de leitura pública (sem policy de escrita pra anon/authenticated — escrita só via `admin.ts`/service role).

## O que NÃO foi verificado ainda (próximo passo real)

Depois do pivô grande (remover IA, i18n, moeda, categorização manual), **não rodei o fluxo end-to-end no browser** — fiquei preso na saga de MCP/restart antes de conseguir testar. Com as migrations aplicadas, o próximo passo é:

1. Subir o dev server (`npm run dev` — se for usar `preview_start`, precisa recriar `.claude/launch.json` **dentro de `FinRadar/`** agora, apontando pra `npm run dev` sem `--prefix`, já que a raiz da sessão mudou).
2. Testar upload real dos 2 exemplos (`data/sample/commbank-sample.csv` e `wise-sample.csv`, ou o botão "usar exemplos" na landing).
3. Confirmar que o relatório carrega com transações `uncategorized` visíveis na tabela completa.
4. Editar uma categoria manualmente na tabela e confirmar que os stat cards/gráficos atualizam ao recarregar (o relatório recalcula ao vivo a partir da tabela `transactions`, não lê mais um snapshot congelado).
5. Trocar o seletor de moeda (AUD → USD ou BRL) e confirmar que os valores mudam (chamada real à Frankfurter API).
6. Clicar no botão de idioma (EN ↔ PT) e confirmar que tudo traduz, incluindo rótulos de categoria e o resumo executivo.
7. Testar upload de um CSV inválido e confirmar a mensagem de erro amigável (422).

## Credenciais / ambiente

`.env.local` (gitignored) já tem as 3 variáveis do Supabase preenchidas — **não precisa mais de `ANTHROPIC_API_KEY`** (removida do `.env.example` e do código):
```
NEXT_PUBLIC_SUPABASE_URL=https://mthuvyatnrvwgduatzin.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## Pendências (nada disso foi feito ainda)

- **README.md** — reescrever pra refletir o pivô (sem IA, i18n, conversão de moeda, categorização manual). O README atual vende a narrativa "categorização híbrida com IA real" que não existe mais no código.
- **Verificação end-to-end no browser** (lista acima) — bloqueador real antes de considerar isso pronto.
- **Deploy na Vercel** (Fase 9 do plano original) — nunca foi feito. Precisa da conta Vercel do usuário conectada; env vars a configurar lá são as 3 do Supabase (sem Anthropic).
- **GIF de demo** — pendente, só faz sentido gravar depois da verificação end-to-end.
- Considerar rodar `npm run supabase:types` (ou pedir pro MCP gerar) pra substituir `lib/supabase/database.types.ts` (hoje escrito à mão) pelo tipo gerado oficialmente — baixo risco, mas os tipos manuais podem ter divergido sutilmente do schema real depois da migration 0002.

## Mapa de arquivos-chave do pivô

- `lib/categorize/rules.ts` — regras + categorias com chave neutra (`CATEGORIES`).
- `lib/categorize/index.ts` — categorização síncrona, sem IA.
- `lib/summary/build-summary.ts` — insights estruturados (não-texto), traduzidos na renderização.
- `lib/i18n/dictionaries.ts` + `lib/i18n/locale.ts` — dicionários EN/PT e cookie de locale (`fr_locale`).
- `lib/currency/frankfurter.ts` + `lib/currency/convert.ts` — taxa histórica + conversão em lote.
- `app/report/[id]/page.tsx` — recalcula tudo ao vivo a partir de `transactions` (não lê mais `reports.category_summary` como fonte de verdade — esse campo agora é só um snapshot histórico, gravado no upload mas nunca relido).
- `app/api/transactions/[id]/route.ts` — PATCH de categorização manual.
- `components/shared/AllTransactions.tsx`, `CurrencySelector.tsx`, `LanguageSwitcher.tsx` — novos.
- `supabase/migrations/0002_currency_manual_rls.sql` — a migration que o usuário já rodou.
