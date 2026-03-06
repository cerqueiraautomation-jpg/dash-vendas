import type { Venda } from '../lib/supabase'
import { formatCurrency } from '../utils/format'

const MONTH_LABELS: Record<string, string> = {
  '2025-12': 'Dez 2025',
  '2026-01': 'Jan 2026',
  '2026-02': 'Fev 2026',
  '2026-03': 'Mar 2026',
}

type Props = { vendas: Venda[]; mesSelecionado?: string }

export function ResumoExecutivo({ vendas, mesSelecionado }: Props) {
  const total = vendas.length
  const faturamento = vendas.reduce((s, v) => s + v.valor, 0)

  // Origem breakdown
  const origemGroups = {
    organico: vendas.filter(v => v.origem.startsWith('Organico')),
    meta: vendas.filter(v => v.origem.startsWith('Meta')),
    cadastro: vendas.filter(v => v.origem === 'Cadastro Manual'),
    naoEncontrado: vendas.filter(v => v.origem === 'Nao encontrado'),
    linktree: vendas.filter(v => v.origem === 'Linktree'),
    googleSite: vendas.filter(v => v.origem === 'Google/Site'),
  }

  // Meta breakdown
  const metaRedirect = vendas.filter(v => v.origem === 'Meta Redirect')
  const metaCTWA = vendas.filter(v => v.origem === 'Meta CTWA')
  const metaDireto = vendas.filter(v => v.origem === 'Meta Direto')

  // Disparos
  const comDisparo = vendas.filter(v => v.recebeu_disparo)
  const converteram = vendas.filter(v => v.comprou_apos_disparo === 'SIM')
  const naoConverteram = comDisparo.filter(v => v.comprou_apos_disparo === 'NAO')

  // Tempo CRM
  const comCRM = vendas.filter(v => v.tempo_compra_dias != null)
  const tempoMedio = comCRM.length > 0 ? comCRM.reduce((s, v) => s + (v.tempo_compra_dias ?? 0), 0) / comCRM.length : 0

  // Vendedores ranking
  const byVendedor = vendas.reduce((acc, v) => {
    if (!acc[v.vendedor]) acc[v.vendedor] = { count: 0, valor: 0 }
    acc[v.vendedor].count += 1
    acc[v.vendedor].valor += v.valor
    return acc
  }, {} as Record<string, { count: number; valor: number }>)
  const vendedorRanking = Object.entries(byVendedor).sort((a, b) => b[1].valor - a[1].valor)

  const pct = (n: number) => total > 0 ? ((n / total) * 100).toFixed(1) : '0'
  const sum = (arr: Venda[]) => arr.reduce((s, v) => s + v.valor, 0)

  return (
    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
      <h3 className="text-sm font-semibold mb-3 text-slate-300">
        Resumo Executivo{mesSelecionado && mesSelecionado !== 'todos' ? ` - ${MONTH_LABELS[mesSelecionado] ?? mesSelecionado}` : ''}
      </h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">

        <div className="space-y-3">
          <div className="bg-slate-900 rounded-lg p-3">
            <div className="text-slate-400 mb-2 font-medium">Visao Geral</div>
            <div className="space-y-1">
              <Row label="Total de pedidos" value={`${total}`} />
              <Row label="Faturamento total" value={formatCurrency(faturamento)} highlight />
              <Row label="Ticket medio" value={formatCurrency(faturamento / total)} />
              <Row label="Tempo medio CRM -> Compra" value={`${tempoMedio.toFixed(0)} dias`} />
            </div>
          </div>

          <div className="bg-slate-900 rounded-lg p-3">
            <div className="text-slate-400 mb-2 font-medium">Origem das Vendas</div>
            <div className="space-y-1">
              <Row label={`Organico (sem origem + WhatsApp)`} value={`${origemGroups.organico.length} vendas (${pct(origemGroups.organico.length)}%) = ${formatCurrency(sum(origemGroups.organico))}`} />
              <Row label="Cadastro Manual" value={`${origemGroups.cadastro.length} vendas (${pct(origemGroups.cadastro.length)}%) = ${formatCurrency(sum(origemGroups.cadastro))}`} />
              <Row label="Meta Ads (total)" value={`${origemGroups.meta.length} vendas (${pct(origemGroups.meta.length)}%) = ${formatCurrency(sum(origemGroups.meta))}`} highlight />
              <div className="pl-3 border-l border-slate-700 space-y-1 mt-1">
                <Row label="Meta Redirect (UTM)" value={`${metaRedirect.length}x = ${formatCurrency(sum(metaRedirect))}`} />
                <Row label="Meta CTWA (Click-to-WhatsApp)" value={`${metaCTWA.length}x = ${formatCurrency(sum(metaCTWA))}`} />
                <Row label="Meta Direto" value={`${metaDireto.length}x = ${formatCurrency(sum(metaDireto))}`} />
              </div>
              <Row label="Nao encontrado no CRM" value={`${origemGroups.naoEncontrado.length} vendas (${pct(origemGroups.naoEncontrado.length)}%) = ${formatCurrency(sum(origemGroups.naoEncontrado))}`} warn />
              <Row label="Linktree" value={`${origemGroups.linktree.length} vendas (${pct(origemGroups.linktree.length)}%) = ${formatCurrency(sum(origemGroups.linktree))}`} />
              <Row label="Google/Site" value={`${origemGroups.googleSite.length} vendas (${pct(origemGroups.googleSite.length)}%) = ${formatCurrency(sum(origemGroups.googleSite))}`} />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="bg-slate-900 rounded-lg p-3">
            <div className="text-slate-400 mb-2 font-medium">Impacto dos Disparos</div>
            <div className="space-y-1">
              <Row label="Receberam disparo" value={`${comDisparo.length} de ${total} (${pct(comDisparo.length)}%)`} />
              <Row label="Compraram APOS disparo" value={`${converteram.length} (${comDisparo.length > 0 ? ((converteram.length / comDisparo.length) * 100).toFixed(1) : 0}% de conversao)`} highlight />
              <Row label="Faturamento pos-disparo" value={formatCurrency(sum(converteram))} highlight />
              <Row label="Receberam mas NAO converteram" value={`${naoConverteram.length} (ja tinham comprado antes)`} />
              <Row label="Nao receberam disparo" value={`${total - comDisparo.length} vendas`} />
            </div>
          </div>

          <div className="bg-slate-900 rounded-lg p-3">
            <div className="text-slate-400 mb-2 font-medium">Ranking Vendedores</div>
            <div className="space-y-1">
              {vendedorRanking.map(([nome, d], i) => (
                <div key={nome} className="flex justify-between">
                  <span className="text-slate-300">
                    <span className={i === 0 ? 'text-yellow-400' : 'text-slate-500'}>{i + 1}.</span> {nome}
                  </span>
                  <span className="text-slate-400">{d.count}x = <span className="text-slate-200">{formatCurrency(d.valor)}</span></span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <div className="text-red-400 mb-1 font-medium">Gap de Atribuicao</div>
            <div className="text-slate-300">
              {origemGroups.naoEncontrado.length} vendas ({pct(origemGroups.naoEncontrado.length)}%) nao foram encontradas no CRM.
              Isso representa <span className="text-red-400 font-medium">{formatCurrency(sum(origemGroups.naoEncontrado))}</span> em vendas sem rastreio de origem.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, highlight, warn }: { label: string; value: string; highlight?: boolean; warn?: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-slate-400">{label}</span>
      <span className={`text-right shrink-0 ${highlight ? 'text-green-400 font-medium' : warn ? 'text-red-400' : 'text-slate-200'}`}>{value}</span>
    </div>
  )
}
