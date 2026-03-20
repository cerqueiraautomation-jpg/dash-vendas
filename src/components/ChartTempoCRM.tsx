import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { Venda } from '../lib/supabase'
import { formatCurrency } from '../utils/format'

type Props = { vendas: Venda[] }

const BUCKET_COLORS = ['#22c55e', '#3b82f6', '#eab308', '#f97316', '#ef4444', '#64748b']

export function ChartTempoCRM({ vendas }: Props) {
  const comCRM = vendas.filter(v => v.tempo_compra_dias != null)
  const semCRM = vendas.filter(v => v.data_entrada_crm == null)

  const tempoMedio = comCRM.length > 0
    ? comCRM.reduce((s, v) => s + (v.tempo_compra_dias ?? 0), 0) / comCRM.length
    : 0

  const buckets = [
    { label: 'Mesmo dia (0d)', min: -Infinity, max: 0 },
    { label: '1-7 dias', min: 1, max: 7 },
    { label: '8-14 dias', min: 8, max: 14 },
    { label: '15-30 dias', min: 15, max: 30 },
    { label: '31-60 dias', min: 31, max: 60 },
    { label: '60+ dias', min: 61, max: Infinity },
  ]

  const data = buckets.map(b => {
    const items = comCRM.filter(v => {
      const d = v.tempo_compra_dias ?? 0
      return d >= b.min && d <= b.max
    })
    return {
      bucket: b.label,
      count: items.length,
      valor: items.reduce((s, v) => s + v.valor, 0),
    }
  })

  return (
    <div className="glass-card rounded-xl p-4">
      <h3 className="text-sm font-semibold mb-3 text-slate-300">Tempo entre CRM e Compra</h3>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-3">
          <div className="bg-slate-900 rounded-lg p-3">
            <div className="text-xs text-slate-400">Tempo medio</div>
            <div className="text-2xl font-bold text-blue-400">{tempoMedio.toFixed(0)} dias</div>
          </div>
          <div className="bg-slate-900 rounded-lg p-3">
            <div className="text-xs text-slate-400">Com entrada no CRM</div>
            <div className="text-lg font-bold">{comCRM.length} <span className="text-sm text-slate-400">/ {vendas.length}</span></div>
          </div>
          <div className="bg-slate-900 rounded-lg p-3">
            <div className="text-xs text-slate-400">Sem CRM (nao encontrado)</div>
            <div className="text-lg font-bold text-red-400">{semCRM.length}</div>
            <div className="text-xs text-slate-500">{formatCurrency(semCRM.reduce((s, v) => s + v.valor, 0))} em vendas sem atribuicao</div>
          </div>
        </div>
        <div className="lg:col-span-2 h-56">
          <ResponsiveContainer>
            <BarChart data={data}>
              <XAxis dataKey="bucket" tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={((val: number, name: string) => [name === 'valor' ? formatCurrency(val) : val, name === 'valor' ? 'Faturamento' : 'Qtd vendas']) as any}
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="count" name="Qtd vendas" radius={[4, 4, 0, 0]}>
                {data.map((_, i) => (
                  <Cell key={i} fill={BUCKET_COLORS[i]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
