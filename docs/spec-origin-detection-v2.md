# Spec: Reestruturação Detecção de Origem v2

## Problema
73,5% dos pedidos caem como "Orgânico (sem origem)" porque a Edge Function:
1. Prioriza fingerprint (4 padrões apenas) sobre dados confiáveis do CRM
2. Só olha as primeiras 5 mensagens por conversa
3. Pega a primeira conversa do contato (pode ser antiga/sem dados)
4. Ignora `conversations.referral_source` como fonte primária
5. Ignora dados ricos de `referral_data` (adset, creative, segmento)
6. Campo `campanha` só pega `utm_campaign` (quase sempre "meta_ads" genérico)

## Solução: 3 Tiers de Detecção (Opção C)

### Tier 1 — `conversations.referral_source` + `referral_data` (NOVA PRIORIDADE)
Dados mais confiáveis — tracking automático do CRM quando cliente clica link rastreado.

**Lógica:**
- Buscar TODAS as conversas do contato
- Priorizar conversa com `referral_source != null` mais RECENTE antes da data do pedido
- Mapping:

| referral_source | Origem Final |
|-----------------|-------------|
| ctwa_ad | Meta CTWA |
| meta_ads (sourceType=ad) | Meta CTWA |
| redirect | Meta Redirect |
| linktree | Linktree |
| site | Google/Site |

**Extração de campanha do `referral_data`:**

Para `redirect`:
```
campanha = utm_medium (adset/segmento) — ex: "SS04.4 | AGRO | SEGMENTADO"
creative = utm_content — ex: "SS02.4-1 CT_VIDEO - AGRO — Cópia"
ad_id = utm_term — ex: "120239609919690118"
```

Para `ctwa_ad` e `meta_ads`:
```
campanha = headline ou adName — ex: "Converse conosco"
ad_id = source_id ou sourceId
```

Para `linktree`/`site`:
```
campanha = campaign_name (se existir)
```

### Tier 2 — Fingerprint expandido (FALLBACK)
Para clientes que chegaram sem link rastreado mas disseram de onde vieram.

**Regras:**
- Buscar em TODAS as mensagens do cliente (is_from_me=false), sem limite de 5
- Patterns expandidos:

| Pattern (case-insensitive) | Origem | Qtd encontrada |
|---------------------------|--------|----------------|
| "vim pelo linktree" | Linktree | 1.601 |
| "vim pelo site" | Google/Site | 85 |
| "vim pelo emprega mais" | Emprega Mais | 29 |
| "pelo site" (msg curta, < 50 chars) | Google/Site | 22 |
| "vim pelo stories" | Instagram Stories | 15 |
| "vim pelo instagram" / "vi no instagram" / "vi pelo instagram" / "pelo instagram" | Instagram Orgânico | ~15 |
| "vim pelo google" / "pelo google" | Google/Site | variável |
| "vim pelo facebook" / "vi no facebook" | Facebook Orgânico | variável |
| "indicação" / "indicacao" / "recebi indicação" / "recebi a indicação" | Indicação | ~4 |
| "vi no anúncio" / "vi no anuncio" / "vi a propaganda" | Meta Ads (via anúncio) | variável |
| "tenho interesse e queria mais informa" | Meta CTWA | existente |
| "recebi o seu contato aqui" (is_from_me=true) | Meta Redirect | existente |

### Tier 3 — `contacts.origin` (ÚLTIMO FALLBACK)
Mesmo mapping atual, só usado se Tiers 1 e 2 não encontraram nada.

| contacts.origin | Origem Final |
|-----------------|-------------|
| meta_ads | Meta Direto |
| ctwa_ad | Meta CTWA |
| linktree | Linktree |
| manual | Cadastro Manual |
| whatsapp | Orgânico (WhatsApp) |
| redirect | Meta Redirect |
| site | Google/Site |
| n8n | Automação (n8n) |
| null / "" | Orgânico (sem origem) |

## Mudanças na vendas_relatorio

Campo `campanha` passa a ser preenchido com dado mais rico:
- Para redirect: `utm_medium` (contém segmento: AGRO, ENERGIA SOLAR, etc.)
- Para CTWA/meta_ads: `headline` ou `adName`
- Para outros: `campaign_name` se existir

## Mudanças no Código

### Função `prefetchFingerprints` → renomear para `prefetchOrigins`

Nova ordem:
1. Buscar conversas do contato (já faz)
2. **NOVO:** Filtrar conversas com referral_source != null, pegar a mais recente
3. Se achou → Tier 1 (mapear referral_source + extrair campanha de referral_data)
4. Se não → buscar mensagens e checar fingerprints expandidos (Tier 2)
5. Se não → fallback contacts.origin (Tier 3)

### Busca de mensagens
- Remover limite de 5 mensagens por conversa
- Filtrar apenas is_from_me=false para fingerprints (exceto "recebi o seu contato" que é is_from_me=true)
- Buscar com limit maior (50 por conversa)

## Testes

### Testes unitários (vitest)
1. **originMapper** — função pura que mapeia referral_source + referral_data → {origem, campanha}
   - Testar todos os referral_source: ctwa_ad, meta_ads, redirect, linktree, site, null
   - Testar extração de campanha de cada tipo de referral_data
   - Testar edge cases: referral_data null, campos ausentes, valores vazios

2. **fingerprintDetector** — função pura que recebe array de mensagens → origem ou null
   - Testar cada padrão novo
   - Testar case insensitivity
   - Testar que ignora mensagens is_from_me=true (exceto Meta Redirect)
   - Testar prioridade (primeira mensagem com match ganha)
   - Testar mensagem sem match → null

3. **contactOriginFallback** — função pura que mapeia contacts.origin → origem
   - Testar todos os valores conhecidos
   - Testar null, string vazia, valor desconhecido

## Arquivos a Modificar/Criar
- `supabase/functions/sync-bling-vendas/index.ts` → refatorar prefetchFingerprints
- `src/lib/originMapper.ts` → NOVO: lógica pura de mapping (testável)
- `src/lib/fingerprintDetector.ts` → NOVO: lógica pura de fingerprint (testável)
- `src/lib/originMapper.test.ts` → NOVO: testes
- `src/lib/fingerprintDetector.test.ts` → NOVO: testes
