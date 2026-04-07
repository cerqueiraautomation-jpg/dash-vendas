import { describe, it, expect } from 'vitest'
import {
  normalizeBrPhone,
  extractPhonesFromText,
  buildPhoneToIgContactMap,
} from './instagramDirectMatcher'
import type { IgMessage, IgContactConvMap } from './instagramDirectMatcher'

// ---------------------------------------------------------------------------
// normalizeBrPhone
// ---------------------------------------------------------------------------
describe('normalizeBrPhone', () => {
  it('normaliza 11 digitos puros (DDD + celular)', () => {
    expect(normalizeBrPhone('11987654321')).toBe('987654321')
  })

  it('normaliza com prefixo +55', () => {
    expect(normalizeBrPhone('+5511987654321')).toBe('987654321')
  })

  it('normaliza com parenteses e hifen', () => {
    expect(normalizeBrPhone('(11) 98765-4321')).toBe('987654321')
  })

  it('normaliza 10 digitos (sem 9 inicial) adicionando o 9', () => {
    expect(normalizeBrPhone('1187654321')).toBe('987654321')
  })

  it('rejeita string vazia', () => {
    expect(normalizeBrPhone('')).toBeNull()
  })

  it('rejeita texto sem digitos', () => {
    expect(normalizeBrPhone('abc')).toBeNull()
  })

  it('rejeita sequencia muito curta', () => {
    expect(normalizeBrPhone('12345')).toBeNull()
  })

  it('rejeita prefixo ig:', () => {
    expect(normalizeBrPhone('ig:1234567890')).toBeNull()
  })

  it('rejeita 9 digitos puros (sem DDD)', () => {
    expect(normalizeBrPhone('987654321')).toBeNull()
  })

  it('rejeita DDD invalido (menor que 11)', () => {
    expect(normalizeBrPhone('10987654321')).toBeNull()
  })

  it('rejeita primeiro digito do celular invalido (menor que 6)', () => {
    expect(normalizeBrPhone('11587654321')).toBeNull()
  })

  it('aceita +55 com espacos e parenteses', () => {
    expect(normalizeBrPhone('+55 (11) 98765-4321')).toBe('987654321')
  })
})

// ---------------------------------------------------------------------------
// extractPhonesFromText
// ---------------------------------------------------------------------------
describe('extractPhonesFromText', () => {
  it('extrai um telefone simples no meio do texto', () => {
    expect(extractPhonesFromText('meu numero e 11987654321')).toEqual(['987654321'])
  })

  it('extrai dois telefones formatados', () => {
    expect(
      extractPhonesFromText('tel: (11) 98765-4321 ou (11) 91234-5678')
    ).toEqual(['987654321', '912345678'])
  })

  it('retorna array vazio quando nao ha telefone', () => {
    expect(extractPhonesFromText('Nada aqui')).toEqual([])
  })

  it('IGNORA digitos dentro de URL do CDN Meta', () => {
    expect(
      extractPhonesFromText('Confira em https://lookaside.fbsbx.com/1234567890123/foto.jpg')
    ).toEqual([])
  })

  it('extrai telefone fora da URL mas ignora digitos da URL', () => {
    expect(
      extractPhonesFromText('Visita https://site.com/123 — whatsapp 11987654321')
    ).toEqual(['987654321'])
  })

  it('IGNORA query params com digitos longos em URL', () => {
    expect(
      extractPhonesFromText('Compartilhou: https://lookaside.fbsbx.com/asset.jpg?_nc_cb=9876543210')
    ).toEqual([])
  })

  it('NAO aceita 9 digitos puros sem DDD', () => {
    expect(extractPhonesFromText('O telefone e 987654321')).toEqual([])
  })

  it('extrai dois telefones distintos do mesmo texto', () => {
    expect(
      extractPhonesFromText('Meus dois numeros: 11987654321 e 11988887777')
    ).toEqual(['987654321', '988887777'])
  })

  it('deduplica telefones repetidos', () => {
    expect(
      extractPhonesFromText('liga 11987654321 ou 11987654321')
    ).toEqual(['987654321'])
  })

  it('ignora www.', () => {
    expect(extractPhonesFromText('site www.foo.com/1234567890')).toEqual([])
  })

  it('aceita string vazia', () => {
    expect(extractPhonesFromText('')).toEqual([])
  })

  it('ignora mensagens acima do limite de tamanho (ReDoS guard)', () => {
    // 5001 chars: acima do MAX_MESSAGE_LENGTH_FOR_PHONE_EXTRACTION (5000)
    const longText = 'a'.repeat(4990) + ' 11987654321'
    expect(extractPhonesFromText(longText)).toEqual([])
  })

  it('aceita mensagem exatamente no limite de tamanho', () => {
    // Exatamente 5000 chars, com phone no final
    const text = 'a'.repeat(4988) + ' 11987654321'
    expect(text.length).toBe(5000)
    expect(extractPhonesFromText(text)).toEqual(['987654321'])
  })
})

// ---------------------------------------------------------------------------
// buildPhoneToIgContactMap
// ---------------------------------------------------------------------------
describe('buildPhoneToIgContactMap', () => {
  function makeMap(entries: [string, string][]): IgContactConvMap {
    return { convToContact: new Map(entries) }
  }

  it('retorna Map vazio para array vazio', () => {
    const result = buildPhoneToIgContactMap([], makeMap([]))
    expect(result.size).toBe(0)
  })

  it('1 mensagem com 1 phone gera Map com 1 entry', () => {
    const messages: IgMessage[] = [
      { conversation_id: 'conv-1', content: 'meu zap 11987654321' },
    ]
    const map = makeMap([['conv-1', 'ig-contact-A']])
    const result = buildPhoneToIgContactMap(messages, map)

    expect(result.size).toBe(1)
    expect(result.get('987654321')).toBe('ig-contact-A')
  })

  it('1 mensagem com 2 phones gera Map com 2 entries do mesmo contato', () => {
    const messages: IgMessage[] = [
      { conversation_id: 'conv-1', content: 'tenho 11987654321 e 11988887777' },
    ]
    const map = makeMap([['conv-1', 'ig-contact-A']])
    const result = buildPhoneToIgContactMap(messages, map)

    expect(result.size).toBe(2)
    expect(result.get('987654321')).toBe('ig-contact-A')
    expect(result.get('988887777')).toBe('ig-contact-A')
  })

  it('2 mensagens de conversas/contatos diferentes geram 2 entries distintas', () => {
    const messages: IgMessage[] = [
      { conversation_id: 'conv-1', content: 'meu zap 11987654321' },
      { conversation_id: 'conv-2', content: 'meu zap 11988887777' },
    ]
    const map = makeMap([
      ['conv-1', 'ig-contact-A'],
      ['conv-2', 'ig-contact-B'],
    ])
    const result = buildPhoneToIgContactMap(messages, map)

    expect(result.size).toBe(2)
    expect(result.get('987654321')).toBe('ig-contact-A')
    expect(result.get('988887777')).toBe('ig-contact-B')
  })

  it('mesmo phone em conversas diferentes mantem o PRIMEIRO contato', () => {
    const messages: IgMessage[] = [
      { conversation_id: 'conv-1', content: 'zap 11987654321' },
      { conversation_id: 'conv-2', content: 'zap 11987654321' },
    ]
    const map = makeMap([
      ['conv-1', 'ig-contact-A'],
      ['conv-2', 'ig-contact-B'],
    ])
    const result = buildPhoneToIgContactMap(messages, map)

    expect(result.size).toBe(1)
    expect(result.get('987654321')).toBe('ig-contact-A')
  })

  it('ignora mensagens cujo conversation_id nao esta no map', () => {
    const messages: IgMessage[] = [
      { conversation_id: 'conv-orfa', content: 'zap 11987654321' },
    ]
    const map = makeMap([['conv-1', 'ig-contact-A']])
    const result = buildPhoneToIgContactMap(messages, map)

    expect(result.size).toBe(0)
  })

  it('ignora mensagem sem phone valido', () => {
    const messages: IgMessage[] = [
      { conversation_id: 'conv-1', content: 'oi tudo bem?' },
      { conversation_id: 'conv-1', content: 'foto: https://lookaside.fbsbx.com/1234567890/x.jpg' },
    ]
    const map = makeMap([['conv-1', 'ig-contact-A']])
    const result = buildPhoneToIgContactMap(messages, map)

    expect(result.size).toBe(0)
  })
})
