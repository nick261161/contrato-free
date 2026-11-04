import { useCallback, useEffect, useState } from 'react'
import { createContract, getContracts } from '../services/api'
import type { Contract } from '../types'

/**
 * Custom hook responsável por carregar e gerenciar a lista de contratos.
 * Combina useState + useEffect + useCallback e conversa com a camada de API.
 */
export function useContracts() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getContracts()
      setContracts(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar contratos.')
    } finally {
      setLoading(false)
    }
  }, [])

  // useEffect: busca inicial dos contratos (simula a chamada ao backend)
  useEffect(() => {
    void reload()
  }, [reload])

  async function addContract(payload: Omit<Contract, 'id' | 'criadoEm'>): Promise<Contract> {
    const created = await createContract(payload)
    setContracts((current) => [created, ...current])
    return created
  }

  return { contracts, loading, error, reload, addContract }
}
