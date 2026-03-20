import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import type { Venda } from '../lib/supabase'
import { formatCurrency } from '../utils/format'

type Props = { vendas: Venda[] }

interface DayData {
  data: string
  valor: number
  count: number
}

interface TooltipPayloadItem {
  value: number
  payload: DayData
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: string
}) {
  if (!active || !payload || payload.length === 0) return null

  const { valor, count } = payload[0].payload
  const ticketMedio = count > 0 ? valor / count : 0
  const formattedLabel = label
    ? new Date(label + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
    : ''

  return (
    <div style={{
      backgroundColor: '#141b2d',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '10px',
      padding: '10px 14px',
      fontSize: 12,
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    }}>
      <p style={{ color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>{formattedLabel}</p>
      <p style={{ color: '#60a5fa', margin: '3px 0' }}>
        Faturamento: {formatCurrency(valor)}
      </p>
      <p style={{ color: '#06b6d4', margin: '3px 0' }}>
        {count} vendas
      </p>
      <p style={{ color: '#a855f7', margin: '3px 0', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 4 }}>
        Ticket Medio: {formatCurrency(ticketMedio)}
      </p>
    </div>
  )
}

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
              <linearGradient id="colorValorDiario" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.45} />
                <stop offset="40%" stopColor="#a855f7" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#a855f7" stopOpacity={0.02} />
              </linearGradient>
              <filter id="glowStroke">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
            <XAxis
              dataKey="data"
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              tickFormatter={d => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
            />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.06)' }} />
            <Area
              type="monotone"
              dataKey="valor"
              stroke="#818cf8"
              fill="url(#colorValorDiario)"
              strokeWidth={2.5}
              filter="url(#glowStroke)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
