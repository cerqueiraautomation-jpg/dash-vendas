import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import type { Venda } from '../lib/supabase'
import { formatCurrency } from '../utils/format'

type Props = { vendas: Venda[] }

interface VendedorTooltipProps {
  active?: boolean
  payload?: Array<{
    payload: { vendedor: string; valor: number; count: number; rank: number; percentual: number; ticket: number }
  }>
}

function CustomTooltip({ active, payload }: VendedorTooltipProps) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div style={{ background: '#141b2d', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
      <p style={{ color: '#e2e8f0', fontWeight: 600, marginBottom: 4 }}>#{d.rank} {d.vendedor}</p>
      <p style={{ color: '#94a3b8' }}>Faturamento: <span style={{ color: '#60a5fa' }}>{formatCurrency(d.valor)}</span></p>
      <p style={{ color: '#94a3b8' }}>{d.count} vendas &middot; {d.percentual.toFixed(1)}% do total</p>
      <p style={{ color: '#94a3b8' }}>Ticket medio: <span style={{ color: '#a78bfa' }}>{formatCurrency(d.ticket)}</span></p>
    </div>
  )
}

export function ChartVendedor({ vendas }: Props) {
  const totalFaturamento = vendas.reduce((s, v) => s + v.valor, 0)

  const byVendedor = vendas.reduce((acc, v) => {
    if (!acc[v.vendedor]) acc[v.vendedor] = { vendedor: v.vendedor, valor: 0, count: 0 }
    acc[v.vendedor].valor += v.valor
    acc[v.vendedor].count += 1
    return acc
  }, {} as Record<string, { vendedor: string; valor: number; count: number }>)

  const data = Object.values(byVendedor)
    .sort((a, b) => b.valor - a.valor)
    .map((d, i) => ({
      ...d,
      rank: i + 1,
      percentual: totalFaturamento > 0 ? (d.valor / totalFaturamento) * 100 : 0,
      ticket: d.count > 0 ? d.valor / d.count : 0,
      label: `#${i + 1} ${d.vendedor}`,
    }))

  return (
    <div className="glass-card rounded-xl p-4">
      <h3 className="text-sm font-semibold mb-3 text-slate-300">Faturamento por Vendedor</h3>
      <div className="h-64">
        <ResponsiveContainer>
          <BarChart data={data} layout="vertical" margin={{ left: 10, right: 10 }}>
            <defs>
              <linearGradient id="vendedorGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" horizontal={false} />
            <XAxis type="number" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <YAxis type="category" dataKey="label" width={140} tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar dataKey="valor" fill="url(#vendedorGrad)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
