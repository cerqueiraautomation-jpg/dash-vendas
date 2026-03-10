# Progressao - Dashboard Vendas Bling x CRM

Acompanhamento de todas as etapas do projeto.

---

## Etapa 1: Banco de Dados

- [x] Tabela `vendas_relatorio` (670 registros, R$ 970.635,78)
- [x] Tabela `lead_historico_trafego`
- [x] Tabela `token_bling` (sync OAuth2 via n8n a cada 4h)
- [x] RLS configurado
- [x] Indexes nas colunas de busca (data_pedido, pedido, telefone_normalizado)
- [x] Edge Function `sync-bling-vendas` V5 com CORS + cron a cada 30min

---

## Etapa 2: Projeto Frontend

- [x] Vite + React + TypeScript
- [x] Tailwind CSS v4 (plugin `@tailwindcss/vite`)
- [x] Recharts para graficos
- [x] Supabase client configurado (`src/lib/supabase.ts`)
- [x] Vitest setup (globals, environment node)
- [x] ESLint configurado

---

## Etapa 3: Dashboard Base

- [x] `KPICards` - Cards com metricas principais
- [x] `ChartMensal` - Grafico comparativo mensal
- [x] `ChartOrigem` - Distribuicao por origem de trafego
- [x] `ChartVendedor` - Performance por vendedor
- [x] `ChartDiario` - Vendas por dia
- [x] `ChartTempoCRM` - Tempo entre entrada no CRM e compra
- [x] `ChartDisparo` - Analise de disparos (compra apos disparo)
- [x] `ChartCampanha` - Vendas por campanha
- [x] `DataTable` - Tabela detalhada com todos os registros
- [x] `ResumoExecutivo` - Resumo textual dos dados
- [x] Filtro multi-mes com dropdown dinamico (select com meses disponiveis)

---

## Etapa 4: Importacao de Dados

- [x] `UploadPlanilha` - Upload XLSX do JetSales com parsing e insercao no Supabase
- [x] `BackfillBling` - Importacao retroativa do Bling com janelas de 30 dias (CORS fix v5)
- [x] `originDetector` - Deteccao de origem com 4 patterns (CTWA, Redirect, Linktree, Google/Site)

---

## Etapa 5: Segmentacao de Clientes

- [x] `ChartSegmentacao` - Visualizacao com 4 segmentos
- [x] Janela de atribuicao configuravel (30/60/90 dias)

---

## Etapa 6: Testes (83 testes)

- [x] `src/lib/originDetector.test.ts` - 53 testes (deteccao de origem de trafego)
- [x] `src/utils/format.test.ts` - 30 testes (formatacao de valores e datas)

---

## Etapa 7: Deploy

- [x] Deploy na Vercel (cerqueiraautomation-jpg)
- [x] Env vars configuradas (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
- [x] URL: https://dash-vendas-three.vercel.app/

---

## Notas

- Bling API V3 OAuth2, rate limit 3 req/s
- Bling `loja.id === 0` = vendas diretas (filtrar outras lojas)
- n8n atualiza token Bling a cada 4h na tabela `token_bling`
- Supabase project: lkxrmjqrzhaivviuuamp (CRM Space)
- MCP push: `mcp__cerqueira-automation__push_files` (git push local nao funciona)
- Vercel pode nao fazer auto-deploy via MCP push - verificar redeploy manual
