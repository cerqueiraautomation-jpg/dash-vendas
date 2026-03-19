# Progressao - Dashboard Vendas Bling x CRM

Acompanhamento de todas as etapas do projeto.

---

## Etapa 1: Banco de Dados

- [x] Tabela `vendas_relatorio` (670 registros, R$ 970.635,78)
- [x] Tabela `lead_historico_trafego`
- [x] Tabela `token_bling` (sync OAuth2 via n8n a cada 4h)
- [x] RLS configurado
- [x] Indexes nas colunas de busca (data_pedido, pedido, telefone_normalizado)
- [x] Edge Function `sync-bling-vendas` V13 com deteccao de origem 3-tier + vendedor CRM + cron a cada 30min

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
- [x] `originMapper` - Mapping de referral_source/referral_data para origem (Tier 1 + 3)
- [x] `fingerprintDetector` - Deteccao expandida com 22 patterns (Tier 2)

---

## Etapa 5: Segmentacao de Clientes

- [x] `ChartSegmentacao` - Visualizacao com 4 segmentos
- [x] Janela de atribuicao configuravel (30/60/90 dias)

---

## Etapa 6: Testes (137 testes)

- [x] `src/lib/originDetector.test.ts` - 53 testes (deteccao de origem de trafego)
- [x] `src/utils/format.test.ts` - 30 testes (formatacao de valores e datas)
- [x] `src/lib/originMapper.test.ts` - 26 testes (mapping referral_source + contacts.origin)
- [x] `src/lib/fingerprintDetector.test.ts` - 28 testes (fingerprint expandido 22 patterns)

---

## Etapa 7: Deploy

- [x] Deploy na Vercel (cerqueiraautomation-jpg)
- [x] Env vars configuradas (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
- [x] URL: https://dash-vendas-theta.vercel.app/

---

## Etapa 8: Reestruturacao Deteccao de Origem v2 (19/03/2026)

- [x] Analise de dados: 73,5% dos pedidos caiam como "Organico (sem origem)" na v11
- [x] Nova logica 3-tier na Edge Function:
  - Tier 1: `conversations.referral_source` + `referral_data` (tracking automatico CRM) — mais confiavel
  - Tier 2: Fingerprint expandido (22 patterns vs 4 anteriores) — busca em TODAS as mensagens
  - Tier 3: `contacts.origin` fallback (adicionou n8n, redirect, site, ctwa_ad)
- [x] Vendedor CRM: quando Bling nao tem vendedor, puxa `conversations.assigned_to` → `profiles.full_name`
- [x] Campanha rica: adset/segmento (AGRO, ENERGIA SOLAR, etc.) via `referral_data.utm_medium`
- [x] Template detection: ignora `{{adset.name}}` como campanha invalida
- [x] Funcoes puras testaveis: `originMapper.ts` + `fingerprintDetector.ts`
- [x] Spec salvo em `docs/spec-origin-detection-v2.md`
- [x] Reprocessamento completo de todo historico (Jan/2025 a Mar/2026)

### Resultados do reprocessamento:
| Metrica | Antes (v11) | Depois (v13) |
|---------|-------------|-------------|
| Com vendedor | 18% | **79,7%** |
| Com origem rastreada | 26% | **40,3%** |
| Com campanha | 1,1% | **10,4%** |
| Novas origens detectadas | - | Indicacao, Instagram Organico, Instagram Stories, Emprega Mais, Automacao (n8n) |

---

## Notas

- Bling API V3 OAuth2, rate limit 3 req/s
- Bling `loja.id === 0` = vendas diretas (filtrar outras lojas)
- n8n atualiza token Bling a cada 4h na tabela `token_bling`
- Supabase project: lkxrmjqrzhaivviuuamp (CRM Space)
- MCP push: `mcp__cerqueira-automation__push_files` (git push local nao funciona)
- Vercel pode nao fazer auto-deploy via MCP push - verificar redeploy manual
