import { useCallback, useEffect, useState } from 'react'
import {
  deleteClient,
  getClients,
  saveClient,
  updateClient,
} from '../services/api'
import type { Client, SavedClient } from '../types'

/**
 * Custom hook da agenda de clientes: lista, cria/edita e exclui clientes.
 * Os dados ficam persistidos (localStorage no modo mock / API real quando configurada).
 */
export function useClients() {
  const [clients, setClients] = useState<SavedClient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getClients()
      setClients(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar clientes.')
    } finally {
      setLoading(false)
    }
  }, [])

  // useEffect: carrega a agenda de clientes ao montar o componente
  useEffect(() => {
    void reload()
  }, [reload])

  /** Cria ou atualiza (upsert por e-mail). */
  async function upsert(client: Client): Promise<SavedClient> {
    const saved = await saveClient(client)
    setClients((current) => {
      const index = current.findIndex((c) => c.id === saved.id)
      if (index === -1) return [saved, ...current]
      return current.map((c) => (c.id === saved.id ? saved : c))
    })
    return saved
  }

  async function edit(id: string, client: Client): Promise<SavedClient> {
    const updated = await updateClient(id, client)
    setClients((current) => current.map((c) => (c.id === id ? updated : c)))
    return updated
  }

  async function remove(id: string): Promise<void> {
    await deleteClient(id)
    setClients((current) => current.filter((c) => c.id !== id))
  }

  return { clients, loading, error, reload, upsert, edit, remove }
}
