import { useMemo, useState } from 'react'
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
import { getMonthLabel } from './utils/format'

function getMonthKey(dataPedido: string): string {
  return dataPedido.slice(0, 7)
}

function App() {
  const { vendas, loading, refetch: refetchVendas } = useVendas()
  const { historico, loading: historicoLoading, refetch: refetchHistorico } = useLeadHistorico()
  const [mesSelecionado, setMesSelecionado] = useState<string>('todos')
  const [showAdmin, setShowAdmin] = useState(false)
  const [backfillDatas, setBackfillDatas] = useState<{ inicio: string; fim: string } | null>(null)

  const mesesDisponiveis = useMemo(() => {
    const keys = [...new Set(vendas.map(v => getMonthKey(v.data_pedido)))].sort()
    return keys.map(k => ({ key: k, label: getMonthLabel(k) }))
  }, [vendas])

  const vendasFiltradas = useMemo(() => {
    if (mesSelecionado === 'todos') return vendas
    return vendas.filter(v => getMonthKey(v.data_pedido) === mesSelecionado)
  }, [vendas, mesSelecionado])

  const subtitulo = mesSelecionado === 'todos'
    ? 'Todos os meses - Relatorio Bling + CRM'
    : `${getMonthLabel(mesSelecionado)} - Relatorio Bling + CRM`

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

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setMesSelecionado('todos')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            mesSelecionado === 'todos'
              ? 'bg-blue-500 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'
          }`}
        >
          Todos
        </button>
        {mesesDisponiveis.map(m => (
          <button
            key={m.key}
            onClick={() => setMesSelecionado(m.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              mesSelecionado === m.key
                ? 'bg-blue-500 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            {m.label}
          </button>
        ))}
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
