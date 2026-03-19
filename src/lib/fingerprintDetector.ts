import type { OriginResult } from "./originMapper";

export interface Message {
  content: string | null;
  is_from_me: boolean;
}

interface FingerprintPattern {
  pattern: string;
  origem: string;
  is_from_me: boolean;
  maxLength?: number;
}

/**
 * Padroes de fingerprint ordenados por prioridade.
 * First match wins.
 */
export const FINGERPRINTS: FingerprintPattern[] = [
  { pattern: "tenho interesse e queria mais informa", origem: "Meta CTWA", is_from_me: false },
  { pattern: "recebi o seu contato aqui", origem: "Meta Redirect", is_from_me: true },
  { pattern: "vim pelo linktree", origem: "Linktree", is_from_me: false },
  { pattern: "vim pelo site", origem: "Google/Site", is_from_me: false },
  { pattern: "vim pelo stories", origem: "Instagram Stories", is_from_me: false },
  { pattern: "vim pelo instagram", origem: "Instagram Organico", is_from_me: false },
  { pattern: "vi no instagram", origem: "Instagram Organico", is_from_me: false },
  { pattern: "vi pelo instagram", origem: "Instagram Organico", is_from_me: false },
  { pattern: "pelo instagram", origem: "Instagram Organico", is_from_me: false, maxLength: 50 },
  { pattern: "vim pelo google", origem: "Google/Site", is_from_me: false },
  { pattern: "pelo google", origem: "Google/Site", is_from_me: false, maxLength: 50 },
  { pattern: "vim pelo facebook", origem: "Facebook Organico", is_from_me: false },
  { pattern: "vi no facebook", origem: "Facebook Organico", is_from_me: false },
  { pattern: "pelo site", origem: "Google/Site", is_from_me: false, maxLength: 50 },
  { pattern: "vim pelo emprega mais", origem: "Emprega Mais", is_from_me: false },
  { pattern: "indicação", origem: "Indicacao", is_from_me: false },
  { pattern: "indicacao", origem: "Indicacao", is_from_me: false },
  { pattern: "recebi a indicação", origem: "Indicacao", is_from_me: false },
  { pattern: "recebi indicação", origem: "Indicacao", is_from_me: false },
  { pattern: "vi no anúncio", origem: "Meta Ads (via anuncio)", is_from_me: false },
  { pattern: "vi no anuncio", origem: "Meta Ads (via anuncio)", is_from_me: false },
  { pattern: "vi a propaganda", origem: "Meta Ads (via anuncio)", is_from_me: false },
];

/**
 * Tier 2: Detecta origem a partir do conteudo das mensagens (fingerprint).
 * Itera mensagens em ordem cronologica, primeiro match vence.
 */
export function detectFromFingerprint(messages: Message[]): OriginResult | null {
  for (const message of messages) {
    if (message.content == null) {
      continue;
    }

    const contentLower = message.content.toLowerCase();

    for (const fp of FINGERPRINTS) {
      // Verificar direcao da mensagem
      if (message.is_from_me !== fp.is_from_me) {
        continue;
      }

      // Verificar limite de tamanho quando aplicavel
      if (fp.maxLength != null && message.content.length >= fp.maxLength) {
        continue;
      }

      if (contentLower.includes(fp.pattern)) {
        return {
          origem: fp.origem,
          campanha: null,
        };
      }
    }
  }

  return null;
}
