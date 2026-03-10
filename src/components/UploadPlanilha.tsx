import { useState, useCallback } from 'react'
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { detectOrigin, normalizePhone, parseJetSalesDate } from '../lib/originDetector'
import * as XLSX from 'xlsx'

type ParsedLead = {
  atendimento_id: string
  telefone_normalizado: string
  nome: string
  data_entrada: string
  mes_ano: string
  origem_trafego: string
  agente: string
  raw_primeira_mensagem: string
}

type Props = {
  onUploadComplete?: () => void
  onPeriodoDetectado?: (meses: string[]) => void
}

export function UploadPlanilha({ onUploadComplete, onPeriodoDetectado }: Props) {
  const [parsing, setParsing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [parsed, setParsed] = useState<ParsedLead[] | null>(null)
  const [stats, setStats] = useState<Record<string, number>>({})
  const [result, setResult] = useState<{ inserted: number; duplicates: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setParsing(true)
    setError(null)
    setResult(null)
    setParsed(null)

    try {
      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })

      const leads: ParsedLead[] = []
      const originCounts: Record<string, number> = {}

      for (const row of rows) {
        const atendimentoId = String(row['Atendimento'] ?? '').trim()
        const nome = String(row['Nome'] ?? '').trim()
        const contato = String(row['Contato'] ?? '').trim()
        const dataAbertura = row['Data Abertura']
        const agente = String(row['Agente'] ?? '').trim()
        const primeiraMsg = String(
          row['1\u00ba Mensagem'] ?? row['1\u00aa Mensagem'] ?? row['1\u00ba mensagem'] ?? row['1\u00aa mensagem'] ?? ''
        ).trim()

        if (!atendimentoId || !contato || !dataAbertura) continue

        const origem = detectOrigin(primeiraMsg)
        const dataFormatted = parseJetSalesDate(dataAbertura)
        const mesAno = dataFormatted.slice(0, 7)

        originCounts[origem] = (originCounts[origem] || 0) + 1

        leads.push({
          atendimento_id: atendimentoId,
          telefone_normalizado: normalizePhone(contato),
          nome,
          data_entrada: dataFormatted,
          mes_ano: mesAno,
          origem_trafego: origem,
          agente,
          raw_primeira_mensagem: primeiraMsg.slice(0, 500),
        })
      }

      setParsed(leads)
      setStats(originCounts)

      // Detectar periodo e notificar o backfill
      const meses = [...new Set(leads.map(l => l.mes_ano))].sort()
      onPeriodoDetectado?.(meses)
    } catch (err) {
      setError(`Erro ao ler planilha: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setParsing(false)
    }
  }, [onPeriodoDetectado])

  const handleUpload = useCallback(async () => {
    if (!parsed) return
    setUploading(true)
    setError(null)

    try {
      let inserted = 0
      const batchSize = 500

      for (let i = 0; i < parsed.length; i += batchSize) {
        const batch = parsed.slice(i, i + batchSize)
        const { data, error: err } = await supabase
          .from('lead_historico_trafego')
          .upsert(batch, { onConflict: 'atendimento_id', ignoreDuplicates: true })
          .select('id')

        if (err) throw err
        inserted += data?.length ?? 0
      }

      const duplicates = parsed.length - inserted
      setResult({ inserted, duplicates })
      setParsed(null)
      onUploadComplete?.()
    } catch (err) {
      setError(`Erro ao salvar: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setUploading(false)
    }
  }, [parsed, onUploadComplete])

  const trafegoCount = parsed
    ? parsed.filter(l => l.origem_trafego !== 'Organico').length
    : 0

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
      <div className="flex items-center gap-2 mb-4">
        <FileSpreadsheet className="w-5 h-5 text-blue-400" />
        <h2 className="text-sm font-semibold">Upload Planilha JetSales</h2>
        <span className="text-xs text-slate-500">(.xlsx)</span>
      </div>

      <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-600 rounded-lg p-6 cursor-pointer hover:border-blue-500 transition-colors">
        <Upload className="w-8 h-8 text-slate-400 mb-2" />
        <span className="text-sm text-slate-400">Selecione um arquivo .xlsx do JetSales</span>
        <input type="file" accept=".xlsx,.xls" onChange={handleFile} className="hidden" />
      </label>

      {parsing && (
        <div className="flex items-center gap-2 mt-4 text-blue-400 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Processando planilha...
        </div>
      )}

      {parsed && (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-slate-900 rounded-lg p-3">
              <div className="text-xs text-slate-400">Total Leads</div>
              <div className="text-lg font-bold">{parsed.length.toLocaleString()}</div>
            </div>
            <div className="bg-slate-900 rounded-lg p-3">
              <div className="text-xs text-slate-400">De Trafego</div>
              <div className="text-lg font-bold text-purple-400">{trafegoCount.toLocaleString()}</div>
            </div>
            <div className="bg-slate-900 rounded-lg p-3">
              <div className="text-xs text-slate-400">Organicos</div>
              <div className="text-lg font-bold text-green-400">{(parsed.length - trafegoCount).toLocaleString()}</div>
            </div>
            <div className="bg-slate-900 rounded-lg p-3">
              <div className="text-xs text-slate-400">Periodo</div>
              <div className="text-sm font-bold text-blue-400">
                {[...new Set(parsed.map(l => l.mes_ano))].sort().join(', ')}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {Object.entries(stats).sort((a, b) => b[1] - a[1]).map(([origem, count]) => (
              <span key={origem} className="px-2 py-1 rounded-full text-xs bg-slate-700 text-slate-300">
                {origem}: {count}
              </span>
            ))}
          </div>

          <button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            {uploading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
              : `Salvar ${parsed.length.toLocaleString()} leads`
            }
          </button>
        </div>
      )}

      {result && (
        <div className="flex items-center gap-2 mt-4 text-green-400 text-sm">
          <CheckCircle2 className="w-4 h-4" />
          {result.inserted} inseridos, {result.duplicates} ja existiam
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 mt-4 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
    </div>
  )
}
