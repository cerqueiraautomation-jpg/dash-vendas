import { useMemo, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { useVendas } from './hooks/useVendas'
import { useLeadHistorico } from './hooks/useLeadHistorico'
import { KPICards } from './components/KPICards'
import { ChartMensal } from './components/ChartMensal'
import { ResumoExecutivo } from './components/ResumoExecutivo'
import { ChartOrigem } from './components/ChartOrigem'
import { ChartVendedor } from './components/ChartVendedor'
import { ChartDiario } from './components/ChartDiario'
import { ChartTempoCRM } from './components/ChartTempoCRM'
import { ChartDisparo } from './components/ChartDisparo'
import { ChartCampanha } from './components/ChartCampanha'
import { ChartSegmentacao } from './components/ChartSegmentacao'
import { DataTable } from './components/DataTable'
import { UploadPlanilha } from './components/UploadPlanilha'
import { BackfillBling } from './components/BackfillBling'
import { getMonthLabel, formatDate } from './utils/format'

function getMonthKey(dataPedido: string): string {
  return dataPedido.slice(0, 7)
}

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

type FilterMode = 'todos' | 'hoje' | '7dias' | '15dias' | 'dia' | 'mes'

function App() {
  const { vendas, loading, refetch: refetchVendas } = useVendas()
  const { historico, loading: historicoLoading, refetch: refetchHistorico } = useLeadHistorico()
  const [filterMode, setFilterMode] = useState<FilterMode>('todos')
  const [mesSelecionado, setMesSelecionado] = useState<string>('')
  const [diaSelecionado, setDiaSelecionado] = useState<string>(toDateStr(new Date()))
  const [showAdmin, setShowAdmin] = useState(false)
  const [backfillDatas, setBackfillDatas] = useState<{ inicio: string; fim: string } | null>(null)

  const mesesDisponiveis = useMemo(() => {
    const keys = [...new Set(vendas.map(v => getMonthKey(v.data_pedido)))].sort()
    return keys.map(k => ({ key: k, label: getMonthLabel(k) }))
  }, [vendas])

  const vendasFiltradas = useMemo(() => {
    const hoje = toDateStr(new Date())

    switch (filterMode) {
      case 'hoje':
        return vendas.filter(v => v.data_pedido === hoje)
      case '7dias': {
        const from = toDateStr(new Date(Date.now() - 7 * 86400000))
        return vendas.filter(v => v.data_pedido >= from && v.data_pedido <= hoje)
      }
      case '15dias': {
        const from = toDateStr(new Date(Date.now() - 15 * 86400000))
        return vendas.filter(v => v.data_pedido >= from && v.data_pedido <= hoje)
      }
      case 'dia':
        return vendas.filter(v => v.data_pedido === diaSelecionado)
      case 'mes':
        return vendas.filter(v => getMonthKey(v.data_pedido) === mesSelecionado)
      default:
        return vendas
    }
  }, [vendas, filterMode, mesSelecionado, diaSelecionado])

  const subtitulo = useMemo(() => {
    switch (filterMode) {
      case 'hoje': return `Hoje (${formatDate(toDateStr(new Date()))}) - Relatorio Bling + CRM`
      case '7dias': return 'Ultimos 7 dias - Relatorio Bling + CRM'
      case '15dias': return 'Ultimos 15 dias - Relatorio Bling + CRM'
      case 'dia': return `${formatDate(diaSelecionado)} - Relatorio Bling + CRM`
      case 'mes': return `${getMonthLabel(mesSelecionado)} - Relatorio Bling + CRM`
      default: return 'Todos os meses - Relatorio Bling + CRM'
    }
  }, [filterMode, mesSelecionado, diaSelecionado])

  const handlePeriodoDetectado = (meses: string[]) => {
    if (meses.length === 0) return
    const sorted = [...meses].sort()
    const primeiro = sorted[0]
    const ultimo = sorted[sorted.length - 1]
    const inicio = `${primeiro}-01`
    const [y, m] = ultimo.split('-').map(Number)
    const lastDay = new Date(y, m, 0).getDate()
    const fim = `${ultimo}-${String(lastDay).padStart(2, '0')}`
    setBackfillDatas({ inicio, fim })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-400 text-lg">Carregando dados...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-[1400px] mx-auto space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-xl font-bold">Dashboard de Vendas</h1>
          <p className="text-sm text-slate-400">{subtitulo}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAdmin(!showAdmin)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              showAdmin
                ? 'bg-blue-500 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            {showAdmin ? 'Fechar Painel' : 'Importar Dados'}
          </button>
          <div className="text-xs text-slate-500">
            {vendasFiltradas.length} registros
          </div>
        </div>
      </div>

      {showAdmin && (
        <div className="space-y-4">
          <BackfillBling onSyncComplete={refetchVendas} autoFillDatas={backfillDatas} />
          <UploadPlanilha onUploadComplete={refetchHistorico} onPeriodoDetectado={handlePeriodoDetectado} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={filterMode === 'mes' ? mesSelecionado : ''}
          onChange={e => {
            setMesSelecionado(e.target.value)
            setFilterMode('mes')
          }}
          className="bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
        >
          <option value="" disabled>Selecionar mes</option>
          {mesesDisponiveis.map(m => (
            <option key={m.key} value={m.key}>{m.label}</option>
          ))}
        </select>

        <div className="w-px h-6 bg-slate-700" />

        {([
          ['todos', 'Todos'],
          ['hoje', 'Hoje'],
          ['7dias', '7 dias'],
          ['15dias', '15 dias'],
          ['dia', 'Dia'],
        ] as [FilterMode, string][]).map(([mode, label]) => (
          <button
            key={mode}
            onClick={() => setFilterMode(mode)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterMode === mode
                ? 'bg-blue-500 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            {label}
          </button>
        ))}

        {filterMode === 'dia' && (
          <div className="flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={diaSelecionado}
              onChange={e => setDiaSelecionado(e.target.value)}
              className="bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            />
          </div>
        )}
      </div>

      <KPICards vendas={vendasFiltradas} />

      <ChartMensal vendas={vendas} />

      <ChartSegmentacao
        vendas={vendasFiltradas}
        historico={historico}
        historicoLoading={historicoLoading}
      />

      <ResumoExecutivo vendas={vendasFiltradas} mesSelecionado={mesSelecionado} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartOrigem vendas={vendasFiltradas} />
        <ChartVendedor vendas={vendasFiltradas} />
      </div>

      <ChartDiario vendas={vendasFiltradas} />

      <ChartTempoCRM vendas={vendasFiltradas} />

      <ChartDisparo vendas={vendasFiltradas} />

      <ChartCampanha vendas={vendasFiltradas} />

      <DataTable vendas={vendasFiltradas} />
    </div>
  )
}

export default App
