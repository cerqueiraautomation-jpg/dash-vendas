import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { Venda } from '../lib/supabase'
import { formatCurrency, getMonthLabel } from '../utils/format'

type Props = {
  vendas: Venda[]
}

interface TooltipPayloadItem {
  value: number
  dataKey: string
  name: string
  payload: { mes: string; faturamento: number; pedidos: number }
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: string
}) {
  if (!active || !payload || payload.length === 0) return null

  const faturamento = payload.find(p => p.dataKey === 'faturamento')?.value ?? 0
  const pedidos = payload.find(p => p.dataKey === 'pedidos')?.value ?? 0
  const ticketMedio = pedidos > 0 ? faturamento / pedidos : 0

  return (
    <div style={{
      backgroundColor: '#141b2d',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '10px',
      padding: '10px 14px',
      fontSize: 12,
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    }}>
      <p style={{ color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>{label}</p>
      <p style={{ color: '#22c55e', margin: '3px 0' }}>
        Faturamento: {formatCurrency(faturamento)}
      </p>
      <p style={{ color: '#3b82f6', margin: '3px 0' }}>
        Pedidos: {pedidos}
      </p>
      <p style={{ color: '#a855f7', margin: '3px 0', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 4 }}>
        Ticket Medio: {formatCurrency(ticketMedio)}
      </p>
    </div>
  )
}

export function ChartMensal({ vendas }: Props) {
  const data = useMemo(() => {
    const byMonth: Record<string, { faturamento: number; pedidos: number }> = {}

    for (const v of vendas) {
      const key = v.data_pedido.slice(0, 7)
      if (!byMonth[key]) byMonth[key] = { faturamento: 0, pedidos: 0 }
      byMonth[key].faturamento += v.valor
      byMonth[key].pedidos += 1
    }

    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, d]) => ({
        mes: getMonthLabel(key),
        faturamento: d.faturamento,
        pedidos: d.pedidos,
      }))
  }, [vendas])

  if (data.length <= 1) return null

  return (
    <div className="glass-card rounded-xl p-4">
      <h3 className="text-sm font-semibold mb-3 text-slate-300">Comparativo Mensal</h3>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <defs>
              <linearGradient id="gradFaturamento" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity={1} />
                <stop offset="100%" stopColor="#16a34a" stopOpacity={0.6} />
              </linearGradient>
              <linearGradient id="gradPedidos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                <stop offset="100%" stopColor="#2563eb" stopOpacity={0.6} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
            <XAxis dataKey="mes" tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <YAxis
              yAxisId="valor"
              orientation="left"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`}
            />
            <YAxis
              yAxisId="qtd"
              orientation="right"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Legend
              wrapperStyle={{ fontSize: 12, color: '#94a3b8' }}
              formatter={(value: string) => <span style={{ color: '#94a3b8' }}>{value}</span>}
            />
            <Bar
              yAxisId="valor"
              dataKey="faturamento"
              name="Faturamento"
              fill="url(#gradFaturamento)"
              radius={[4, 4, 0, 0]}
              opacity={0.85}
            />
            <Bar
              yAxisId="qtd"
              dataKey="pedidos"
              name="Pedidos"
              fill="url(#gradPedidos)"
              radius={[4, 4, 0, 0]}
              opacity={0.85}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
