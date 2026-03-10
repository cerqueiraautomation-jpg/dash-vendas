import { useState, useMemo, useEffect } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import type { Venda, LeadHistorico } from '../lib/supabase'
import { supabase } from '../lib/supabase'
import { normalizePhone } from '../lib/originDetector'
import { formatCurrency } from '../utils/format'

type Props = {
  vendas: Venda[]
  historico: LeadHistorico[]
  historicoLoading: boolean
}

const SEGMENT_COLORS: Record<string, string> = {
  'Novo Trafego': '#8b5cf6',
  'Novo Organico': '#22c55e',
  'Recompra Trafego': '#f59e0b',
  'Recompra Base': '#3b82f6',
}

export function ChartSegmentacao({ vendas, historico, historicoLoading }: Props) {
  const [janela, setJanela] = useState(90)
  const [contactPhones, setContactPhones] = useState<Map<string, string>>(new Map())
  const [loadingContacts, setLoadingContacts] = useState(true)

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

  const segmentacao = useMemo(() => {
    if (loadingContacts || historicoLoading || historico.length === 0) return []

    // Phone -> historico lookup
    const phoneToHistorico = new Map<string, LeadHistorico[]>()
    for (const h of historico) {
      const entries = phoneToHistorico.get(h.telefone_normalizado) ?? []
      entries.push(h)
      phoneToHistorico.set(h.telefone_normalizado, entries)
    }

    // Nome -> historico lookup (fallback)
    const nomeToHistorico = new Map<string, LeadHistorico[]>()
    for (const h of historico) {
      const key = h.nome.toLowerCase().trim()
      const entries = nomeToHistorico.get(key) ?? []
      entries.push(h)
      nomeToHistorico.set(key, entries)
    }

    // Compras por nome (recompra detection)
    const comprasPorNome = new Map<string, number>()
    for (const v of vendas) {
      comprasPorNome.set(v.nome, (comprasPorNome.get(v.nome) ?? 0) + 1)
    }

    const counts: Record<string, { count: number; valor: number }> = {
      'Novo Trafego': { count: 0, valor: 0 },
      'Novo Organico': { count: 0, valor: 0 },
      'Recompra Trafego': { count: 0, valor: 0 },
      'Recompra Base': { count: 0, valor: 0 },
    }

    for (const v of vendas) {
      const isRecompra = (comprasPorNome.get(v.nome) ?? 1) > 1
      let teveTrafego = false

      // 1. Match by phone
      const phone = v.contact_id ? contactPhones.get(v.contact_id) : undefined
      let trafegoEntries: LeadHistorico[] | undefined

      if (phone) {
        trafegoEntries = phoneToHistorico.get(phone)
      }

      // 2. Fallback: match by nome
      if (!trafegoEntries) {
        const nomeNorm = v.nome.toLowerCase().trim()
        trafegoEntries = nomeToHistorico.get(nomeNorm)

        if (!trafegoEntries) {
          const firstName = nomeNorm.split(/[\/\-]/)[0].trim()
          if (firstName.length > 3) {
            for (const [key, entries] of nomeToHistorico) {
              if (key.includes(firstName) || firstName.includes(key)) {
                trafegoEntries = entries
                break
              }
            }
          }
        }
      }

      // Check attribution window
      if (trafegoEntries) {
        const dataPedido = new Date(v.data_pedido + 'T12:00:00')
        teveTrafego = trafegoEntries.some(e => {
          const dataEntrada = new Date(e.data_entrada + 'T12:00:00')
          const diffDays = (dataPedido.getTime() - dataEntrada.getTime()) / (1000 * 60 * 60 * 24)
          return diffDays >= 0 && diffDays <= janela
        })
      }

      const segment = isRecompra
        ? (teveTrafego ? 'Recompra Trafego' : 'Recompra Base')
        : (teveTrafego ? 'Novo Trafego' : 'Novo Organico')

      counts[segment].count++
      counts[segment].valor += v.valor
    }

    return Object.entries(counts)
      .filter(([, v]) => v.count > 0)
      .map(([name, v]) => ({ name, ...v }))
  }, [vendas, historico, contactPhones, janela, loadingContacts, historicoLoading])

  const isLoading = loadingContacts || historicoLoading

  if (isLoading) {
    return (
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
        <div className="text-slate-400 text-sm">Carregando segmentacao...</div>
      </div>
    )
  }

  if (historico.length === 0) {
    return (
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
        <div className="text-sm text-slate-400">
          Nenhum dado de trafego importado. Use o upload de planilhas JetSales para comecar.
        </div>
      </div>
    )
  }

  const total = segmentacao.reduce((s, d) => s + d.count, 0)

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold">Segmentacao de Clientes</h2>
          <p className="text-xs text-slate-400 mt-0.5">Janela de atribuicao: {janela} dias</p>
        </div>
        <div className="flex gap-1">
          {[30, 60, 90].map(d => (
            <button
              key={d}
              onClick={() => setJanela(d)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                janela === d
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
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
              formatter={(value: number, name: string) => [
                `${value} vendas (${total > 0 ? ((value / total) * 100).toFixed(1) : 0}%)`,
                name
              ]}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>

        <div className="space-y-2">
          {segmentacao.map(d => (
            <div key={d.name} className="flex items-center justify-between bg-slate-900 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: SEGMENT_COLORS[d.name] }} />
                <span className="text-sm">{d.name}</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">{d.count} vendas</div>
                <div className="text-xs text-slate-400">{formatCurrency(d.valor)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
