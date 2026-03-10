import { useEffect, useState, useCallback } from 'react'
import { supabase, type LeadHistorico } from '../lib/supabase'

export function useLeadHistorico() {
  const [historico, setHistorico] = useState<LeadHistorico[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(() => {
    setLoading(true)
    supabase
      .from('lead_historico_trafego')
      .select('*')
      .neq('origem_trafego', 'Organico')
      .order('data_entrada', { ascending: true })
      .then(({ data, error }) => {
        if (error) console.error(error)
        else setHistorico(data ?? [])
        setLoading(false)
      })
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  return { historico, loading, refetch: fetchData }
}
