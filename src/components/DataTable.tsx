import { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, Search } from 'lucide-react'
import type { Venda } from '../lib/supabase'
import { formatCurrency, formatDate } from '../utils/format'

type Props = { vendas: Venda[] }
type SortKey = keyof Venda
type SortDir = 'asc' | 'desc'

export function DataTable({ vendas }: Props) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('data_pedido')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [filterOrigem, setFilterOrigem] = useState('')
  const origens = useMemo(() => [...new Set(vendas.map(v => v.origem))].sort(), [vendas])

  const filtered = useMemo(() => {
    let result = vendas
    if (search) {
      const s = search.toLowerCase()
      result = result.filter(v => v.nome.toLowerCase().includes(s) || v.pedido.includes(s))
    }
    if (filterOrigem) result = result.filter(v => v.origem === filterOrigem)
    result.sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return result
  }, [vendas, search, filterOrigem, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return null
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
  }

  const totalFiltered = filtered.reduce((s, v) => s + v.valor, 0)

  const origemBg: Record<string, string> = {
    'Organico (sem origem)': 'bg-blue-500/20 text-blue-300',
    'Organico (WhatsApp)': 'bg-green-500/20 text-green-300',
    'Cadastro Manual': 'bg-purple-500/20 text-purple-300',
    'Meta Redirect': 'bg-orange-500/20 text-orange-300',
    'Meta CTWA': 'bg-yellow-500/20 text-yellow-300',
    'Meta Direto': 'bg-red-500/20 text-red-300',
    'Nao encontrado': 'bg-slate-500/20 text-slate-300',
    'Linktree': 'bg-cyan-500/20 text-cyan-300',
  }

  return (
    <div className="glass-card rounded-xl">
      <div className="p-4 border-b border-white/5">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome ou pedido..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <select
            value={filterOrigem}
            onChange={e => setFilterOrigem(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500"
          >
            <option value="">Todas origens</option>
            {origens.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div className="flex gap-4 mt-2 text-xs text-slate-400">
          <span>{filtered.length} pedidos</span>
          <span>{formatCurrency(totalFiltered)}</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-700 text-slate-400">
              {([
                ['pedido', 'Pedido'],
                ['nome', 'Nome'],
                ['valor', 'Valor'],
                ['data_pedido', 'Data'],
                ['origem', 'Origem'],
                ['tempo_compra_dias', 'Tempo CRM'],
                ['recebeu_disparo', 'Disparo'],
                ['comprou_apos_disparo', 'Conv.'],
              ] as [SortKey, string][]).map(([key, label]) => (
                <th
                  key={key}
                  className="px-3 py-2.5 text-left cursor-pointer hover:text-slate-200 whitespace-nowrap select-none"
                  onClick={() => toggleSort(key)}
                >
                  <span className="flex items-center gap-1">{label}<SortIcon col={key} /></span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(v => (
              <tr key={v.pedido} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                <td className="px-3 py-2 text-slate-400">{v.pedido}</td>
                <td className="px-3 py-2 max-w-[200px] truncate" title={v.nome}>{v.nome}</td>
                <td className="px-3 py-2 font-medium text-green-400">{formatCurrency(v.valor)}</td>
                <td className="px-3 py-2 text-slate-400 whitespace-nowrap">{formatDate(v.data_pedido)}</td>
                <td className="px-3 py-2">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${origemBg[v.origem] || 'bg-slate-600/30'}`}>
                    {v.origem}
                  </span>
                </td>
                <td className="px-3 py-2 text-slate-400">{v.tempo_compra_dias != null ? `${v.tempo_compra_dias}d` : '-'}</td>
                <td className="px-3 py-2">
                  {v.recebeu_disparo
                    ? <span className="text-yellow-400">Sim</span>
                    : <span className="text-slate-500">Nao</span>}
                </td>
                <td className="px-3 py-2">
                  {v.comprou_apos_disparo === 'SIM'
                    ? <span className="text-green-400 font-medium">SIM</span>
                    : v.comprou_apos_disparo === 'NAO'
                    ? <span className="text-red-400">NAO</span>
                    : <span className="text-slate-500">-</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
