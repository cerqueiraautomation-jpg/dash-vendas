import { describe, it, expect } from 'vitest'
import { mapFromReferral, mapFromContactOrigin } from './originMapper'
import type { ReferralInfo } from './originMapper'

// ---------------------------------------------------------------------------
// mapFromReferral
// ---------------------------------------------------------------------------
describe('mapFromReferral', () => {
  describe('retorna null quando nao ha referral_source', () => {
    it('retorna null quando referral_source e null', () => {
      const info: ReferralInfo = { referral_source: null, referral_data: null }
      expect(mapFromReferral(info)).toBeNull()
    })

    it('retorna null quando referral_source e undefined', () => {
      const info: ReferralInfo = { referral_source: undefined as unknown as null, referral_data: null }
      expect(mapFromReferral(info)).toBeNull()
    })
  })

  describe('ctwa_ad', () => {
    it('mapeia "ctwa_ad" para "Meta CTWA" com headline como campanha', () => {
      const info: ReferralInfo = {
        referral_source: 'ctwa_ad',
        referral_data: { headline: 'Camisetas Personalizadas' },
      }
      expect(mapFromReferral(info)).toEqual({
        origem: 'Meta CTWA',
        campanha: 'Camisetas Personalizadas',
      })
    })

    it('mapeia "ctwa_ad" para "Meta CTWA" com campanha null quando nao ha headline', () => {
      const info: ReferralInfo = {
        referral_source: 'ctwa_ad',
        referral_data: {},
      }
      expect(mapFromReferral(info)).toEqual({
        origem: 'Meta CTWA',
        campanha: null,
      })
    })
  })

  describe('meta_ads', () => {
    it('mapeia "meta_ads" com sourceType="ad" para "Meta CTWA" com adName como campanha', () => {
      const info: ReferralInfo = {
        referral_source: 'meta_ads',
        referral_data: { sourceType: 'ad', adName: 'Campanha Verao' },
      }
      expect(mapFromReferral(info)).toEqual({
        origem: 'Meta CTWA',
        campanha: 'Campanha Verao',
      })
    })

    it('mapeia "meta_ads" com detected_by="message_pattern" para "Meta CTWA"', () => {
      const info: ReferralInfo = {
        referral_source: 'meta_ads',
        referral_data: { detected_by: 'message_pattern' },
      }
      expect(mapFromReferral(info)).toEqual({
        origem: 'Meta CTWA',
        campanha: null,
      })
    })

    it('mapeia "meta_ads" com detected_by="message_pattern_historical" para "Meta CTWA"', () => {
      const info: ReferralInfo = {
        referral_source: 'meta_ads',
        referral_data: { detected_by: 'message_pattern_historical' },
      }
      expect(mapFromReferral(info)).toEqual({
        origem: 'Meta CTWA',
        campanha: null,
      })
    })
  })

  describe('redirect', () => {
    it('mapeia "redirect" para "Meta Redirect" com utm_medium como campanha', () => {
      const info: ReferralInfo = {
        referral_source: 'redirect',
        referral_data: { utm_medium: 'cpc' },
      }
      expect(mapFromReferral(info)).toEqual({
        origem: 'Meta Redirect',
        campanha: 'cpc',
      })
    })

    it('mapeia "redirect" para "Meta Redirect" com campanha null quando utm_medium e null', () => {
      const info: ReferralInfo = {
        referral_source: 'redirect',
        referral_data: {},
      }
      expect(mapFromReferral(info)).toEqual({
        origem: 'Meta Redirect',
        campanha: null,
      })
    })

    it('mapeia "redirect" com utm_medium="{{adset.name}}" para campanha null (template nao resolvido)', () => {
      const info: ReferralInfo = {
        referral_source: 'redirect',
        referral_data: { utm_medium: '{{adset.name}}' },
      }
      const result = mapFromReferral(info)
      expect(result).not.toBeNull()
      expect(result!.origem).toBe('Meta Redirect')
      expect(result!.campanha).toBeNull()
    })
  })

  describe('linktree', () => {
    it('mapeia "linktree" para "Linktree" com campaign_name', () => {
      const info: ReferralInfo = {
        referral_source: 'linktree',
        referral_data: { campaign_name: 'promo-natal' },
      }
      expect(mapFromReferral(info)).toEqual({
        origem: 'Linktree',
        campanha: 'promo-natal',
      })
    })

    it('mapeia "linktree" para "Linktree" com campanha null', () => {
      const info: ReferralInfo = {
        referral_source: 'linktree',
        referral_data: {},
      }
      expect(mapFromReferral(info)).toEqual({
        origem: 'Linktree',
        campanha: null,
      })
    })
  })

  describe('site', () => {
    it('mapeia "site" para "Google/Site"', () => {
      const info: ReferralInfo = {
        referral_source: 'site',
        referral_data: {},
      }
      expect(mapFromReferral(info)).toEqual({
        origem: 'Google/Site',
        campanha: null,
      })
    })
  })

  describe('instagram_direct', () => {
    it('mapeia "instagram_direct" para "Instagram Direct" com campaign_name', () => {
      const info: ReferralInfo = {
        referral_source: 'instagram_direct',
        referral_data: { campaign_name: 'promo-instagram' },
      }
      expect(mapFromReferral(info)).toEqual({
        origem: 'Instagram Direct',
        campanha: 'promo-instagram',
      })
    })

    it('mapeia "instagram_direct" para "Instagram Direct" com campanha null', () => {
      const info: ReferralInfo = {
        referral_source: 'instagram_direct',
        referral_data: {},
      }
      expect(mapFromReferral(info)).toEqual({
        origem: 'Instagram Direct',
        campanha: null,
      })
    })
  })

  describe('referral_source desconhecido', () => {
    it('mapeia referral_source desconhecido para "Outro (xxx)"', () => {
      const info: ReferralInfo = {
        referral_source: 'tiktok',
        referral_data: {},
      }
      expect(mapFromReferral(info)).toEqual({
        origem: 'Outro (tiktok)',
        campanha: null,
      })
    })
  })
})

// ---------------------------------------------------------------------------
// mapFromContactOrigin
// ---------------------------------------------------------------------------
describe('mapFromContactOrigin', () => {
  it('mapeia "meta_ads" para "Meta Direto"', () => {
    expect(mapFromContactOrigin('meta_ads')).toEqual({
      origem: 'Meta Direto',
      campanha: null,
    })
  })

  it('mapeia "ctwa_ad" para "Meta CTWA"', () => {
    expect(mapFromContactOrigin('ctwa_ad')).toEqual({
      origem: 'Meta CTWA',
      campanha: null,
    })
  })

  it('mapeia "linktree" para "Linktree"', () => {
    expect(mapFromContactOrigin('linktree')).toEqual({
      origem: 'Linktree',
      campanha: null,
    })
  })

  it('mapeia "manual" para "Cadastro Manual"', () => {
    expect(mapFromContactOrigin('manual')).toEqual({
      origem: 'Cadastro Manual',
      campanha: null,
    })
  })

  it('mapeia "whatsapp" para "Organico (WhatsApp)"', () => {
    expect(mapFromContactOrigin('whatsapp')).toEqual({
      origem: 'Organico (WhatsApp)',
      campanha: null,
    })
  })

  it('mapeia "redirect" para "Meta Redirect"', () => {
    expect(mapFromContactOrigin('redirect')).toEqual({
      origem: 'Meta Redirect',
      campanha: null,
    })
  })

  it('mapeia "site" para "Google/Site"', () => {
    expect(mapFromContactOrigin('site')).toEqual({
      origem: 'Google/Site',
      campanha: null,
    })
  })

  it('mapeia "n8n" para "Automacao (n8n)"', () => {
    expect(mapFromContactOrigin('n8n')).toEqual({
      origem: 'Automacao (n8n)',
      campanha: null,
    })
  })

  it('mapeia "instagram_direct" para "Instagram Direct"', () => {
    expect(mapFromContactOrigin('instagram_direct')).toEqual({
      origem: 'Instagram Direct',
      campanha: null,
    })
  })

  it('mapeia null para "Organico (sem origem)"', () => {
    expect(mapFromContactOrigin(null)).toEqual({
      origem: 'Organico (sem origem)',
      campanha: null,
    })
  })

  it('mapeia string vazia para "Organico (sem origem)"', () => {
    expect(mapFromContactOrigin('')).toEqual({
      origem: 'Organico (sem origem)',
      campanha: null,
    })
  })

  it('mapeia string desconhecida para "Organico (sem origem)"', () => {
    expect(mapFromContactOrigin('valor_desconhecido')).toEqual({
      origem: 'Organico (sem origem)',
      campanha: null,
    })
  })

  it('todos os resultados tem campanha: null', () => {
    const inputs = ['meta_ads', 'ctwa_ad', 'linktree', 'manual', 'whatsapp', 'redirect', 'site', 'n8n', 'instagram_direct', null, '']
    for (const input of inputs) {
      const result = mapFromContactOrigin(input)
      expect(result.campanha).toBeNull()
    }
  })
})
