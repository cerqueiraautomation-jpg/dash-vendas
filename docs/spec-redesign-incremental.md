# Spec: Redesign Incremental — Dark Glassmorphism

## Objetivo
Modernizar a estética da dash sem alterar nenhuma lógica de dados, queries ou filtros.
Estilo alvo: Dark Glassmorphism (vibe Google AI Studio / dashboards modernos 2026).

## Princípios
- Zero alteração em hooks, queries, ou lógica de negócio
- Componente por componente — push e validação entre cada etapa
- Se não gostar de algo, reverte fácil
- Mobile-first permanece

---

## Etapa 1: Design Tokens & Utilitários CSS

**O que:**
- Criar classes utilitárias de glassmorphism (backdrop-blur, bg com opacity, border sutil)
- Definir gradientes de acento (roxo→azul, verde→ciano, gold→amber)
- Background: gradiente escuro sutil (slate-900 → slate-950) ao invés de flat
- Glow effects para KPIs (box-shadow colorido com opacity baixa)

**Arquivos:**
- `src/index.css` ou Tailwind config — adicionar utilitários
- Nenhuma mudança em componentes ainda

---

## Etapa 2: KPI Cards

**Antes:** Cards flat bg-slate-800 com borda slate-700
**Depois:**
- Glassmorphism: bg-white/5 backdrop-blur-lg border border-white/10
- Glow sutil na cor do indicador (green glow para vendas, purple para Meta Ads, etc.)
- Valor principal maior, com mais respiro
- Gradiente sutil no ícone

**Arquivo:** `src/components/KPICards.tsx`

---

## Etapa 3: Charts — Gradientes e Tooltips

**Antes:** Cores sólidas flat nos charts (Recharts)
**Depois:**
- Gradientes nos fills (barras, áreas, pie slices)
- Tooltips ricos: mais dados no hover (pedidos, ticket médio, % do total)
- Container dos charts com glassmorphism
- Labels com melhor contraste

**Arquivos:**
- `src/components/ChartMensal.tsx`
- `src/components/ChartOrigem.tsx`
- `src/components/ChartDiario.tsx`
- `src/components/ChartTempoCRM.tsx`
- `src/components/ChartDisparo.tsx`
- `src/components/ChartCampanha.tsx` (+ melhorar com dados de adset/segmento)
- `src/components/ChartSegmentacao.tsx`

---

## Etapa 4: ChartCampanha — Dados Ricos

**Antes:** Mostra apenas tipo de Meta Ads (CTWA, Redirect, Direto)
**Depois:**
- Seção CTWA: breakdown por headline (Converse conosco, Saiba mais, etc.)
- Seção Redirect: breakdown por adset/segmento (AGRO, ENERGIA SOLAR, REFRIGERAÇÃO, etc.)
- Faturamento + pedidos + ticket médio por campanha
- Indicação visual de "sem dado de campanha (via fingerprint)" para transparência

**Arquivo:** `src/components/ChartCampanha.tsx`

---

## Etapa 5: DataTable

**Antes:** Tabela flat com bg-slate-800
**Depois:**
- Container glassmorphism
- Hover rows com highlight sutil (white/5)
- Badges de origem com gradiente ao invés de flat
- Scroll suave

**Arquivo:** `src/components/DataTable.tsx`

---

## Etapa 6: Layout & Header

**Antes:** Header simples, filtros flat, scroll vertical infinito
**Depois:**
- Background body com gradiente sutil (não flat slate-900)
- Header com glassmorphism
- Filtros com estilo pill mais moderno (glassmorphism nos botões ativos)
- Indicador "Atualizado há X min" no header

**Arquivo:** `src/App.tsx`

---

## Etapa 7: Interatividade (Cross-Filter)

**O que:**
- Clicar numa fatia do ChartOrigem filtra TODOS os outros charts para aquela origem
- Clicar no ChartCampanha filtra por campanha
- Botão "Limpar filtro" visível quando ativo
- Estado global de filtro cruzado (useState no App ou context simples)

**Arquivos:**
- `src/App.tsx` — estado do filtro cruzado
- Todos os Charts — receber prop de filtro e aplicar

---

## Etapa 8: ResumoExecutivo

**Antes:** Texto em cards flat
**Depois:**
- Glassmorphism nos cards internos
- Números destacados com gradiente de cor
- Melhor hierarquia visual

**Arquivo:** `src/components/ResumoExecutivo.tsx`

---

## Ordem de Execução
1. Design tokens (base pra tudo)
2. KPI Cards (impacto visual imediato, valida a estética)
3. Charts com gradientes
4. ChartCampanha com dados ricos
5. DataTable
6. Layout & Header
7. Cross-filter
8. ResumoExecutivo

Cada etapa = push + validação na Vercel antes de seguir.

---

## O que NÃO muda
- Hooks (useVendas, useLeadHistorico, etc.)
- Queries Supabase
- Filtros de período
- Edge Function
- Lógica de cálculo (KPIs, resumo, segmentação)
- Testes existentes
- Dados na vendas_relatorio
