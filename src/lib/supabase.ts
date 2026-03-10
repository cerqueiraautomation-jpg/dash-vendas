import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

export type Venda = {
  id: number
  pedido: string
  nome: string
  valor: number
  data_pedido: string
  origem: string
  campanha: string | null
  data_entrada_crm: string | null
  tempo_compra_dias: number | null
  recebeu_disparo: boolean
  dias_apos_disparo: number | null
  comprou_apos_disparo: string | null
  vendedor: string
  contact_id: string | null
}

export type LeadHistorico = {
  id: number
  atendimento_id: string
  telefone_normalizado: string
  nome: string
  data_entrada: string
  mes_ano: string
  origem_trafego: string
  agente: string | null
  raw_primeira_mensagem: string | null
}
