import type { Venda } from '../lib/supabase'
import { formatCurrency, getMonthLabel } from '../utils/format'

type Props = { vendas: Venda[]; mesSelecionado?: string }

export function ResumoExecutivo({ vendas, mesSelecionado }: Props) {
  const total = vendas.length
  const faturamento = vendas.reduce((s, v) => s + v.valor, 0)

  const origemGroups = {
    organico: vendas.filter(v => v.origem.startsWith('Organico')),
    meta: vendas.filter(v => v.origem.startsWith('Meta')),
    cadastro: vendas.filter(v => v.origem === 'Cadastro Manual'),
    naoEncontrado: vendas.filter(v => v.origem === 'Nao encontrado'),
    linktree: vendas.filter(v => v.origem === 'Linktree'),
    googleSite: vendas.filter(v => v.origem === 'Google/Site'),
    instagram: vendas.filter(v => v.origem.startsWith('Instagram')),
  }

  const metaRedirect = vendas.filter(v => v.origem === 'Meta Redirect')
  const metaCTWA = vendas.filter(v => v.origem === 'Meta CTWA')
  const metaDireto = vendas.filter(v => v.origem === 'Meta Direto')

  const comDisparo = vendas.filter(v => v.recebeu_disparo)
  const converteram = vendas.filter(v => v.comprou_apos_disparo === 'SIM')
  const naoConverteram = comDisparo.filter(v => v.comprou_apos_disparo === 'NAO')

  const comCRM = vendas.filter(v => v.tempo_compra_dias != null)
  const tempoMedio = comCRM.length > 0 ? comCRM.reduce((s, v) => s + (v.tempo_compra_dias ?? 0), 0) / comCRM.length : 0

  const pct = (n: number) => total > 0 ? ((n / total) * 100).toFixed(1) : '0'
  const sum = (arr: Venda[]) => arr.reduce((s, v) => s + v.valor, 0)

  return (
    <div className="glass-card rounded-xl p-4">
      <h3 className="text-sm font-semibold mb-3 text-slate-300">
        Resumo Executivo{mesSelecionado && mesSelecionado !== 'todos' ? ` - ${getMonthLabel(mesSelecionado)}` : ''}
      </h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">

        <div className="space-y-3">
          <div className="bg-white/[0.03] rounded-xl p-3">
            <div className="border-l-2 border-blue-500/30 pl-2 text-slate-400 mb-2 font-medium">Visao Geral</div>
            <div className="space-y-1.5">
              <Row label="Total de pedidos" value={`${total}`} />
              <Row label="Faturamento total" value={formatCurrency(faturamento)} highlight />
              <Row label="Ticket medio" value={formatCurrency(faturamento / total)} />
              <Row label="Tempo medio CRM -> Compra" value={`${tempoMedio.toFixed(0)} dias`} />
            </div>
          </div>

          <div className="bg-white/[0.03] rounded-xl p-3">
            <div className="border-l-2 border-blue-500/30 pl-2 text-slate-400 mb-2 font-medium">Origem das Vendas</div>
            <div className="space-y-1.5">
              <Row label={`Organico (sem origem + WhatsApp)`} value={`${origemGroups.organico.length} vendas (${pct(origemGroups.organico.length)}%) = ${formatCurrency(sum(origemGroups.organico))}`} />
              <Row label="Cadastro Manual" value={`${origemGroups.cadastro.length} vendas (${pct(origemGroups.cadastro.length)}%) = ${formatCurrency(sum(origemGroups.cadastro))}`} />
              <Row label="Meta Ads (total)" value={`${origemGroups.meta.length} vendas (${pct(origemGroups.meta.length)}%) = ${formatCurrency(sum(origemGroups.meta))}`} highlight />
              <div className="pl-3 border-l-2 border-purple-500/30 space-y-1.5 mt-1">
                <Row label="Meta Redirect (UTM)" value={`${metaRedirect.length}x = ${formatCurrency(sum(metaRedirect))}`} />
                <Row label="Meta CTWA (Click-to-WhatsApp)" value={`${metaCTWA.length}x = ${formatCurrency(sum(metaCTWA))}`} />
                <Row label="Meta Direto" value={`${metaDireto.length}x = ${formatCurrency(sum(metaDireto))}`} />
              </div>
              <Row label="Nao encontrado no CRM" value={`${origemGroups.naoEncontrado.length} vendas (${pct(origemGroups.naoEncontrado.length)}%) = ${formatCurrency(sum(origemGroups.naoEncontrado))}`} warn />
              <Row label="Linktree" value={`${origemGroups.linktree.length} vendas (${pct(origemGroups.linktree.length)}%) = ${formatCurrency(sum(origemGroups.linktree))}`} />
              <Row label="Google/Site" value={`${origemGroups.googleSite.length} vendas (${pct(origemGroups.googleSite.length)}%) = ${formatCurrency(sum(origemGroups.googleSite))}`} />
              <Row label="Instagram (total)" value={`${origemGroups.instagram.length} vendas (${pct(origemGroups.instagram.length)}%) = ${formatCurrency(sum(origemGroups.instagram))}`} />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="bg-white/[0.03] rounded-xl p-3">
            <div className="border-l-2 border-blue-500/30 pl-2 text-slate-400 mb-2 font-medium">Impacto dos Disparos</div>
            <div className="space-y-1.5">
              <Row label="Receberam disparo" value={`${comDisparo.length} de ${total} (${pct(comDisparo.length)}%)`} />
              <Row label="Compraram APOS disparo" value={`${converteram.length} (${comDisparo.length > 0 ? ((converteram.length / comDisparo.length) * 100).toFixed(1) : 0}% de conversao)`} highlight />
              <Row label="Faturamento pos-disparo" value={formatCurrency(sum(converteram))} highlight />
              <Row label="Receberam mas NAO converteram" value={`${naoConverteram.length} (ja tinham comprado antes)`} />
              <Row label="Nao receberam disparo" value={`${total - comDisparo.length} vendas`} />
            </div>
          </div>


          <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3">
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
    <div className="flex justify-between gap-2 hover:bg-white/[0.02] rounded-md px-1 -mx-1 transition-colors">
      <span className="text-slate-400">{label}</span>
      <span className={`text-right shrink-0 ${highlight ? 'gradient-text-green text-sm font-semibold' : warn ? 'text-red-400 text-sm font-semibold drop-shadow-[0_0_6px_rgba(239,68,68,0.3)]' : 'text-slate-200'}`}>{value}</span>
    </div>
  )
}
