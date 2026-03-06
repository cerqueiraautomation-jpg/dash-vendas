import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import type { Venda } from '../lib/supabase'
import { formatCurrency } from '../utils/format'

type Props = { vendas: Venda[] }

const COLORS: Record<string, string> = {
  'Organico (sem origem)': '#3b82f6',
  'Organico (WhatsApp)': '#22c55e',
  'Cadastro Manual': '#a855f7',
  'Meta Redirect': '#f97316',
  'Meta CTWA': '#eab308',
  'Meta Direto': '#ef4444',
  'Nao encontrado': '#64748b',
  'Linktree': '#06b6d4',
  'Google/Site': '#10b981',
}

export function ChartOrigem({ vendas }: Props) {
  const byOrigem = vendas.reduce((acc, v) => {
    acc[v.origem] = (acc[v.origem] || 0) + v.valor
    return acc
  }, {} as Record<string, number>)

  const countByOrigem = vendas.reduce((acc, v) => {
    acc[v.origem] = (acc[v.origem] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const data = Object.entries(byOrigem)
    .map(([name, value]) => ({ name, value, count: countByOrigem[name] }))
    .sort((a, b) => b.value - a.value)

  return (
    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
      <h3 className="text-sm font-semibold mb-3 text-slate-300">Faturamento por Origem</h3>
      <div className="flex flex-col lg:flex-row items-center gap-4">
        <div className="w-48 h-48">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={data} dataKey="value" cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
                {data.map(d => (
                  <Cell key={d.name} fill={COLORS[d.name] || '#64748b'} />
                ))}
              </Pie>
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={((val: number) => formatCurrency(val)) as any}
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-1.5 text-xs w-full">
          {data.map(d => (
            <div key={d.name} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[d.name] || '#64748b' }} />
                <span className="text-slate-300 truncate">{d.name}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-slate-400">{d.count}x</span>
                <span className="font-medium w-24 text-right">{formatCurrency(d.value)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
