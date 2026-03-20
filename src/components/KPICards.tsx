import { DollarSign, ShoppingCart, TrendingUp, Zap, Target } from 'lucide-react'
import type { Venda } from '../lib/supabase'
import { formatCurrency } from '../utils/format'

type Props = { vendas: Venda[] }

interface CardConfig {
  label: string
  value: string
  sub: string
  icon: typeof DollarSign
  color: string
  glowClass: string
  iconGradient: string
  textGradient: string
}

export function KPICards({ vendas }: Props) {
  const totalVendas = vendas.length
  const totalValor = vendas.reduce((s, v) => s + v.valor, 0)
  const ticketMedio = totalVendas > 0 ? totalValor / totalVendas : 0
  const comDisparo = vendas.filter(v => v.recebeu_disparo)
  const compraramAposDisparo = vendas.filter(v => v.comprou_apos_disparo === 'SIM')
  const taxaConversaoDisparo = comDisparo.length > 0
    ? (compraramAposDisparo.length / comDisparo.length) * 100
    : 0
  const metaAds = vendas.filter(v => v.origem.startsWith('Meta'))
  const metaValor = metaAds.reduce((s, v) => s + v.valor, 0)

  const cards: CardConfig[] = [
    {
      label: 'Total Vendas',
      value: formatCurrency(totalValor),
      sub: `${totalVendas} pedidos`,
      icon: DollarSign,
      color: 'text-green-400',
      glowClass: 'glow-green',
      iconGradient: 'icon-gradient-green',
      textGradient: 'gradient-text-green',
    },
    {
      label: 'Ticket Medio',
      value: formatCurrency(ticketMedio),
      sub: `${totalVendas} pedidos`,
      icon: ShoppingCart,
      color: 'text-blue-400',
      glowClass: 'glow-blue',
      iconGradient: 'icon-gradient-blue',
      textGradient: 'gradient-text-blue',
    },
    {
      label: 'Meta Ads',
      value: formatCurrency(metaValor),
      sub: `${metaAds.length} pedidos (${totalVendas > 0 ? ((metaAds.length / totalVendas) * 100).toFixed(1) : 0}%)`,
      icon: Target,
      color: 'text-purple-400',
      glowClass: 'glow-purple',
      iconGradient: 'icon-gradient-purple',
      textGradient: 'gradient-text-purple',
    },
    {
      label: 'Disparos',
      value: `${comDisparo.length}`,
      sub: `${compraramAposDisparo.length} converteram (${taxaConversaoDisparo.toFixed(1)}%)`,
      icon: Zap,
      color: 'text-yellow-400',
      glowClass: 'glow-yellow',
      iconGradient: 'icon-gradient-yellow',
      textGradient: 'gradient-text-yellow',
    },
    {
      label: 'Maior Venda',
      value: formatCurrency(Math.max(...vendas.map(v => v.valor), 0)),
      sub: vendas.length > 0 ? vendas.reduce((a, b) => a.valor > b.valor ? a : b).nome.slice(0, 40) : '-',
      icon: TrendingUp,
      color: 'text-cyan-400',
      glowClass: 'glow-cyan',
      iconGradient: 'icon-gradient-cyan',
      textGradient: 'gradient-text-cyan',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map(c => (
        <div
          key={c.label}
          className={`glass-card rounded-xl p-4 ${c.glowClass} transition-all hover:scale-[1.02]`}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className={`${c.iconGradient} p-2 rounded-lg`}>
              <c.icon className={`w-4 h-4 ${c.color}`} />
            </div>
            <span className="text-[11px] text-slate-400 font-medium tracking-wide uppercase">{c.label}</span>
          </div>
          <div className={`text-xl font-bold ${c.textGradient}`}>{c.value}</div>
          <div className="text-[11px] text-slate-500 mt-1.5 truncate">{c.sub}</div>
        </div>
      ))}
    </div>
  )
}
