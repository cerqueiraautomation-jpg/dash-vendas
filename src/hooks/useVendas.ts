import { useEffect, useState } from 'react'
import { supabase, type Venda } from '../lib/supabase'

export function useVendas() {
  const [vendas, setVendas] = useState<Venda[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('vendas_relatorio')
      .select('*')
      .order('data_pedido', { ascending: true })
      .order('pedido', { ascending: true })
      .then(({ data, error }) => {
        if (error) console.error(error)
        else setVendas(data ?? [])
        setLoading(false)
      })
  }, [])

  return { vendas, loading }
}
