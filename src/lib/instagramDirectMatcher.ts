/**
 * Matcher para identificar vendas Bling cujo cliente WhatsApp e na verdade
 * a mesma pessoa de uma conversa Instagram Direct (cross-channel).
 *
 * Logica: contatos IG Direct nao tem telefone proprio, mas em algum momento
 * o cliente costuma digitar o telefone real no chat. Se esse telefone bate
 * com o phone do contato WhatsApp que casou com a venda, e a mesma pessoa.
 */

/**
 * Hard cap de tamanho de mensagem antes de aplicar regex de telefone.
 * Proteje contra ReDoS em mensagens patologicamente longas.
 * Ver SEC-DASH-002 no security review.
 */
const MAX_MESSAGE_LENGTH_FOR_PHONE_EXTRACTION = 5000;

const URL_PATTERN = /https?:\/\/\S+/gi;
const WWW_PATTERN = /www\.\S+/gi;

/**
 * Regex para capturar telefones BR em texto livre.
 * Aceita: +55, DDD com ou sem parenteses, separadores espaco/hifen,
 * 8 ou 9 digitos no numero local.
 */
const PHONE_PATTERN =
  /(?:\+?55[\s-]?)?\(?\d{2}\)?[\s-]?\d{4,5}[\s-]?\d{4}/g;

/**
 * Remove URLs de um texto, substituindo por espaco para nao colar tokens vizinhos.
 */
function stripUrls(text: string): string {
  return text.replace(URL_PATTERN, " ").replace(WWW_PATTERN, " ");
}

/**
 * Valida se uma sequencia de digitos representa um celular BR valido
 * e retorna os 9 ultimos digitos. Retorna null se invalido.
 *
 * Regras:
 * - Apos remover prefixo 55 (codigo pais), deve sobrar 10 ou 11 digitos
 * - DDD (2 primeiros) entre 11 e 99
 * - Numero local de 9 digitos comecando com 6-9 (celular)
 * - Aceita 10 digitos (sem 9 inicial) adicionando o 9 na frente
 */
function validateAndNormalize(digitsOnly: string): string | null {
  let digits = digitsOnly;

  if (digits.length === 13 && digits.startsWith("55")) {
    digits = digits.slice(2);
  } else if (digits.length === 12 && digits.startsWith("55")) {
    digits = digits.slice(2);
  }

  if (digits.length !== 10 && digits.length !== 11) {
    return null;
  }

  const ddd = parseInt(digits.slice(0, 2), 10);
  if (isNaN(ddd) || ddd < 11 || ddd > 99) {
    return null;
  }

  let local = digits.slice(2);
  if (local.length === 8) {
    local = "9" + local;
  }

  if (local.length !== 9) {
    return null;
  }

  const firstDigit = local.charCodeAt(0);
  // celular BR: primeiro digito 6-9
  if (firstDigit < 54 || firstDigit > 57) {
    return null;
  }

  return local;
}

/**
 * Normaliza um telefone BR para os 9 ultimos digitos.
 * Retorna null se nao for um numero valido.
 */
export function normalizeBrPhone(phone: string): string | null {
  if (!phone) {
    return null;
  }

  // Rejeita explicitamente prefixos nao-telefone (ex: ig:1234567890)
  if (/[a-zA-Z]:/.test(phone)) {
    return null;
  }

  const digitsOnly = phone.replace(/\D/g, "");
  if (digitsOnly.length < 8) {
    return null;
  }

  return validateAndNormalize(digitsOnly);
}

/**
 * Extrai todos os telefones BR validos de um texto livre.
 * Ignora digitos dentro de URLs (http://, https://, www.).
 *
 * Decisao de design: NAO aceita sequencias de 9 digitos puros sem DDD,
 * para evitar falsos positivos com numeros de pedido/produto.
 */
export function extractPhonesFromText(text: string): string[] {
  if (!text) {
    return [];
  }

  if (text.length > MAX_MESSAGE_LENGTH_FOR_PHONE_EXTRACTION) {
    return [];
  }

  const cleaned = stripUrls(text);
  const matches = cleaned.match(PHONE_PATTERN);
  if (!matches) {
    return [];
  }

  const result: string[] = [];
  const seen = new Set<string>();

  for (const raw of matches) {
    const normalized = normalizeBrPhone(raw);
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      result.push(normalized);
    }
  }

  return result;
}

export interface IgMessage {
  conversation_id: string;
  content: string;
}

export interface IgContactConvMap {
  // conversation_id -> ig_contact_id
  convToContact: Map<string, string>;
}

/**
 * Constroi um Map { phone9 -> ig_contact_id } a partir de mensagens IG Direct.
 * Se o mesmo phone aparece em conversas de contatos diferentes, mantem o primeiro.
 */
export function buildPhoneToIgContactMap(
  messages: IgMessage[],
  map: IgContactConvMap
): Map<string, string> {
  const result = new Map<string, string>();

  for (const msg of messages) {
    const igContactId = map.convToContact.get(msg.conversation_id);
    if (!igContactId) {
      continue;
    }

    const phones = extractPhonesFromText(msg.content);
    for (const phone of phones) {
      if (!result.has(phone)) {
        result.set(phone, igContactId);
      }
    }
  }

  return result;
}
