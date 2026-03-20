import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { Venda } from '../lib/supabase'
import { formatCurrency } from '../utils/format'

type Props = { vendas: Venda[] }

export function ChartVendedor({ vendas }: Props) {
  const byVendedor = vendas.reduce((acc, v) => {
    if (!acc[v.vendedor]) acc[v.vendedor] = { vendedor: v.vendedor, valor: 0, count: 0 }
    acc[v.vendedor].valor += v.valor
    acc[v.vendedor].count += 1
    return acc
  }, {} as Record<string, { vendedor: string; valor: number; count: number }>)

  const data = Object.values(byVendedor).sort((a, b) => b.valor - a.valor)

  return (
    <div className="glass-card rounded-xl p-4">
      <h3 className="text-sm font-semibold mb-3 text-slate-300">Faturamento por Vendedor</h3>
      <div className="h-64">
        <ResponsiveContainer>
          <BarChart data={data} layout="vertical" margin={{ left: 10, right: 10 }}>
            <XAxis type="number" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <YAxis type="category" dataKey="vendedor" width={120} tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={((val: number, _name: string, props: any) => [formatCurrency(val), `${props.payload.count} vendas`]) as any}
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
            />
            <Bar dataKey="valor" fill="#3b82f6" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
