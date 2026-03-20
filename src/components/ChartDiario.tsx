import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import type { Venda } from '../lib/supabase'
import { formatCurrency } from '../utils/format'

type Props = { vendas: Venda[] }

export function ChartDiario({ vendas }: Props) {
  const byDay = vendas.reduce((acc, v) => {
    const d = v.data_pedido
    if (!acc[d]) acc[d] = { data: d, valor: 0, count: 0 }
    acc[d].valor += v.valor
    acc[d].count += 1
    return acc
  }, {} as Record<string, { data: string; valor: number; count: number }>)

  const data = Object.values(byDay).sort((a, b) => a.data.localeCompare(b.data))

  return (
    <div className="glass-card rounded-xl p-4">
      <h3 className="text-sm font-semibold mb-3 text-slate-300">Faturamento Diario</h3>
      <div className="h-64">
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ left: 0, right: 10 }}>
            <defs>
              <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="data"
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              tickFormatter={d => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
            />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              labelFormatter={d => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={((val: number, _name: string, props: any) => [formatCurrency(val), `${props.payload.count} vendas`]) as any}
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
            />
            <Area type="monotone" dataKey="valor" stroke="#3b82f6" fill="url(#colorValor)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
