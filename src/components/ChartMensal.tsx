import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { Venda } from '../lib/supabase'
import { formatCurrency, getMonthLabel } from '../utils/format'

type Props = {
  vendas: Venda[]
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
    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
      <h3 className="text-sm font-semibold mb-3 text-slate-300">Comparativo Mensal</h3>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
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
            <Tooltip
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
              labelStyle={{ color: '#94a3b8' }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={((value: number, name: string) => {
                if (name === 'Faturamento') return [formatCurrency(value), name]
                return [value, name]
              }) as any}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, color: '#94a3b8' }}
            />
            <Bar
              yAxisId="valor"
              dataKey="faturamento"
              name="Faturamento"
              fill="#22c55e"
              radius={[4, 4, 0, 0]}
              opacity={0.85}
            />
            <Bar
              yAxisId="qtd"
              dataKey="pedidos"
              name="Pedidos"
              fill="#3b82f6"
              radius={[4, 4, 0, 0]}
              opacity={0.85}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
