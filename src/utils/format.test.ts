import { describe, it, expect } from 'vitest'
import { getMonthLabel, formatCurrency, formatDate, formatPercent } from './format'

// ---------------------------------------------------------------------------
// getMonthLabel
// ---------------------------------------------------------------------------
describe('getMonthLabel', () => {
  it('converte 2025-01 para Jan 2025', () => {
    expect(getMonthLabel('2025-01')).toBe('Jan 2025')
  })

  it('converte 2025-12 para Dez 2025', () => {
    expect(getMonthLabel('2025-12')).toBe('Dez 2025')
  })

  it('converte 2026-03 para Mar 2026', () => {
    expect(getMonthLabel('2026-03')).toBe('Mar 2026')
  })

  it('converte 2026-06 para Jun 2026', () => {
    expect(getMonthLabel('2026-06')).toBe('Jun 2026')
  })

  it('retorna todos os 12 meses corretamente', () => {
    const expected = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    expected.forEach((name, i) => {
      const month = String(i + 1).padStart(2, '0')
      expect(getMonthLabel(`2025-${month}`)).toBe(`${name} 2025`)
    })
  })

  describe('edge cases', () => {
    it('retorna key original para mes invalido 00', () => {
      expect(getMonthLabel('2025-00')).toBe('2025-00')
    })

    it('retorna key original para mes invalido 13', () => {
      expect(getMonthLabel('2025-13')).toBe('2025-13')
    })

    it('retorna key original para formato invalido', () => {
      expect(getMonthLabel('invalido')).toBe('invalido')
    })

    it('retorna key original para string vazia', () => {
      expect(getMonthLabel('')).toBe('')
    })

    it('trata mes com um digito (sem zero)', () => {
      // '2025-3'.split('-') => ['2025', '3'], parseInt('3') - 1 = 2 => Mar
      expect(getMonthLabel('2025-3')).toBe('Mar 2025')
    })
  })
})

// ---------------------------------------------------------------------------
// formatCurrency
// ---------------------------------------------------------------------------
describe('formatCurrency', () => {
  it('formata valor inteiro', () => {
    const result = formatCurrency(1000)
    // pt-BR: R$ 1.000,00 (pode variar com non-breaking space)
    expect(result).toContain('1.000')
    expect(result).toContain('00')
    expect(result).toMatch(/R\$/)
  })

  it('formata valor com centavos', () => {
    const result = formatCurrency(1234.56)
    expect(result).toContain('1.234')
    expect(result).toContain('56')
    expect(result).toMatch(/R\$/)
  })

  it('formata zero', () => {
    const result = formatCurrency(0)
    expect(result).toMatch(/R\$/)
    expect(result).toContain('0,00')
  })

  it('formata valor negativo', () => {
    const result = formatCurrency(-500)
    expect(result).toMatch(/R\$/)
    expect(result).toContain('500')
  })

  it('formata valor grande (R$ 970.635,78 - total real do projeto)', () => {
    const result = formatCurrency(970635.78)
    expect(result).toContain('970.635')
    expect(result).toContain('78')
    expect(result).toMatch(/R\$/)
  })

  it('formata valor pequeno com centavos', () => {
    const result = formatCurrency(0.99)
    expect(result).toMatch(/R\$/)
    expect(result).toContain('0,99')
  })
})

// ---------------------------------------------------------------------------
// formatDate
// ---------------------------------------------------------------------------
describe('formatDate', () => {
  it('formata data ISO para pt-BR', () => {
    const result = formatDate('2025-01-15')
    expect(result).toBe('15/01/2025')
  })

  it('formata data de inicio de ano', () => {
    const result = formatDate('2025-01-01')
    expect(result).toBe('01/01/2025')
  })

  it('formata data de fim de ano', () => {
    const result = formatDate('2025-12-31')
    expect(result).toBe('31/12/2025')
  })

  it('formata data de marco 2026 (mes atual do projeto)', () => {
    const result = formatDate('2026-03-10')
    expect(result).toBe('10/03/2026')
  })

  it('formata data com dia 29 de fevereiro (ano bissexto)', () => {
    const result = formatDate('2024-02-29')
    expect(result).toBe('29/02/2024')
  })
})

// ---------------------------------------------------------------------------
// formatPercent
// ---------------------------------------------------------------------------
describe('formatPercent', () => {
  it('formata percentual inteiro', () => {
    expect(formatPercent(50)).toBe('50.0%')
  })

  it('formata percentual com decimal', () => {
    expect(formatPercent(33.33)).toBe('33.3%')
  })

  it('formata zero', () => {
    expect(formatPercent(0)).toBe('0.0%')
  })

  it('formata 100%', () => {
    expect(formatPercent(100)).toBe('100.0%')
  })

  it('formata valor negativo', () => {
    expect(formatPercent(-5.5)).toBe('-5.5%')
  })

  it('formata valor com muitas casas decimais (arredonda para 1)', () => {
    expect(formatPercent(33.3333)).toBe('33.3%')
  })

  it('formata valor que arredonda para cima', () => {
    expect(formatPercent(66.6666)).toBe('66.7%')
  })

  it('formata valor maior que 100', () => {
    expect(formatPercent(150.5)).toBe('150.5%')
  })

  it('formata valor muito pequeno', () => {
    expect(formatPercent(0.1)).toBe('0.1%')
  })
})
