# Processo de Cruzamento Bling x CRM

Documento descrevendo como os dados de vendas do Bling sao cruzados com o CRM (Supabase)
para determinar origem, campanha, tempo de conversao e impacto de disparos.

## Visao Geral do Pipeline

```
Bling (pedidos/vendas)
    |
    | nome_cliente, telefone, valor, data_pedido, vendedor
    v
Matching Engine (cruzamento)
    |
    | Busca no CRM por: nome completo -> nome parcial -> telefone
    v
Contacts (CRM - Supabase)
    |
    | origin, origin_campaign, referral_data, created_at
    v
Conversations (CRM)
    |
    | referral_source, referral_data (UTM, CTWA, etc)
    v
vendas_relatorio (tabela final para dashboard)
```

## Tabelas Envolvidas

### Bling (origem dos dados)
- **pedidos_status**: `numero_pedido`, `nome_cliente`, `telefone`, `status`, `data_entrega`
- Fonte primaria de vendas com nome do cliente e telefone

### CRM (Supabase)
- **contacts**: `full_name`, `phone`, `origin`, `origin_campaign`, `referral_data`, `created_at`
- **conversations**: `contact_id`, `referral_source`, `referral_data`, `origin_detection_method`, `created_at`
- **bulk_dispatch_contacts**: `contact_id`, `dispatch_id`, `status`, `sent_at`
- **bulk_dispatches**: dados dos disparos em massa

### Dashboard
- **vendas_relatorio**: tabela final com todos os campos enriquecidos

## Algoritmo de Matching (Prioridade)

### Passo 1: Match por Nome Completo (exato)
```sql
SELECT * FROM contacts
WHERE full_name = 'NOME DO BLING'
```
- Match mais confiavel
- Muitos clientes B2B tem nome identico no Bling e CRM
- Exemplos: "Blackfire Academia de Artes Marciais", "TAYGUARA ANDRADE ENERGIA SOLAR"

### Passo 2: Match por Nome Parcial (ILIKE)
```sql
SELECT * FROM contacts
WHERE full_name ILIKE '%parte_do_nome%'
```
- Usado quando o nome no Bling tem formato "PESSOA / EMPRESA"
- Buscar por cada parte separadamente
- Exemplos:
  - Bling: "EVANDRO BEZERRA/ MONTEZ" -> CRM: "EVANDRO BEZERRA/ MONTEZ" (exato neste caso)
  - Bling: "JJ NET / JOSUE JESUS / JJNET" -> CRM: "JOSUE / JJNET"
  - Bling: "Lluan Ataide" -> CRM: "LUAN ATAIDE / ATAIDE TECNOLOGIA"

### Passo 3: Match por Telefone
```sql
-- Pegar telefone do Bling (pedidos_status)
SELECT telefone FROM pedidos_status WHERE numero_pedido = X

-- Buscar no CRM
SELECT * FROM contacts WHERE phone LIKE '%telefone%'
```
- Fallback quando nome nao bate
- Normalizar telefone: remover DDI (55), DDD, espacos
- Exemplo: Bling tel "3798292879" -> CRM phone "553798292879" -> "BERNARDO"

### Passo 4: Nao Encontrado
- Se nenhum match, marcar como "Nao encontrado"
- Indica gap de atribuicao (cliente nao passou pelo CRM)

## Determinacao de Origem

A origem e determinada pelo campo `origin` do contato no CRM + `referral_data` da conversa:

| CRM origin | CRM referral_source | Origem Final |
|------------|---------------------|--------------|
| `null` | `null` | Organico (sem origem) |
| `whatsapp` | `null` | Organico (WhatsApp) |
| `manual` | `null` | Cadastro Manual |
| `ctwa_ad` | `ctwa_ad` | Meta CTWA |
| `meta_ads` | `redirect` | Meta Redirect |
| `meta_ads` | `null` | Meta Direto |
| `linktree` | `null` | Linktree |

### Detalhes de Cada Origem

**Organico (sem origem)**: Cliente chegou pelo WhatsApp sem nenhum rastreio. O CRM nao registrou de onde veio.

**Organico (WhatsApp)**: CRM detectou que veio do WhatsApp organicamente (digitou o numero ou clicou link bio).

**Cadastro Manual**: Vendedor cadastrou manualmente o contato no CRM (origin = 'manual').

**Meta CTWA (Click-to-WhatsApp)**: Anuncio do Meta com botao "Enviar mensagem no WhatsApp".
- Detectado por `referral_source = 'ctwa_ad'`
- `referral_data` contem: `ctwa_clid`, `source_id` (ID do anuncio), `headline`, `source_url`

**Meta Redirect (UTM)**: Anuncio do Meta com redirect para landing page que redireciona pro WhatsApp.
- Detectado por `referral_source = 'redirect'` + `origin = 'meta_ads'`
- `referral_data` contem UTMs: `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`
- `utm_term` = ID do ad no Meta

**Meta Direto**: Meta Ads sem UTM tracking (provavelmente lead form ou mensagem direta).

**Linktree**: Veio pelo link do Linktree da bio.

## Determinacao de Campanha

### Para Meta CTWA
```sql
-- referral_data->>'source_id' = ID do anuncio no Meta
-- Cruzar com meta_ad_accounts / meta_campaigns se disponivel
-- Caso contrario, campanha fica NULL
```

### Para Meta Redirect
```sql
-- referral_data->>'utm_campaign' = nome da campanha
-- referral_data->>'utm_medium' = nome do adset
-- referral_data->>'utm_content' = nome do ad criativo
-- referral_data->>'utm_term' = ID do ad no Meta
```

### Para outros
Campanha = NULL (nao se aplica)

## Calculo do Tempo CRM -> Compra

```
tempo_compra_dias = data_pedido (Bling) - created_at::date (contacts CRM)
```

- Se contato nao encontrado no CRM: `tempo_compra_dias = NULL`
- Valores negativos sao possiveis (contato criado DEPOIS do pedido = dados inconsistentes)
- Valor 0 = comprou no mesmo dia que entrou no CRM

## Deteccao de Disparos

### Fontes de dados de disparo:
1. **bulk_dispatches** + **bulk_dispatch_contacts**: disparos em massa do CRM
2. **scheduled_messages**: mensagens agendadas
3. **active_marketing_campaigns**: campanhas ativas de marketing

### Campos no vendas_relatorio:
- `recebeu_disparo` (boolean): se o contato recebeu algum disparo antes ou depois da compra
- `dias_apos_disparo` (int): quantos dias entre o disparo e a compra
  - Positivo = comprou X dias DEPOIS do disparo
  - Negativo = ja tinha comprado X dias ANTES do disparo
  - 0 = comprou no mesmo dia
- `comprou_apos_disparo` (text): 'SIM' se dias >= 0, 'NAO' se dias < 0, NULL se nao recebeu

## Estrutura da Tabela vendas_relatorio

```sql
CREATE TABLE vendas_relatorio (
  id SERIAL PRIMARY KEY,
  pedido TEXT NOT NULL,
  nome TEXT NOT NULL,
  valor NUMERIC NOT NULL,
  data_pedido DATE NOT NULL,
  origem TEXT NOT NULL,
  campanha TEXT,
  data_entrada_crm DATE,
  tempo_compra_dias INTEGER,
  recebeu_disparo BOOLEAN DEFAULT FALSE,
  dias_apos_disparo INTEGER,
  comprou_apos_disparo TEXT,
  vendedor TEXT NOT NULL
);
```

## Para Automatizar

### Edge Function: sync-bling-vendas
1. Chamar API Bling para pegar pedidos novos (por data ou webhook)
2. Para cada pedido:
   a. Extrair: nome_cliente, telefone, valor, data, vendedor
   b. Buscar no CRM: nome exato -> nome parcial -> telefone
   c. Se encontrou: pegar origin, referral_data, created_at
   d. Mapear origin -> origem padronizada (tabela acima)
   e. Calcular tempo_compra_dias
   f. Verificar disparos (bulk_dispatch_contacts por contact_id)
   g. INSERT/UPDATE vendas_relatorio

### Sugestao de Cron
- Rodar 1x por dia (ex: 23:00)
- Ou usar webhook do Bling (evento: pedido.criado / pedido.atualizado)

### Melhorias Futuras
- Match por CPF/CNPJ (Bling tem, CRM pode ter em cpf_cnpj)
- Match por email (Bling pode ter, CRM tem campo email)
- Score de confianca no match (exato=100%, parcial=70%, telefone=90%)
- Log de matches para auditoria
