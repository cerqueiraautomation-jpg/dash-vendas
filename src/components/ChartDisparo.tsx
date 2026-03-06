import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { Venda } from '../lib/supabase'
import { formatCurrency } from '../utils/format'

type Props = { vendas: Venda[] }

export function ChartDisparo({ vendas }: Props) {
  const comDisparo = vendas.filter(v => v.recebeu_disparo)
  const semDisparo = vendas.filter(v => !v.recebeu_disparo)
  const converteram = comDisparo.filter(v => v.comprou_apos_disparo === 'SIM')
  const naoConverteram = comDisparo.filter(v => v.comprou_apos_disparo === 'NAO')

  const data = [
    {
      name: 'Sem Disparo',
      count: semDisparo.length,
      valor: semDisparo.reduce((s, v) => s + v.valor, 0),
    },
    {
      name: 'Disparo - NAO converteu',
      count: naoConverteram.length,
      valor: naoConverteram.reduce((s, v) => s + v.valor, 0),
    },
    {
      name: 'Disparo - SIM converteu',
      count: converteram.length,
      valor: converteram.reduce((s, v) => s + v.valor, 0),
    },
  ]

  const diasDistribuicao = converteram
    .filter(v => v.dias_apos_disparo != null)
    .reduce((acc, v) => {
      const d = v.dias_apos_disparo!
      const bucket = d <= 0 ? '0 dias' : d <= 2 ? '1-2 dias' : d <= 5 ? '3-5 dias' : '6+ dias'
      if (!acc[bucket]) acc[bucket] = { bucket, count: 0, valor: 0 }
      acc[bucket].count += 1
      acc[bucket].valor += v.valor
      return acc
    }, {} as Record<string, { bucket: string; count: number; valor: number }>)

  const diasData = ['0 dias', '1-2 dias', '3-5 dias', '6+ dias']
    .map(b => diasDistribuicao[b] || { bucket: b, count: 0, valor: 0 })

  return (
    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
      <h3 className="text-sm font-semibold mb-3 text-slate-300">Impacto dos Disparos</h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-slate-400 mb-2">Conversao por grupo</p>
          <div className="h-52">
            <ResponsiveContainer>
              <BarChart data={data}>
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={((val: number, name: string) => [name === 'valor' ? formatCurrency(val) : val, name === 'valor' ? 'Faturamento' : 'Qtd']) as any}
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="count" name="Qtd" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="valor" name="Valor" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div>
          <p className="text-xs text-slate-400 mb-2">Tempo ate compra apos disparo (convertidos)</p>
          <div className="h-52">
            <ResponsiveContainer>
              <BarChart data={diasData}>
                <XAxis dataKey="bucket" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={((val: number, name: string) => [name === 'valor' ? formatCurrency(val) : val, name === 'valor' ? 'Faturamento' : 'Qtd']) as any}
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="count" name="Qtd" fill="#eab308" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
