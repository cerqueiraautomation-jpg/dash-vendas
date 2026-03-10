import { describe, it, expect } from 'vitest'
import { detectOrigin, normalizePhone, parseJetSalesDate } from './originDetector'

// ---------------------------------------------------------------------------
// detectOrigin
// ---------------------------------------------------------------------------
describe('detectOrigin', () => {
  describe('Meta CTWA - links fb.me e facebook.com', () => {
    it('detecta link fb.me curto', () => {
      expect(detectOrigin('https://fb.me/abc123')).toBe('Meta CTWA')
    })

    it('detecta link fb.me no meio da mensagem', () => {
      expect(detectOrigin('Oi, vim pelo anuncio https://fb.me/1kj2h3 quero orcamento')).toBe('Meta CTWA')
    })

    it('detecta link facebook.com', () => {
      expect(detectOrigin('Vi no facebook.com/spacepersonalizados')).toBe('Meta CTWA')
    })

    it('detecta fb.me case-insensitive', () => {
      expect(detectOrigin('HTTPS://FB.ME/ABC123')).toBe('Meta CTWA')
    })

    it('detecta facebook.com case-insensitive', () => {
      expect(detectOrigin('Achei no FACEBOOK.COM/pagina')).toBe('Meta CTWA')
    })

    // Real JetSales 1a Mensagem pattern
    it('detecta mensagem real JetSales com fb.me', () => {
      expect(detectOrigin('Olá! Vi seu anúncio https://fb.me/7xKd2mN e gostaria de um orçamento para camisetas personalizadas')).toBe('Meta CTWA')
    })
  })

  describe('Meta CTWA - URL com orcamento', () => {
    it('detecta url: com orçamento (acento)', () => {
      expect(detectOrigin('url: https://example.com - orçamento de camisetas')).toBe('Meta CTWA')
    })

    it('detecta url: com orcamento (sem acento)', () => {
      expect(detectOrigin('url: https://example.com - orcamento personalizado')).toBe('Meta CTWA')
    })

    it('nao detecta url: sem orcamento', () => {
      expect(detectOrigin('url: https://example.com - apenas curiosidade')).toBe('Organico')
    })
  })

  describe('Meta Redirect', () => {
    it('detecta "recebi o seu contato"', () => {
      expect(detectOrigin('Olá! Recebi o seu contato pelo WhatsApp')).toBe('Meta Redirect')
    })

    it('detecta case-insensitive', () => {
      expect(detectOrigin('RECEBI O SEU CONTATO via formulário')).toBe('Meta Redirect')
    })

    // Real JetSales pattern
    it('detecta mensagem real JetSales redirect', () => {
      expect(detectOrigin('Boa tarde! Recebi o seu contato sobre uniformes, como posso ajudar?')).toBe('Meta Redirect')
    })
  })

  describe('Linktree', () => {
    it('detecta "vim pelo linktree"', () => {
      expect(detectOrigin('Oi, vim pelo linktree de vocês')).toBe('Linktree')
    })

    it('detecta apenas "linktree"', () => {
      expect(detectOrigin('Vi o linktree e achei interessante')).toBe('Linktree')
    })

    it('detecta case-insensitive', () => {
      expect(detectOrigin('VIM PELO LINKTREE')).toBe('Linktree')
    })

    it('detecta "Linktree" capitalizado', () => {
      expect(detectOrigin('Achei pelo Linktree')).toBe('Linktree')
    })
  })

  describe('Google/Site', () => {
    it('detecta "vim pelo site"', () => {
      expect(detectOrigin('Oi, vim pelo site de vocês')).toBe('Google/Site')
    })

    it('detecta "vim pelo google"', () => {
      expect(detectOrigin('Vim pelo Google e achei vocês')).toBe('Google/Site')
    })

    it('detecta case-insensitive', () => {
      expect(detectOrigin('VIM PELO GOOGLE procurando camisetas')).toBe('Google/Site')
    })

    // Real JetSales pattern
    it('detecta mensagem real JetSales site', () => {
      expect(detectOrigin('Olá! Vim pelo site, quero fazer um pedido de 50 camisetas')).toBe('Google/Site')
    })
  })

  describe('Organico (fallback)', () => {
    it('retorna Organico para mensagem sem pattern', () => {
      expect(detectOrigin('Olá, gostaria de um orçamento')).toBe('Organico')
    })

    it('retorna Organico para string vazia', () => {
      expect(detectOrigin('')).toBe('Organico')
    })

    it('retorna Organico para mensagem generica', () => {
      expect(detectOrigin('Boa tarde, quanto custa?')).toBe('Organico')
    })

    it('retorna Organico para mensagem com apenas numeros', () => {
      expect(detectOrigin('12345')).toBe('Organico')
    })

    it('retorna Organico para mensagem com caracteres especiais', () => {
      expect(detectOrigin('!@#$%^&*()')).toBe('Organico')
    })
  })

  describe('prioridade dos patterns', () => {
    it('fb.me tem prioridade sobre linktree', () => {
      expect(detectOrigin('https://fb.me/abc vim pelo linktree')).toBe('Meta CTWA')
    })

    it('fb.me tem prioridade sobre recebi o seu contato', () => {
      expect(detectOrigin('https://fb.me/abc recebi o seu contato')).toBe('Meta CTWA')
    })

    it('recebi o seu contato tem prioridade sobre linktree', () => {
      expect(detectOrigin('recebi o seu contato linktree')).toBe('Meta Redirect')
    })

    it('linktree tem prioridade sobre vim pelo site', () => {
      expect(detectOrigin('vim pelo linktree e vim pelo site')).toBe('Linktree')
    })
  })
})

// ---------------------------------------------------------------------------
// normalizePhone
// ---------------------------------------------------------------------------
describe('normalizePhone', () => {
  it('normaliza telefone completo brasileiro com DDI+DDD', () => {
    // 5514999002858 -> ultimos 9 digitos = 999002858
    expect(normalizePhone('5514999002858')).toBe('999002858')
  })

  it('normaliza telefone com DDD', () => {
    expect(normalizePhone('14999002858')).toBe('999002858')
  })

  it('normaliza telefone formatado com parenteses e hifen', () => {
    // (65) 99233-3759 -> 6599233375 -> ultimos 9 = 992333759
    expect(normalizePhone('(65) 99233-3759')).toBe('992333759')
  })

  it('normaliza telefone formatado com espacos', () => {
    expect(normalizePhone('55 14 99900-2858')).toBe('999002858')
  })

  it('normaliza telefone so com 9 digitos', () => {
    expect(normalizePhone('999002858')).toBe('999002858')
  })

  it('normaliza telefone com +55', () => {
    expect(normalizePhone('+5514999002858')).toBe('999002858')
  })

  it('normaliza telefone com pontos', () => {
    expect(normalizePhone('55.14.99900.2858')).toBe('999002858')
  })

  it('retorna string vazia para entrada vazia', () => {
    expect(normalizePhone('')).toBe('')
  })

  it('normaliza telefone curto (menos de 9 digitos)', () => {
    expect(normalizePhone('12345')).toBe('12345')
  })

  it('remove letras e caracteres especiais', () => {
    expect(normalizePhone('abc55def14ghi999002858')).toBe('999002858')
  })
})

// ---------------------------------------------------------------------------
// parseJetSalesDate
// ---------------------------------------------------------------------------
describe('parseJetSalesDate', () => {
  describe('formato DD/MM/YYYY (padrao JetSales)', () => {
    it('converte 01/01/2025 para 2025-01-01', () => {
      expect(parseJetSalesDate('01/01/2025')).toBe('2025-01-01')
    })

    it('converte 15/03/2026 para 2026-03-15', () => {
      expect(parseJetSalesDate('15/03/2026')).toBe('2026-03-15')
    })

    it('converte 5/1/2025 com padding (dia e mes sem zero)', () => {
      expect(parseJetSalesDate('5/1/2025')).toBe('2025-01-05')
    })

    it('converte 31/12/2025 para 2025-12-31', () => {
      expect(parseJetSalesDate('31/12/2025')).toBe('2025-12-31')
    })
  })

  describe('objeto Date', () => {
    it('converte Date object para ISO string', () => {
      const date = new Date('2025-06-15T10:30:00Z')
      expect(parseJetSalesDate(date)).toBe('2025-06-15')
    })

    it('converte Date no inicio do dia', () => {
      const date = new Date('2025-01-01T00:00:00Z')
      expect(parseJetSalesDate(date)).toBe('2025-01-01')
    })
  })

  describe('formato ISO (passthrough)', () => {
    it('retorna string ISO como esta', () => {
      expect(parseJetSalesDate('2025-03-10')).toBe('2025-03-10')
    })

    it('retorna string ISO com hora (trimmed)', () => {
      expect(parseJetSalesDate('2025-03-10T14:30:00')).toBe('2025-03-10T14:30:00')
    })
  })

  describe('edge cases', () => {
    it('retorna string vazia para null', () => {
      expect(parseJetSalesDate(null)).toBe('')
    })

    it('retorna string vazia para undefined', () => {
      expect(parseJetSalesDate(undefined)).toBe('')
    })

    it('retorna string vazia para string vazia', () => {
      expect(parseJetSalesDate('')).toBe('')
    })

    it('retorna string trimada para string com espacos', () => {
      expect(parseJetSalesDate('  2025-03-10  ')).toBe('2025-03-10')
    })

    it('converte numero para string', () => {
      expect(parseJetSalesDate(20250310)).toBe('20250310')
    })

    it('trata data com apenas 2 partes separadas por /', () => {
      // So 2 partes, nao entra no if de parts.length === 3
      expect(parseJetSalesDate('01/2025')).toBe('01/2025')
    })
  })
})
