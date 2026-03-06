import { DollarSign, ShoppingCart, TrendingUp, Users, Zap, Target } from 'lucide-react'
import type { Venda } from '../lib/supabase'
import { formatCurrency } from '../utils/format'

type Props = { vendas: Venda[] }

export function KPICards({ vendas }: Props) {
  const totalVendas = vendas.length
  const totalValor = vendas.reduce((s, v) => s + v.valor, 0)
  const ticketMedio = totalVendas > 0 ? totalValor / totalVendas : 0
  const vendedores = new Set(vendas.map(v => v.vendedor)).size
  const comDisparo = vendas.filter(v => v.recebeu_disparo)
  const compraramAposDisparo = vendas.filter(v => v.comprou_apos_disparo === 'SIM')
  const taxaConversaoDisparo = comDisparo.length > 0
    ? (compraramAposDisparo.length / comDisparo.length) * 100
    : 0
  const metaAds = vendas.filter(v => v.origem.startsWith('Meta'))
  const metaValor = metaAds.reduce((s, v) => s + v.valor, 0)

  const cards = [
    { label: 'Total Vendas', value: formatCurrency(totalValor), sub: `${totalVendas} pedidos`, icon: DollarSign, color: 'text-green-400', bg: 'bg-green-400/10' },
    { label: 'Ticket Medio', value: formatCurrency(ticketMedio), sub: `${vendedores} vendedores`, icon: ShoppingCart, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { label: 'Meta Ads', value: formatCurrency(metaValor), sub: `${metaAds.length} pedidos (${totalVendas > 0 ? ((metaAds.length / totalVendas) * 100).toFixed(1) : 0}%)`, icon: Target, color: 'text-purple-400', bg: 'bg-purple-400/10' },
    { label: 'Disparos', value: `${comDisparo.length}`, sub: `${compraramAposDisparo.length} converteram (${taxaConversaoDisparo.toFixed(1)}%)`, icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
    { label: 'Maior Venda', value: formatCurrency(Math.max(...vendas.map(v => v.valor), 0)), sub: vendas.length > 0 ? vendas.reduce((a, b) => a.valor > b.valor ? a : b).nome.slice(0, 40) : '-', icon: TrendingUp, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
    { label: 'Vendedores', value: `${vendedores}`, sub: `Media ${totalVendas > 0 ? Math.round(totalVendas / vendedores) : 0} vendas/vendedor`, icon: Users, color: 'text-orange-400', bg: 'bg-orange-400/10' },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map(c => (
        <div key={c.label} className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <div className={`${c.bg} p-1.5 rounded-lg`}>
              <c.icon className={`w-4 h-4 ${c.color}`} />
            </div>
            <span className="text-xs text-slate-400">{c.label}</span>
          </div>
          <div className="text-lg font-bold">{c.value}</div>
          <div className="text-xs text-slate-400 mt-1 truncate">{c.sub}</div>
        </div>
      ))}
    </div>
  )
}
