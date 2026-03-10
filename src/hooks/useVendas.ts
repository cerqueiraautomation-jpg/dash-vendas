import { useEffect, useState, useCallback } from 'react'
import { supabase, type Venda } from '../lib/supabase'

const PAGE_SIZE = 1000

export function useVendas() {
  const [vendas, setVendas] = useState<Venda[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const all: Venda[] = []
    let from = 0

    while (true) {
      const { data, error } = await supabase
        .from('vendas_relatorio')
        .select('*')
        .order('data_pedido', { ascending: true })
        .order('pedido', { ascending: true })
        .range(from, from + PAGE_SIZE - 1)

      if (error) {
        console.error(error)
        break
      }

      all.push(...(data ?? []))

      if (!data || data.length < PAGE_SIZE) break
      from += PAGE_SIZE
    }

    setVendas(all)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  return { vendas, loading, refetch: fetchData }
}
