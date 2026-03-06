import { useVendas } from './hooks/useVendas'
import { KPICards } from './components/KPICards'
import { ChartOrigem } from './components/ChartOrigem'
import { ChartVendedor } from './components/ChartVendedor'
import { ChartDiario } from './components/ChartDiario'
import { ChartDisparo } from './components/ChartDisparo'
import { ChartCampanha } from './components/ChartCampanha'
import { DataTable } from './components/DataTable'

function App() {
  const { vendas, loading } = useVendas()

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
          <p className="text-sm text-slate-400">Fevereiro 2026 - Relatorio Bling + CRM</p>
        </div>
        <div className="text-xs text-slate-500">
          {vendas.length} registros
        </div>
      </div>

      <KPICards vendas={vendas} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartOrigem vendas={vendas} />
        <ChartVendedor vendas={vendas} />
      </div>

      <ChartDiario vendas={vendas} />

      <div className="grid grid-cols-1 lg:grid-cols-1 gap-4">
        <ChartDisparo vendas={vendas} />
        <ChartCampanha vendas={vendas} />
      </div>

      <DataTable vendas={vendas} />
    </div>
  )
}

export default App
