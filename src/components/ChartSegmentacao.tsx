import { useMemo, useEffect, useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { ChevronDown, X } from 'lucide-react'
import type { Venda, LeadHistorico } from '../lib/supabase'
import { supabase } from '../lib/supabase'
import { normalizePhone } from '../lib/originDetector'
import { formatCurrency, formatDate } from '../utils/format'

type Props = {
  vendas: Venda[]
  historico: LeadHistorico[]
  historicoLoading: boolean
}

type VendaComSegmento = Venda & { segmento: string; matchMethod: 'telefone' | 'nome' | null }

const SEGMENT_COLORS: Record<string, string> = {
  'Novo Trafego': '#8b5cf6',
  'Novo Organico': '#22c55e',
  'Recompra Trafego': '#f59e0b',
  'Recompra Base': '#3b82f6',
}

export function ChartSegmentacao({ vendas, historico, historicoLoading }: Props) {
  const janela = 90
  const [contactPhones, setContactPhones] = useState<Map<string, string>>(new Map())
  const [loadingContacts, setLoadingContacts] = useState(true)
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null)

  useEffect(() => {
    const contactIds = [...new Set(
      vendas.map(v => v.contact_id).filter((id): id is string => id != null)
    )]
    if (contactIds.length === 0) {
      setLoadingContacts(false)
      return
    }

    const batchSize = 100
    const promises = []
    for (let i = 0; i < contactIds.length; i += batchSize) {
      const batch = contactIds.slice(i, i + batchSize)
      promises.push(
        supabase.from('contacts').select('id, phone').in('id', batch)
      )
    }

    Promise.all(promises).then(results => {
      const map = new Map<string, string>()
      for (const { data } of results) {
        for (const c of data ?? []) {
          if (c.phone) map.set(c.id, normalizePhone(c.phone))
        }
      }
      setContactPhones(map)
      setLoadingContacts(false)
    })
  }, [vendas])

  const { segmentacao, vendasClassificadas } = useMemo(() => {
    if (loadingContacts || historicoLoading || historico.length === 0) {
      return { segmentacao: [], vendasClassificadas: [] as VendaComSegmento[] }
    }

    // Phone -> historico lookup (dados primarios)
    const phoneToHistorico = new Map<string, LeadHistorico[]>()
    for (const h of historico) {
      if (!h.telefone_normalizado) continue
      const entries = phoneToHistorico.get(h.telefone_normalizado) ?? []
      entries.push(h)
      phoneToHistorico.set(h.telefone_normalizado, entries)
    }

    // Nome completo exato -> historico lookup (fallback conservador)
    const nomeExatoToHistorico = new Map<string, LeadHistorico[]>()
    for (const h of historico) {
      const key = h.nome.toLowerCase().trim()
      if (key.length < 5) continue
      const entries = nomeExatoToHistorico.get(key) ?? []
      entries.push(h)
      nomeExatoToHistorico.set(key, entries)
    }

    // Compras por nome normalizado (recompra detection)
    const comprasPorNome = new Map<string, number>()
    for (const v of vendas) {
      const key = v.nome.toLowerCase().trim()
      comprasPorNome.set(key, (comprasPorNome.get(key) ?? 0) + 1)
    }

    const counts: Record<string, { count: number; valor: number }> = {
      'Novo Trafego': { count: 0, valor: 0 },
      'Novo Organico': { count: 0, valor: 0 },
      'Recompra Trafego': { count: 0, valor: 0 },
      'Recompra Base': { count: 0, valor: 0 },
    }

    const classificadas: VendaComSegmento[] = []

    for (const v of vendas) {
      const nomeKey = v.nome.toLowerCase().trim()
      const isRecompra = (comprasPorNome.get(nomeKey) ?? 1) > 1
      let teveTrafego = false
      let matchMethod: 'telefone' | 'nome' | null = null

      // 1. Match por telefone (dado primario, mais confiavel)
      const phone = v.contact_id ? contactPhones.get(v.contact_id) : undefined
      let trafegoEntries: LeadHistorico[] | undefined

      if (phone) {
        trafegoEntries = phoneToHistorico.get(phone)
        if (trafegoEntries) matchMethod = 'telefone'
      }

      // 2. Fallback: match por nome completo exato (sem fuzzy)
      if (!trafegoEntries && nomeKey.length >= 5) {
        trafegoEntries = nomeExatoToHistorico.get(nomeKey)
        if (trafegoEntries) matchMethod = 'nome'
      }

      // Verificar janela de atribuicao
      if (trafegoEntries) {
        const dataPedido = new Date(v.data_pedido + 'T12:00:00')
        teveTrafego = trafegoEntries.some(e => {
          const dataEntrada = new Date(e.data_entrada + 'T12:00:00')
          const diffDays = (dataPedido.getTime() - dataEntrada.getTime()) / (1000 * 60 * 60 * 24)
          return diffDays >= 0 && diffDays <= janela
        })
      }

      if (!teveTrafego) matchMethod = null

      const segment = isRecompra
        ? (teveTrafego ? 'Recompra Trafego' : 'Recompra Base')
        : (teveTrafego ? 'Novo Trafego' : 'Novo Organico')

      counts[segment].count++
      counts[segment].valor += v.valor
      classificadas.push({ ...v, segmento: segment, matchMethod })
    }

    return {
      segmentacao: Object.entries(counts)
        .filter(([, v]) => v.count > 0)
        .map(([name, v]) => ({ name, ...v })),
      vendasClassificadas: classificadas,
    }
  }, [vendas, historico, contactPhones, janela, loadingContacts, historicoLoading])

  const vendasDoSegmento = useMemo(() => {
    if (!selectedSegment) return []
    return vendasClassificadas
      .filter(v => v.segmento === selectedSegment)
      .sort((a, b) => b.valor - a.valor)
  }, [vendasClassificadas, selectedSegment])

  const isLoading = loadingContacts || historicoLoading

  if (isLoading) {
    return (
      <div className="glass-card rounded-xl p-4">
        <div className="text-slate-400 text-sm">Carregando segmentacao...</div>
      </div>
    )
  }

  if (historico.length === 0) {
    return (
      <div className="glass-card rounded-xl p-4">
        <div className="text-sm text-slate-400">
          Nenhum dado de trafego importado. Use o upload de planilhas JetSales para comecar.
        </div>
      </div>
    )
  }

  const total = segmentacao.reduce((s, d) => s + d.count, 0)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tooltipFormatter = ((value: number, name: string) => [
    `${value} vendas (${total > 0 ? ((value / total) * 100).toFixed(1) : 0}%)`,
    name,
  ]) as any

  return (
    <div className="glass-card rounded-xl p-4">
      <div className="mb-4">
        <h2 className="text-sm font-semibold">Segmentacao de Clientes</h2>
        <p className="text-xs text-slate-500 mt-0.5">{total} vendas classificadas</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={segmentacao}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={90}
              paddingAngle={3}
              dataKey="count"
              nameKey="name"
            >
              {segmentacao.map(d => (
                <Cell key={d.name} fill={SEGMENT_COLORS[d.name]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
              formatter={tooltipFormatter}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>

        <div className="space-y-2">
          {segmentacao.map(d => (
            <button
              key={d.name}
              onClick={() => setSelectedSegment(prev => prev === d.name ? null : d.name)}
              className={`w-full flex items-center justify-between rounded-lg p-3 transition-colors text-left ${
                selectedSegment === d.name
                  ? 'bg-slate-700 ring-1 ring-slate-500'
                  : 'bg-slate-900 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: SEGMENT_COLORS[d.name] }} />
                <span className="text-sm">{d.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <div className="text-sm font-medium">{d.count} vendas</div>
                  <div className="text-xs text-slate-400">{formatCurrency(d.valor)}</div>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${
                  selectedSegment === d.name ? 'rotate-180' : ''
                }`} />
              </div>
            </button>
          ))}
        </div>
      </div>

      {selectedSegment && vendasDoSegmento.length > 0 && (
        <div className="mt-4 border-t border-slate-700 pt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: SEGMENT_COLORS[selectedSegment] }} />
              <h3 className="text-sm font-medium">{selectedSegment}</h3>
              <span className="text-xs text-slate-400">({vendasDoSegmento.length} vendas)</span>
            </div>
            <button
              onClick={() => setSelectedSegment(null)}
              className="p-1 rounded hover:bg-slate-700 transition-colors"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-700">
            <table className="w-full text-xs">
              <thead className="bg-slate-900 sticky top-0">
                <tr className="text-slate-400">
                  <th className="text-left p-2 font-medium">Nome</th>
                  <th className="text-left p-2 font-medium">Pedido</th>
                  <th className="text-left p-2 font-medium">Data</th>
                  <th className="text-right p-2 font-medium">Valor</th>
                  <th className="text-left p-2 font-medium">Origem</th>
                  <th className="text-left p-2 font-medium">Match</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {vendasDoSegmento.map((v, i) => (
                  <tr key={i} className="hover:bg-slate-800/50">
                    <td className="p-2 text-slate-200 max-w-[180px] truncate">{v.nome}</td>
                    <td className="p-2 text-slate-400">#{v.pedido}</td>
                    <td className="p-2 text-slate-400">{formatDate(v.data_pedido)}</td>
                    <td className="p-2 text-right text-slate-200 font-medium">{formatCurrency(v.valor)}</td>
                    <td className="p-2 text-slate-400">{v.origem}</td>
                    <td className="p-2">
                      {v.matchMethod === 'telefone' && (
                        <span className="px-1.5 py-0.5 rounded bg-green-900/50 text-green-400">Tel</span>
                      )}
                      {v.matchMethod === 'nome' && (
                        <span className="px-1.5 py-0.5 rounded bg-blue-900/50 text-blue-400">Nome</span>
                      )}
                      {!v.matchMethod && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-500">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
