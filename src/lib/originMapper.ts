export interface OriginResult {
  origem: string;
  campanha: string | null;
}

export interface ReferralInfo {
  referral_source: string | null;
  referral_data: Record<string, string | undefined> | null;
}

/**
 * Mapeamento de contacts.origin para origem legivel (Tier 3 fallback).
 */
export const CONTACT_ORIGIN_MAP: Record<string, string> = {
  meta_ads: "Meta Direto",
  ctwa_ad: "Meta CTWA",
  linktree: "Linktree",
  manual: "Cadastro Manual",
  whatsapp: "Organico (WhatsApp)",
  redirect: "Meta Redirect",
  site: "Google/Site",
  n8n: "Automacao (n8n)",
};

/**
 * Tier 1: Classifica origem a partir de conversations.referral_source + referral_data.
 * Retorna null se referral_source nao estiver presente.
 */
export function mapFromReferral(info: ReferralInfo): OriginResult | null {
  const { referral_source, referral_data } = info;

  if (referral_source == null) {
    return null;
  }

  const data = referral_data ?? {};

  switch (referral_source) {
    case "ctwa_ad":
      return {
        origem: "Meta CTWA",
        campanha: data.headline ?? null,
      };

    case "meta_ads": {
      if (data.sourceType === "ad") {
        return {
          origem: "Meta CTWA",
          campanha: data.adName ?? data.headline ?? null,
        };
      }

      if (data.detected_by?.startsWith("message_pattern")) {
        return {
          origem: "Meta CTWA",
          campanha: null,
        };
      }

      return {
        origem: "Meta CTWA",
        campanha: null,
      };
    }

    case "redirect": {
      const utmMedium = data.utm_medium ?? null;
      const isTemplate = utmMedium?.startsWith("{{") ?? false;
      return {
        origem: "Meta Redirect",
        campanha: isTemplate ? null : utmMedium,
      };
    }

    case "linktree":
      return {
        origem: "Linktree",
        campanha: data.campaign_name ?? null,
      };

    case "site":
      return {
        origem: "Google/Site",
        campanha: data.campaign_name ?? null,
      };

    default:
      return {
        origem: `Outro (${referral_source})`,
        campanha: null,
      };
  }
}

/**
 * Tier 3: Classifica origem a partir de contacts.origin (fallback quando nao ha
 * dados de referral nem fingerprint).
 */
export function mapFromContactOrigin(contactOrigin: string | null): OriginResult {
  if (!contactOrigin) {
    return { origem: "Organico (sem origem)", campanha: null };
  }

  const mapped = CONTACT_ORIGIN_MAP[contactOrigin];

  return {
    origem: mapped ?? "Organico (sem origem)",
    campanha: null,
  };
}
