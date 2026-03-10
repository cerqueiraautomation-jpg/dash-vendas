export function detectOrigin(msg: string): string {
  if (!msg) return 'Organico'
  const lower = msg.toLowerCase()

  // Meta CTWA - links fb.me com conteúdo de anúncio
  if (lower.includes('fb.me/') || lower.includes('facebook.com/')) return 'Meta CTWA'

  // Meta Redirect - atendente recebeu contato
  if (lower.includes('recebi o seu contato')) return 'Meta Redirect'

  // Linktree
  if (lower.includes('vim pelo linktree') || lower.includes('linktree')) return 'Linktree'

  // Google/Site
  if (lower.includes('vim pelo site') || lower.includes('vim pelo google')) return 'Google/Site'

  // URL genérica com título de anúncio (padrão CTWA)
  if (lower.includes('url:') && (lower.includes('orçamento') || lower.includes('orcamento'))) return 'Meta CTWA'

  return 'Organico'
}

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '').slice(-9)
}

export function parseJetSalesDate(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10)
  }
  const str = String(value ?? '').trim()
  if (str.includes('/')) {
    const parts = str.split('/')
    if (parts.length === 3) {
      const [d, m, y] = parts
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    }
  }
  return str
}
