import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts'
import { Zap, TrendingUp, Clock, AlertTriangle } from 'lucide-react'
import type { Venda } from '../lib/supabase'
import { formatCurrency } from '../utils/format'

type Props = { vendas: Venda[] }

export function ChartDisparo({ vendas }: Props) {
  const total = vendas.length
  const comDisparo = vendas.filter(v => v.recebeu_disparo)
  const semDisparo = vendas.filter(v => !v.recebeu_disparo)
  const converteram = comDisparo.filter(v => v.comprou_apos_disparo === 'SIM')
  const naoConverteram = comDisparo.filter(v => v.comprou_apos_disparo === 'NAO')

  const faturamentoSIM = converteram.reduce((s, v) => s + v.valor, 0)
  const faturamentoNAO = naoConverteram.reduce((s, v) => s + v.valor, 0)
  const faturamentoSem = semDisparo.reduce((s, v) => s + v.valor, 0)
  const taxaConversao = comDisparo.length > 0 ? (converteram.length / comDisparo.length) * 100 : 0

  const mediaDiasSIM = converteram.length > 0
    ? converteram.reduce((s, v) => s + (v.dias_apos_disparo ?? 0), 0) / converteram.length
    : 0
  const mediaDiasNAO = naoConverteram.length > 0
    ? naoConverteram.reduce((s, v) => s + (v.dias_apos_disparo ?? 0), 0) / naoConverteram.length
    : 0

  // Distribuicao dia a dia dos que converteram
  const diasDetalhe = converteram
    .filter(v => v.dias_apos_disparo != null)
    .reduce((acc, v) => {
      const d = v.dias_apos_disparo!
      const key = `${d}d`
      if (!acc[key]) acc[key] = { dia: `${d}d`, dias: d, count: 0, valor: 0 }
      acc[key].count += 1
      acc[key].valor += v.valor
      return acc
    }, {} as Record<string, { dia: string; dias: number; count: number; valor: number }>)

  const diasData = Object.values(diasDetalhe).sort((a, b) => a.dias - b.dias)

  // Pie data
  const pieData = [
    { name: 'Converteram (SIM)', value: converteram.length, fill: '#22c55e' },
    { name: 'Ja compraram (NAO)', value: naoConverteram.length, fill: '#ef4444' },
    { name: 'Sem disparo', value: semDisparo.length, fill: '#64748b' },
  ]

  // Barras de comparacao
  const barColors = ['#64748b', '#ef4444', '#22c55e']
  const grupoData = [
    { name: 'Sem disparo', count: semDisparo.length, valor: faturamentoSem, ticket: semDisparo.length > 0 ? faturamentoSem / semDisparo.length : 0 },
    { name: 'Disparo \u2192 NAO', count: naoConverteram.length, valor: faturamentoNAO, ticket: naoConverteram.length > 0 ? faturamentoNAO / naoConverteram.length : 0 },
    { name: 'Disparo \u2192 SIM', count: converteram.length, valor: faturamentoSIM, ticket: converteram.length > 0 ? faturamentoSIM / converteram.length : 0 },
  ]

  return (
    <div className="glass-card rounded-xl p-4 space-y-4">
      <h3 className="text-sm font-semibold text-slate-300">Analise Completa de Disparos</h3>

      {/* KPIs do disparo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-900 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-xs text-slate-400">Receberam disparo</span>
          </div>
          <div className="text-xl font-bold">{comDisparo.length} <span className="text-sm text-slate-500">/ {total}</span></div>
          <div className="text-xs text-slate-500">{total > 0 ? ((comDisparo.length / total) * 100).toFixed(1) : 0}% dos compradores</div>
        </div>
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-green-400" />
            <span className="text-xs text-slate-400">Converteram apos</span>
          </div>
          <div className="text-xl font-bold text-green-400">{converteram.length}</div>
          <div className="text-xs text-green-400/70">{taxaConversao.toFixed(1)}% taxa de conversao</div>
        </div>
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-green-400" />
            <span className="text-xs text-slate-400">Faturamento pos-disparo</span>
          </div>
          <div className="text-xl font-bold text-green-400">{formatCurrency(faturamentoSIM)}</div>
          <div className="text-xs text-slate-500">Ticket: {formatCurrency(converteram.length > 0 ? faturamentoSIM / converteram.length : 0)}</div>
        </div>
        <div className="bg-slate-900 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xs text-slate-400">Tempo medio conversao</span>
          </div>
          <div className="text-xl font-bold text-blue-400">{mediaDiasSIM.toFixed(1)} dias</div>
          <div className="text-xs text-slate-500">Apos receber o disparo</div>
        </div>
      </div>

      {/* Graficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pie - Distribuicao geral */}
        <div>
          <p className="text-xs text-slate-400 mb-2">Distribuicao dos compradores</p>
          <div className="h-48">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={70} innerRadius={35} paddingAngle={2}>
                  {pieData.map(d => <Cell key={d.name} fill={d.fill} />)}
                </Pie>
                <Tooltip
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={((val: number) => val) as any}
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1 text-xs mt-1">
            {pieData.map(d => (
              <div key={d.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.fill }} />
                  <span className="text-slate-400">{d.name}</span>
                </div>
                <span className="text-slate-200">{d.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bar - Faturamento por grupo */}
        <div>
          <p className="text-xs text-slate-400 mb-2">Faturamento por grupo</p>
          <div className="h-48">
            <ResponsiveContainer>
              <BarChart data={grupoData}>
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 9 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={((val: number) => formatCurrency(val)) as any}
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                  {grupoData.map((_, i) => <Cell key={i} fill={barColors[i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1 text-xs mt-1">
            {grupoData.map((d, i) => (
              <div key={d.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: barColors[i] }} />
                  <span className="text-slate-400">{d.name}</span>
                </div>
                <span className="text-slate-200">{d.count}x = {formatCurrency(d.valor)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bar - Dias ate compra (detalhe dia a dia) */}
        <div>
          <p className="text-xs text-slate-400 mb-2">Dias ate compra apos disparo (conversoes)</p>
          <div className="h-48">
            <ResponsiveContainer>
              <BarChart data={diasData}>
                <XAxis dataKey="dia" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Tooltip
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={((val: number, name: string) => [name === 'valor' ? formatCurrency(val) : val, name === 'valor' ? 'Faturamento' : 'Conversoes']) as any}
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="count" name="Conversoes" fill="#eab308" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1 text-xs mt-1">
            {diasData.map(d => (
              <div key={d.dia} className="flex items-center justify-between">
                <span className="text-slate-400">{d.dia === '0d' ? 'Mesmo dia' : `${d.dias} dia${d.dias > 1 ? 's' : ''} depois`}</span>
                <span className="text-slate-200">{d.count}x = {formatCurrency(d.valor)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Insight box */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="text-xs font-medium text-green-400">Insight Positivo</span>
          </div>
          <p className="text-xs text-slate-300">
            {converteram.length} vendas ({taxaConversao.toFixed(1)}% dos que receberam) aconteceram APOS o disparo,
            gerando {formatCurrency(faturamentoSIM)}. A maioria converte em ate 2 dias
            ({diasData.filter(d => d.dias <= 2).reduce((s, d) => s + d.count, 0)} de {converteram.length} = {converteram.length > 0 ? ((diasData.filter(d => d.dias <= 2).reduce((s, d) => s + d.count, 0) / converteram.length) * 100).toFixed(0) : 0}%).
          </p>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            <span className="text-xs font-medium text-yellow-400">Ponto de Atencao</span>
          </div>
          <p className="text-xs text-slate-300">
            {naoConverteram.length} pessoas receberam disparo mas ja tinham comprado antes
            (media {mediaDiasNAO.toFixed(0)} dias antes). Esses disparos nao influenciaram a compra.
            Ajustar o timing pode melhorar a eficiencia.
          </p>
        </div>
      </div>
    </div>
  )
}
