import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import type { Venda } from '../lib/supabase'
import { formatCurrency } from '../utils/format'

type Props = {
  vendas: Venda[]
  activeOrigem?: string | null
  onOrigemClick?: (origem: string) => void
}

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

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    name: string
    value: number
    payload: { name: string; value: number; count: number }
  }>
  totalValue: number
}

function CustomTooltip({ active, payload, totalValue }: CustomTooltipProps) {
  if (!active || !payload || !payload[0]) return null
  const { name, value, count } = payload[0].payload
  const pct = totalValue > 0 ? ((value / totalValue) * 100).toFixed(1) : '0.0'
  const ticketMedio = count > 0 ? value / count : 0

  return (
    <div
      style={{
        background: '#141b2d',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 8,
        padding: '8px 12px',
        fontSize: 12,
      }}
    >
      <p className="text-slate-200 font-medium mb-1">{name}</p>
      <p className="text-slate-300">{formatCurrency(value)} ({pct}%)</p>
      <p className="text-slate-400">{count}x &middot; Ticket: {formatCurrency(ticketMedio)}</p>
    </div>
  )
}

export function ChartOrigem({ vendas, activeOrigem, onOrigemClick }: Props) {
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

  const totalValue = data.reduce((sum, d) => sum + d.value, 0)
  const maxValue = data.length > 0 ? data[0].value : 1

  return (
    <div className="glass-card rounded-xl p-4">
      <h3 className="text-sm font-semibold mb-3 text-slate-300">Faturamento por Origem</h3>
      <div className="flex flex-col lg:flex-row items-center gap-4">
        <div className="w-48 h-48">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                cx="50%"
                cy="50%"
                outerRadius={80}
                innerRadius={40}
                stroke="#0a0f1a"
                strokeWidth={2}
                style={{ cursor: onOrigemClick ? 'pointer' : 'default' }}
                onClick={onOrigemClick ? (_: unknown, index: number) => onOrigemClick(data[index].name) : undefined}
              >
                {data.map(d => (
                  <Cell
                    key={d.name}
                    fill={COLORS[d.name] || '#64748b'}
                    opacity={activeOrigem && activeOrigem !== d.name ? 0.3 : 1}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip totalValue={totalValue} />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-1.5 text-xs w-full">
          {data.map(d => {
            const pct = totalValue > 0 ? ((d.value / totalValue) * 100).toFixed(1) : '0.0'
            const barWidth = maxValue > 0 ? (d.value / maxValue) * 100 : 0
            const color = COLORS[d.name] || '#64748b'

            return (
              <div
                key={d.name}
                onClick={() => onOrigemClick?.(d.name)}
                className={`relative flex items-center justify-between gap-2 rounded-lg px-2 py-1 transition-all ${
                  onOrigemClick ? 'cursor-pointer hover:bg-white/[0.05]' : 'hover:bg-white/[0.03]'
                } ${activeOrigem === d.name ? 'bg-white/[0.06] ring-1 ring-white/10' : ''} ${
                  activeOrigem && activeOrigem !== d.name ? 'opacity-40' : ''
                }`}
              >
                {/* Percentage bar background */}
                <div
                  className="absolute inset-0 rounded-lg opacity-[0.06] pointer-events-none"
                  style={{
                    background: color,
                    width: `${barWidth}%`,
                  }}
                />
                <div className="flex items-center gap-2 relative z-10">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                  <span className="text-slate-300 truncate">{d.name}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0 relative z-10">
                  <span className="text-slate-500 tabular-nums">{pct}%</span>
                  <span className="text-slate-400">{d.count}x</span>
                  <span className="font-medium w-24 text-right">{formatCurrency(d.value)}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
