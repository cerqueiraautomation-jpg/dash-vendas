import { useMemo, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { useVendas } from './hooks/useVendas'
import { useLeadHistorico } from './hooks/useLeadHistorico'
import { KPICards } from './components/KPICards'
import { ChartMensal } from './components/ChartMensal'
import { ResumoExecutivo } from './components/ResumoExecutivo'
import { ChartOrigem } from './components/ChartOrigem'
import { ChartDiario } from './components/ChartDiario'
import { ChartTempoCRM } from './components/ChartTempoCRM'
import { ChartDisparo } from './components/ChartDisparo'
import { ChartCampanha } from './components/ChartCampanha'
import { ChartSegmentacao } from './components/ChartSegmentacao'
import { DataTable } from './components/DataTable'
import { UploadPlanilha } from './components/UploadPlanilha'
import { BackfillBling } from './components/BackfillBling'
import { getMonthLabel } from './utils/format'

export default function App() {
  const { vendas, loading, refetch } = useVendas()
  const { historico, loading: historicoLoading } = useLeadHistorico()
  const [mesSelecionado, setMesSelecionado] = useState('todos')
  const [importOpen, setImportOpen] = useState(false)

  const mesesDisponiveis = useMemo(() => {
    const meses = [...new Set(vendas.map(v => v.data_pedido.slice(0, 7)))].sort()
    return meses
  }, [vendas])

  const vendasFiltradas = useMemo(() => {
    if (mesSelecionado === 'todos') return vendas
    if (Array.isArray(mesSelecionado)) {
      return vendas.filter(v => (mesSelecionado as string[]).includes(v.data_pedido.slice(0, 7)))
    }
    return vendas.filter(v => v.data_pedido.startsWith(mesSelecionado))
  }, [vendas, mesSelecionado])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
          <p className="text-slate-400">Carregando dados...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">Dashboard Vendas</h1>
            <p className="text-xs text-slate-400">
              Bling x CRM Space
              {mesSelecionado !== 'todos'
                ? ` — ${Array.isArray(mesSelecionado)
                    ? (mesSelecionado as string[]).map(m => getMonthLabel(m)).join(', ')
                    : getMonthLabel(mesSelecionado)}`
                : ` — Todos os meses (${mesesDisponiveis.length})`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-slate-400" />
            <select
              value={mesSelecionado}
              onChange={e => setMesSelecionado(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="todos">Todos os meses</option>
              {mesesDisponiveis.map(m => (
                <option key={m} value={m}>{getMonthLabel(m)}</option>
              ))}
            </select>
            <button
              onClick={() => setImportOpen(!importOpen)}
              className="px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700"
            >
              {importOpen ? 'Fechar' : 'Importar Dados'}
            </button>
          </div>
        </div>

        {importOpen && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <UploadPlanilha />
            <BackfillBling onComplete={refetch} />
          </div>
        )}

        <KPICards vendas={vendasFiltradas} />

        <ChartMensal vendas={vendasFiltradas} />

        <ChartSegmentacao
          vendas={vendasFiltradas}
          historico={historico}
          historicoLoading={historicoLoading}
        />

        <ResumoExecutivo vendas={vendasFiltradas} mesSelecionado={mesSelecionado} />

        <ChartOrigem vendas={vendasFiltradas} />

        <ChartDiario vendas={vendasFiltradas} />

        <ChartTempoCRM vendas={vendasFiltradas} />

        <ChartDisparo vendas={vendasFiltradas} />

        <ChartCampanha vendas={vendasFiltradas} />

        <DataTable vendas={vendasFiltradas} />

      </div>
    </div>
  )
}
