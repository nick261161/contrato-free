import { useCallback, useEffect, useState } from 'react'
import {
  createContract,
  deleteContract,
  getContracts,
  signContract as apiSignContract,
  updateContract as apiUpdateContract,
} from '../services/api'
import type { Contract } from '../types'

type ContractPayload = Omit<Contract, 'id' | 'criadoEm'>

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

  async function addContract(payload: ContractPayload): Promise<Contract> {
    const created = await createContract(payload)
    setContracts((current) => [created, ...current])
    return created
  }

  async function editContract(id: string, payload: ContractPayload): Promise<Contract> {
    const updated = await apiUpdateContract(id, payload)
    setContracts((current) => current.map((c) => (c.id === id ? updated : c)))
    return updated
  }

  async function removeContract(id: string): Promise<void> {
    await deleteContract(id)
    setContracts((current) => current.filter((c) => c.id !== id))
  }

  /** Assina o contrato: status → "assinado" + carimbo de data/hora automático. */
  async function sign(
    id: string,
    signature: { por: string; imagem?: string },
  ): Promise<Contract> {
    const signed = await apiSignContract(id, signature)
    setContracts((current) => current.map((c) => (c.id === id ? signed : c)))
    return signed
  }

  return {
    contracts,
    loading,
    error,
    reload,
    addContract,
    editContract,
    removeContract,
    signContract: sign,
  }
}
