import { describe, it, expect } from 'vitest'
import { detectFromFingerprint } from './fingerprintDetector'
import type { Message } from './fingerprintDetector'

describe('detectFromFingerprint', () => {
  describe('retorna null quando nao ha match', () => {
    it('retorna null para array de mensagens vazio', () => {
      expect(detectFromFingerprint([])).toBeNull()
    })
    it('retorna null quando nenhuma mensagem bate com os patterns', () => {
      const messages: Message[] = [
        { content: 'Ola, quero um orcamento', is_from_me: false },
        { content: 'Claro! Quantas camisetas?', is_from_me: true },
      ]
      expect(detectFromFingerprint(messages)).toBeNull()
    })
  })

  describe('Linktree', () => {
    it('detecta "vim pelo Linktree" (case insensitive)', () => {
      const messages: Message[] = [{ content: 'Vim pelo Linktree', is_from_me: false }]
      expect(detectFromFingerprint(messages)).toEqual({ origem: 'Linktree', campanha: null })
    })
    it('detecta mensagem completa com "vim pelo Linktree"', () => {
      const messages: Message[] = [{ content: 'Ola, vim pelo Linktree e quero saber mais sobre as camisas personalizadas', is_from_me: false }]
      expect(detectFromFingerprint(messages)).toEqual({ origem: 'Linktree', campanha: null })
    })
  })

  describe('Google/Site', () => {
    it('detecta "vim pelo Site"', () => {
      const messages: Message[] = [{ content: 'vim pelo Site', is_from_me: false }]
      expect(detectFromFingerprint(messages)).toEqual({ origem: 'Google/Site', campanha: null })
    })
    it('detecta "vim pelo google"', () => {
      const messages: Message[] = [{ content: 'vim pelo google', is_from_me: false }]
      expect(detectFromFingerprint(messages)).toEqual({ origem: 'Google/Site', campanha: null })
    })
    it('detecta "pelo site" em mensagem curta', () => {
      const messages: Message[] = [{ content: 'pelo site', is_from_me: false }]
      expect(detectFromFingerprint(messages)).toEqual({ origem: 'Google/Site', campanha: null })
    })
    it('NAO detecta "pelo site" em mensagem longa', () => {
      const messages: Message[] = [{ content: 'eu nao comprei pelo site nao, foi presencial na loja mesmo', is_from_me: false }]
      expect(detectFromFingerprint(messages)).toBeNull()
    })
  })

  describe('Meta CTWA', () => {
    it('detecta "tenho interesse e queria mais informacoes" quando is_from_me=false', () => {
      const messages: Message[] = [{ content: 'tenho interesse e queria mais informacoes', is_from_me: false }]
      expect(detectFromFingerprint(messages)).toEqual({ origem: 'Meta CTWA', campanha: null })
    })
    it('NAO detecta "tenho interesse..." quando is_from_me=true', () => {
      const messages: Message[] = [{ content: 'tenho interesse e queria mais informacoes', is_from_me: true }]
      expect(detectFromFingerprint(messages)).toBeNull()
    })
  })

  describe('Meta Redirect', () => {
    it('detecta "recebi o seu contato aqui" quando is_from_me=true', () => {
      const messages: Message[] = [{ content: 'recebi o seu contato aqui', is_from_me: true }]
      expect(detectFromFingerprint(messages)).toEqual({ origem: 'Meta Redirect', campanha: null })
    })
    it('NAO detecta "recebi o seu contato" quando is_from_me=false', () => {
      const messages: Message[] = [{ content: 'recebi o seu contato aqui', is_from_me: false }]
      expect(detectFromFingerprint(messages)).toBeNull()
    })
  })

  describe('Instagram', () => {
    it('detecta "vim pelo Stories"', () => {
      const messages: Message[] = [{ content: 'vim pelo Stories', is_from_me: false }]
      expect(detectFromFingerprint(messages)).toEqual({ origem: 'Instagram Stories', campanha: null })
    })
    it('detecta "Vim pelo Instagram"', () => {
      const messages: Message[] = [{ content: 'Vim pelo Instagram', is_from_me: false }]
      expect(detectFromFingerprint(messages)).toEqual({ origem: 'Instagram Organico', campanha: null })
    })
    it('detecta "Vi no Instagram"', () => {
      const messages: Message[] = [{ content: 'Vi no Instagram', is_from_me: false }]
      expect(detectFromFingerprint(messages)).toEqual({ origem: 'Instagram Organico', campanha: null })
    })
    it('detecta "pelo instagram" em mensagem curta', () => {
      const messages: Message[] = [{ content: 'pelo instagram', is_from_me: false }]
      expect(detectFromFingerprint(messages)).toEqual({ origem: 'Instagram Organico', campanha: null })
    })
    it('NAO detecta "pelo instagram" em mensagem longa (>50 chars)', () => {
      const messages: Message[] = [{ content: 'eu nao comprei pelo instagram nao, foi presencial na loja', is_from_me: false }]
      expect(detectFromFingerprint(messages)).toBeNull()
    })
  })

  describe('Indicacao', () => {
    it('detecta "indicacao" (sem acento)', () => {
      const messages: Message[] = [{ content: 'indicacao', is_from_me: false }]
      expect(detectFromFingerprint(messages)).toEqual({ origem: 'Indicacao', campanha: null })
    })
    it('detecta "Recebi a indicacao de vcs"', () => {
      const messages: Message[] = [{ content: 'Recebi a indicacao de vcs', is_from_me: false }]
      expect(detectFromFingerprint(messages)).toEqual({ origem: 'Indicacao', campanha: null })
    })
  })

  describe('Meta Ads (via anuncio)', () => {
    it('detecta "vi no anuncio"', () => {
      const messages: Message[] = [{ content: 'vi no anuncio', is_from_me: false }]
      expect(detectFromFingerprint(messages)).toEqual({ origem: 'Meta Ads (via anuncio)', campanha: null })
    })
    it('detecta "vi a propaganda"', () => {
      const messages: Message[] = [{ content: 'vi a propaganda', is_from_me: false }]
      expect(detectFromFingerprint(messages)).toEqual({ origem: 'Meta Ads (via anuncio)', campanha: null })
    })
  })

  describe('Emprega Mais', () => {
    it('detecta "vim pelo Emprega Mais"', () => {
      const messages: Message[] = [{ content: 'vim pelo Emprega Mais', is_from_me: false }]
      expect(detectFromFingerprint(messages)).toEqual({ origem: 'Emprega Mais', campanha: null })
    })
  })

  describe('prioridade e edge cases', () => {
    it('primeiro match vence', () => {
      const messages: Message[] = [
        { content: 'vim pelo Linktree', is_from_me: false },
        { content: 'vim pelo Site', is_from_me: false },
      ]
      expect(detectFromFingerprint(messages)).toEqual({ origem: 'Linktree', campanha: null })
    })
    it('ignora mensagens com content null', () => {
      const messages: Message[] = [
        { content: null, is_from_me: false },
        { content: 'vim pelo Linktree', is_from_me: false },
      ]
      expect(detectFromFingerprint(messages)).toEqual({ origem: 'Linktree', campanha: null })
    })
    it('ignora mensagens is_from_me=true para patterns de cliente', () => {
      const messages: Message[] = [{ content: 'vim pelo Linktree', is_from_me: true }]
      expect(detectFromFingerprint(messages)).toBeNull()
    })
    it('todos os resultados tem campanha: null', () => {
      const testCases: Message[][] = [
        [{ content: 'vim pelo Linktree', is_from_me: false }],
        [{ content: 'vim pelo Site', is_from_me: false }],
        [{ content: 'tenho interesse e queria mais informacoes', is_from_me: false }],
        [{ content: 'recebi o seu contato aqui', is_from_me: true }],
        [{ content: 'vim pelo Stories', is_from_me: false }],
        [{ content: 'indicacao', is_from_me: false }],
        [{ content: 'vi a propaganda', is_from_me: false }],
        [{ content: 'vim pelo Emprega Mais', is_from_me: false }],
      ]
      for (const messages of testCases) {
        const result = detectFromFingerprint(messages)
        expect(result).not.toBeNull()
        expect(result!.campanha).toBeNull()
      }
    })
  })
})
