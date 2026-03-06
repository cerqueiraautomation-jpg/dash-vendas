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
}
