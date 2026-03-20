import type { Venda } from '../lib/supabase'
import { formatCurrency } from '../utils/format'

type Props = { vendas: Venda[] }

export function ChartCampanha({ vendas }: Props) {
  const metaVendas = vendas.filter(v => v.origem.startsWith('Meta'))

  const byCampanha = metaVendas.reduce((acc, v) => {
    const key = v.campanha || 'Sem campanha'
    if (!acc[key]) acc[key] = { campanha: key, count: 0, valor: 0 }
    acc[key].count += 1
    acc[key].valor += v.valor
    return acc
  }, {} as Record<string, { campanha: string; count: number; valor: number }>)

  const data = Object.values(byCampanha).sort((a, b) => b.valor - a.valor)

  const byTipo = metaVendas.reduce((acc, v) => {
    const tipo = v.origem
    if (!acc[tipo]) acc[tipo] = { tipo, count: 0, valor: 0 }
    acc[tipo].count += 1
    acc[tipo].valor += v.valor
    return acc
  }, {} as Record<string, { tipo: string; count: number; valor: number }>)

  const tipoData = Object.values(byTipo).sort((a, b) => b.valor - a.valor)
  const tipoColors: Record<string, string> = {
    'Meta Redirect': '#f97316',
    'Meta CTWA': '#eab308',
    'Meta Direto': '#ef4444',
  }

  return (
    <div className="glass-card rounded-xl p-4">
      <h3 className="text-sm font-semibold mb-3 text-slate-300">Meta Ads - Detalhamento</h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-slate-400 mb-2">Por tipo de entrada</p>
          <div className="space-y-2">
            {tipoData.map(t => {
              const pct = metaVendas.length > 0 ? (t.count / metaVendas.length) * 100 : 0
              return (
                <div key={t.tipo}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">{t.tipo}</span>
                    <span className="text-slate-400">{t.count}x - {formatCurrency(t.valor)}</span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: tipoColors[t.tipo] || '#64748b' }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <div>
          <p className="text-xs text-slate-400 mb-2">Por campanha/anuncio</p>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {data.map(d => (
              <div key={d.campanha} className="flex items-center justify-between text-xs py-1 border-b border-slate-700/50">
                <span className="text-slate-300 truncate mr-2">{d.campanha}</span>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-slate-400">{d.count}x</span>
                  <span className="font-medium w-20 text-right">{formatCurrency(d.valor)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
