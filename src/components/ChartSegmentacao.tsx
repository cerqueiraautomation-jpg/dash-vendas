import { useMemo, useEffect, useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { ChevronDown, X } from 'lucide-react'
import type { Venda, LeadHistorico } from '../lib/supabase'
import { supabase } from '../lib/supabase'
import { normalizePhone } from '../lib/originDetector'
import { formatCurrency, formatDate } from '../utils/format'

type Props = {
  vendas: Venda[]
  todasVendas: Venda[]
  historico: LeadHistorico[]
  historicoLoading: boolean
}

type MatchSource = 'origem' | 'telefone' | 'nome' | null

type VendaComSegmento = Venda & {
  segmento: string
  matchSource: MatchSource
}

const SEGMENT_COLORS: Record<string, string> = {
  'Novo Trafego': '#8b5cf6',
  'Novo Linktree': '#06b6d4',
  'Novos Instagram': '#E1306C',
  'Novo Organico': '#22c55e',
  'Recompra': '#f59e0b',
}

/** Origens que indicam trafego pago */
const ORIGENS_TRAFEGO = [
  'Meta CTWA',
  'Meta Redirect',
  'Meta Direto',
  'Google/Site',
  'Indicacao',
  'Automacao (n8n)',
]

/** Origens vindas do Instagram (bucket dedicado) */
const ORIGENS_INSTAGRAM = [
  'Instagram Direct',
  'Instagram Organico',
  'Instagram Stories',
]

function isOrigemTrafego(origem: string): boolean {
  return ORIGENS_TRAFEGO.includes(origem)
}

function isOrigemLinktree(origem: string): boolean {
  return origem === 'Linktree'
}

function isOrigemInstagram(origem: string): boolean {
  return ORIGENS_INSTAGRAM.includes(origem)
}

export function ChartSegmentacao({ vendas, todasVendas, historico, historicoLoading }: Props) {
  const janela = 90
  const [contactPhones, setContactPhones] = useState<Map<string, string>>(new Map())
  const [loadingContacts, setLoadingContacts] = useState(true)
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null)
  const [campanhasExpanded, setCampanhasExpanded] = useState(false)

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

  const { segmentacao, vendasClassificadas, campanhaBreakdown } = useMemo(() => {
    if (loadingContacts) {
      return {
        segmentacao: [],
        vendasClassificadas: [] as VendaComSegmento[],
        campanhaBreakdown: [] as { campanha: string; count: number; valor: number }[],
      }
    }

    // Phone -> historico lookup
    const phoneToHistorico = new Map<string, LeadHistorico[]>()
    for (const h of historico) {
      if (!h.telefone_normalizado) continue
      const entries = phoneToHistorico.get(h.telefone_normalizado) ?? []
      entries.push(h)
      phoneToHistorico.set(h.telefone_normalizado, entries)
    }

    // Nome exato -> historico lookup
    const nomeExatoToHistorico = new Map<string, LeadHistorico[]>()
    for (const h of historico) {
      const key = h.nome.toLowerCase().trim()
      if (key.length < 5) continue
      const entries = nomeExatoToHistorico.get(key) ?? []
      entries.push(h)
      nomeExatoToHistorico.set(key, entries)
    }

    // Compras por nome usando TODAS as vendas (historico completo pra detectar recompra)
    const comprasPorNome = new Map<string, number>()
    for (const v of todasVendas) {
      const key = v.nome.toLowerCase().trim()
      comprasPorNome.set(key, (comprasPorNome.get(key) ?? 0) + 1)
    }

    const counts: Record<string, { count: number; valor: number }> = {
      'Novo Trafego': { count: 0, valor: 0 },
      'Novo Linktree': { count: 0, valor: 0 },
      'Novos Instagram': { count: 0, valor: 0 },
      'Novo Organico': { count: 0, valor: 0 },
      'Recompra': { count: 0, valor: 0 },
    }

    const classificadas: VendaComSegmento[] = []
    const campanhaMap: Record<string, { campanha: string; count: number; valor: number }> = {}

    for (const v of vendas) {
      const nomeKey = v.nome.toLowerCase().trim()
      const isRecompra = (comprasPorNome.get(nomeKey) ?? 1) > 1
      let canal: 'trafego' | 'linktree' | 'instagram' | 'organico' = 'organico'
      let matchSource: MatchSource = null

      // 1. Campo origem da venda (fonte mais direta)
      if (isOrigemInstagram(v.origem)) {
        canal = 'instagram'
        matchSource = 'origem'
      } else if (isOrigemLinktree(v.origem)) {
        canal = 'linktree'
        matchSource = 'origem'
      } else if (isOrigemTrafego(v.origem)) {
        canal = 'trafego'
        matchSource = 'origem'
      }

      // 2. Match por telefone no historico (complementar, só se ainda organico)
      if (canal === 'organico') {
        const phone = v.contact_id ? contactPhones.get(v.contact_id) : undefined
        let trafegoEntries: LeadHistorico[] | undefined

        if (phone) {
          trafegoEntries = phoneToHistorico.get(phone)
          if (trafegoEntries) {
            const dataPedido = new Date(v.data_pedido + 'T12:00:00')
            const match = trafegoEntries.some(e => {
              const dataEntrada = new Date(e.data_entrada + 'T12:00:00')
              const diffDays = (dataPedido.getTime() - dataEntrada.getTime()) / (1000 * 60 * 60 * 24)
              return diffDays >= 0 && diffDays <= janela
            })
            if (match) {
              canal = 'trafego'
              matchSource = 'telefone'
            }
          }
        }
      }

      // 3. Fallback: match por nome exato no historico
      if (canal === 'organico' && nomeKey.length >= 5) {
        const trafegoEntries = nomeExatoToHistorico.get(nomeKey)
        if (trafegoEntries) {
          const dataPedido = new Date(v.data_pedido + 'T12:00:00')
          const match = trafegoEntries.some(e => {
            const dataEntrada = new Date(e.data_entrada + 'T12:00:00')
            const diffDays = (dataPedido.getTime() - dataEntrada.getTime()) / (1000 * 60 * 60 * 24)
            return diffDays >= 0 && diffDays <= janela
          })
          if (match) {
            canal = 'trafego'
            matchSource = 'nome'
          }
        }
      }

      let segment: string
      if (isRecompra) {
        segment = 'Recompra'
      } else if (canal === 'instagram') {
        segment = 'Novos Instagram'
      } else if (canal === 'trafego') {
        segment = 'Novo Trafego'
      } else if (canal === 'linktree') {
        segment = 'Novo Linktree'
      } else {
        segment = 'Novo Organico'
      }

      counts[segment].count++
      counts[segment].valor += v.valor
      classificadas.push({ ...v, segmento: segment, matchSource })

      // Campanha breakdown (para vendas de trafego e linktree)
      if (canal !== 'organico') {
        const campanhaKey = v.campanha || v.origem
        if (!campanhaMap[campanhaKey]) {
          campanhaMap[campanhaKey] = { campanha: campanhaKey, count: 0, valor: 0 }
        }
        campanhaMap[campanhaKey].count++
        campanhaMap[campanhaKey].valor += v.valor
      }
    }

    return {
      segmentacao: Object.entries(counts)
        .filter(([, v]) => v.count > 0)
        .map(([name, v]) => ({ name, ...v })),
      vendasClassificadas: classificadas,
      campanhaBreakdown: Object.values(campanhaMap).sort((a, b) => b.valor - a.valor),
    }
  }, [vendas, todasVendas, historico, contactPhones, janela, loadingContacts])

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

  const total = segmentacao.reduce((s, d) => s + d.count, 0) || vendas.length

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tooltipFormatter = ((value: number, name: string) => [
    `${value} vendas (${total > 0 ? ((value / total) * 100).toFixed(1) : 0}%)`,
    name,
  ]) as any

  const matchBadge: Record<string, { label: string; className: string }> = {
    origem: { label: 'Origem', className: 'bg-purple-900/50 text-purple-400' },
    telefone: { label: 'Tel', className: 'bg-green-900/50 text-green-400' },
    nome: { label: 'Nome', className: 'bg-blue-900/50 text-blue-400' },
  }

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
              contentStyle={{ background: '#141b2d', border: '1px solid #1e293b', borderRadius: '8px' }}
              formatter={tooltipFormatter}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>

        <div className="space-y-2">
          {segmentacao.map(d => {
            const pct = total > 0 ? ((d.count / total) * 100).toFixed(1) : '0'
            return (
              <button
                key={d.name}
                onClick={() => setSelectedSegment(prev => prev === d.name ? null : d.name)}
                className={`w-full flex items-center justify-between rounded-lg p-3 transition-colors text-left ${
                  selectedSegment === d.name
                    ? 'bg-white/5 ring-1 ring-white/10'
                    : 'bg-white/[0.02] hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: SEGMENT_COLORS[d.name] }} />
                  <span className="text-sm">{d.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="text-sm font-medium">{d.count} vendas ({pct}%)</div>
                    <div className="text-xs text-slate-400">{formatCurrency(d.valor)}</div>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${
                    selectedSegment === d.name ? 'rotate-180' : ''
                  }`} />
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Campanha breakdown - mostra de onde veio o trafego */}
      {campanhaBreakdown.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-medium text-slate-400">
              Origem do Trafego ({campanhaBreakdown.length} campanhas e canais)
            </h3>
            {campanhaBreakdown.length > 9 && (
              <button
                onClick={() => setCampanhasExpanded(prev => !prev)}
                className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
              >
                {campanhasExpanded ? 'Ver menos' : `Ver todas (${campanhaBreakdown.length})`}
                <ChevronDown className={`w-3 h-3 transition-transform ${campanhasExpanded ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {(campanhasExpanded ? campanhaBreakdown : campanhaBreakdown.slice(0, 9)).map(c => {
              const pct = total > 0 ? ((c.count / total) * 100).toFixed(1) : '0'
              return (
                <div key={c.campanha} className="bg-white/[0.02] rounded-lg p-2.5">
                  <p className="text-xs text-slate-300 truncate font-medium" title={c.campanha}>{c.campanha}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[11px] text-slate-500">{c.count}x ({pct}%)</span>
                    <span className="text-xs text-slate-300 font-medium">{formatCurrency(c.valor)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Detalhe do segmento selecionado */}
      {selectedSegment && vendasDoSegmento.length > 0 && (
        <div className="mt-4 border-t border-white/5 pt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: SEGMENT_COLORS[selectedSegment] }} />
              <h3 className="text-sm font-medium">{selectedSegment}</h3>
              <span className="text-xs text-slate-400">({vendasDoSegmento.length} vendas)</span>
            </div>
            <button
              onClick={() => setSelectedSegment(null)}
              className="p-1 rounded hover:bg-white/5 transition-colors"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          <div className="max-h-64 overflow-y-auto rounded-lg border border-white/5">
            <table className="w-full text-xs">
              <thead className="bg-[#141b2d] sticky top-0">
                <tr className="text-slate-400">
                  <th className="text-left p-2 font-medium">Nome</th>
                  <th className="text-left p-2 font-medium">Data</th>
                  <th className="text-right p-2 font-medium">Valor</th>
                  <th className="text-left p-2 font-medium">Origem</th>
                  <th className="text-left p-2 font-medium">Campanha</th>
                  <th className="text-left p-2 font-medium">Como</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {vendasDoSegmento.map((v, i) => (
                  <tr key={i} className="hover:bg-white/[0.02]">
                    <td className="p-2 text-slate-200 max-w-[160px] truncate">{v.nome}</td>
                    <td className="p-2 text-slate-400 whitespace-nowrap">{formatDate(v.data_pedido)}</td>
                    <td className="p-2 text-right text-slate-200 font-medium">{formatCurrency(v.valor)}</td>
                    <td className="p-2 text-slate-400">{v.origem}</td>
                    <td className="p-2 text-slate-400 max-w-[120px] truncate" title={v.campanha ?? '-'}>
                      {v.campanha ?? '-'}
                    </td>
                    <td className="p-2">
                      {v.matchSource ? (
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${matchBadge[v.matchSource].className}`}>
                          {matchBadge[v.matchSource].label}
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-500 text-[10px]">-</span>
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
