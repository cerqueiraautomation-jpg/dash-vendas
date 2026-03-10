import { useState, useCallback } from 'react'
import { Database, Loader2, CheckCircle2, AlertCircle, Play, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase'

type WindowResult = {
  periodo: string
  fetched: number
  new_orders: number
  inserted: number
  pending: number
  errors: number
}

type Props = {
  onSyncComplete?: () => void
}

export function BackfillBling({ onSyncComplete }: Props) {
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [running, setRunning] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [progress, setProgress] = useState<WindowResult[]>([])
  const [currentWindow, setCurrentWindow] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)

  const handleBackfill = useCallback(async () => {
    if (!dataInicio || !dataFim) return

    setRunning(true)
    setProgress([])
    setError(null)
    setDone(false)
    setSyncResult(null)

    const windows: { inicio: string; fim: string }[] = []
    let current = new Date(dataInicio + 'T12:00:00')
    const end = new Date(dataFim + 'T12:00:00')

    while (current <= end) {
      const windowEnd = new Date(current.getTime() + 29 * 86400000)
      const actualEnd = windowEnd > end ? end : windowEnd

      windows.push({
        inicio: current.toISOString().split('T')[0],
        fim: actualEnd.toISOString().split('T')[0],
      })

      current = new Date(actualEnd.getTime() + 86400000)
    }

    for (const w of windows) {
      setCurrentWindow(`${w.inicio} a ${w.fim}`)

      try {
        const { data, error: fnError } = await supabase.functions.invoke('sync-bling-vendas', {
          body: { dataInicial: w.inicio, dataFinal: w.fim },
        })

        if (fnError) throw fnError

        setProgress(prev => [...prev, {
          periodo: `${w.inicio} a ${w.fim}`,
          fetched: data?.fetched_total ?? 0,
          new_orders: data?.new_orders ?? 0,
          inserted: data?.inserted ?? 0,
          pending: data?.pending_review ?? 0,
          errors: data?.errors ?? 0,
        }])

        await new Promise(r => setTimeout(r, 2000))
      } catch (err) {
        setError(`Erro na janela ${w.inicio} a ${w.fim}: ${err instanceof Error ? err.message : String(err)}`)
        break
      }
    }

    setRunning(false)
    setDone(true)
    setCurrentWindow('')
    onSyncComplete?.()
  }, [dataInicio, dataFim, onSyncComplete])

  const handleSyncNow = useCallback(async () => {
    setSyncing(true)
    setError(null)
    setSyncResult(null)

    try {
      const now = new Date()
      const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000)

      const { data, error: fnError } = await supabase.functions.invoke('sync-bling-vendas', {
        body: {
          dataInicial: sevenDaysAgo.toISOString().split('T')[0],
          dataFinal: now.toISOString().split('T')[0],
        },
      })

      if (fnError) throw fnError

      setSyncResult(
        `Sync concluido: ${data?.fetched_total ?? 0} buscados, ${data?.new_orders ?? 0} novos, ${data?.inserted ?? 0} inseridos`
      )
      onSyncComplete?.()
    } catch (err) {
      setError(`Erro no sync: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setSyncing(false)
    }
  }, [onSyncComplete])

  const totals = progress.reduce((acc, r) => ({
    fetched: acc.fetched + r.fetched,
    new_orders: acc.new_orders + r.new_orders,
    inserted: acc.inserted + r.inserted,
    pending: acc.pending + r.pending,
    errors: acc.errors + r.errors,
  }), { fetched: 0, new_orders: 0, inserted: 0, pending: 0, errors: 0 })

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-orange-400" />
          <h2 className="text-sm font-semibold">Bling - Dados de Vendas</h2>
        </div>
        <button
          onClick={handleSyncNow}
          disabled={syncing || running}
          className="px-3 py-1.5 bg-green-600 hover:bg-green-500 disabled:bg-slate-600 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
        >
          {syncing
            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sincronizando...</>
            : <><RefreshCw className="w-3.5 h-3.5" /> Sincronizar Agora</>
          }
        </button>
      </div>

      {syncResult && (
        <div className="flex items-center gap-2 mb-3 text-green-400 text-sm">
          <CheckCircle2 className="w-4 h-4" />
          {syncResult}
        </div>
      )}

      <div className="border-t border-slate-700 pt-3 mt-1">
        <div className="text-xs text-slate-400 mb-2">Backfill - Importar periodo historico (janelas de 30 dias)</div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="text-xs text-slate-500 block mb-1">Data Inicio</label>
            <input
              type="date"
              value={dataInicio}
              onChange={e => setDataInicio(e.target.value)}
              disabled={running}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-orange-500"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-slate-500 block mb-1">Data Fim</label>
            <input
              type="date"
              value={dataFim}
              onChange={e => setDataFim(e.target.value)}
              disabled={running}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-orange-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleBackfill}
              disabled={running || !dataInicio || !dataFim || syncing}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-600 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              {running
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Processando...</>
                : <><Play className="w-4 h-4" /> Iniciar Backfill</>
              }
            </button>
          </div>
        </div>
      </div>

      {currentWindow && (
        <div className="flex items-center gap-2 mt-3 text-orange-400 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Processando: {currentWindow}
        </div>
      )}

      {progress.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <div className="bg-slate-900 rounded-lg p-2">
              <div className="text-xs text-slate-400">Buscados</div>
              <div className="text-lg font-bold">{totals.fetched}</div>
            </div>
            <div className="bg-slate-900 rounded-lg p-2">
              <div className="text-xs text-slate-400">Novos</div>
              <div className="text-lg font-bold text-blue-400">{totals.new_orders}</div>
            </div>
            <div className="bg-slate-900 rounded-lg p-2">
              <div className="text-xs text-slate-400">Inseridos</div>
              <div className="text-lg font-bold text-green-400">{totals.inserted}</div>
            </div>
            <div className="bg-slate-900 rounded-lg p-2">
              <div className="text-xs text-slate-400">Revisao</div>
              <div className="text-lg font-bold text-yellow-400">{totals.pending}</div>
            </div>
            <div className="bg-slate-900 rounded-lg p-2">
              <div className="text-xs text-slate-400">Erros</div>
              <div className="text-lg font-bold text-red-400">{totals.errors}</div>
            </div>
          </div>

          <div className="max-h-40 overflow-y-auto space-y-1">
            {progress.map((r, i) => (
              <div key={i} className="flex items-center justify-between text-xs bg-slate-900/50 rounded px-3 py-1.5">
                <span className="text-slate-400">{r.periodo}</span>
                <span className="text-slate-300">
                  {r.fetched} buscados | {r.new_orders} novos | {r.inserted} inseridos
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {done && !error && (
        <div className="flex items-center gap-2 mt-3 text-green-400 text-sm">
          <CheckCircle2 className="w-4 h-4" />
          Backfill concluido
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 mt-3 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
    </div>
  )
}
