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

### Tier 2 — Fingerprint expandido (FALLBACK)
22 patterns de mensagem (vs 4 anteriores).

### Tier 3 — `contacts.origin` (ÚLTIMO FALLBACK)
Mapeamento completo incluindo n8n, redirect, site, ctwa_ad.

## Implementado em 19/03/2026
Ver PROGRESSAO.md para resultados.
