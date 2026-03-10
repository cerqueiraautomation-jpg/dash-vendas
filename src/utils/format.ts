const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export function getMonthLabel(key: string): string {
  const [year, month] = key.split('-')
  const idx = parseInt(month, 10) - 1
  if (idx >= 0 && idx < 12) return `${MONTH_NAMES[idx]} ${year}`
  return key
}

export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatDate(date: string): string {
  return new Date(date + 'T12:00:00').toLocaleDateString('pt-BR')
}

export function formatPercent(value: number): string {
  return value.toFixed(1) + '%'
}
