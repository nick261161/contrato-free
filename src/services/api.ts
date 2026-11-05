/**
 * Camada de integração com o backend (ponto extra).
 *
 * Como funciona:
 * - Se a variável de ambiente VITE_API_URL estiver definida (ex.: http://localhost:3001),
 *   as funções passam a consumir a API REST real usando fetch.
 * - Enquanto VITE_API_URL não existir, a aplicação roda em modo MOCK: os dados de
 *   contratos, clientes e perfil são persistidos no localStorage (sobrevivem ao F5)
 *   e as funções retornam Promises com latência simulada.
 *
 * Para conectar ao seu backend Node.js basta criar um arquivo .env na raiz com:
 *   VITE_API_URL=http://localhost:3001
 * e implementar os endpoints REST listados no README.
 */
import type { Client, Contract, FreelancerProfile, SavedClient } from '../types'

const API_BASE_URL: string = import.meta.env.VITE_API_URL ?? ''
const MOCK_DELAY_MS = 600

export const isMockMode = API_BASE_URL.trim() === ''

// Chaves de persistência do modo mock
const CONTRACTS_KEY = 'contratofree.mock.contracts'
const CLIENTS_KEY = 'contratofree.mock.clients'
const PROFILE_KEY = 'contratofree.mock.profile'

/** Helper genérico para chamadas REST reais. */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })

  if (!response.ok) {
    throw new Error(`Erro ${response.status}: ${response.statusText}`)
  }

  return (await response.json()) as T
}

function delay<T>(data: T, ms = MOCK_DELAY_MS): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(structuredClone(data)), ms))
}

function loadLocal<T>(key: string, seed: T): T {
  try {
    const stored = localStorage.getItem(key)
    if (stored) return JSON.parse(stored) as T
  } catch {
    // dados corrompidos: recai para o seed
  }
  persistLocal(key, seed)
  return structuredClone(seed)
}

function persistLocal<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value))
}

// ---------------------------------------------------------------------------
// MOCK: estado simulado do servidor (persistido no localStorage)
// ---------------------------------------------------------------------------
const seedProfile: FreelancerProfile = {
  nome: 'Ana Freelancer',
  email: 'ana@freela.com',
  telefone: '(11) 99999-0000',
  profissao: 'Desenvolvedora Front-end',
  pix: 'ana.freelancer@email.com',
  termosPadrao:
    'Pagamento em até 5 dias úteis após a aprovação da entrega. ' +
    'Duas rodadas de revisões estão inclusas; alterações adicionais serão orçadas separadamente. ' +
    'O prazo final será contado a partir da confirmação do pagamento da primeira parcela.',
}

const seedContracts: Contract[] = [
  {
    id: 'ctr-1001',
    titulo: 'Landing page institucional',
    cliente: {
      nome: 'Padaria Estrela',
      email: 'contato@padariaestrela.com',
      cpfCnpj: '12.345.678/0001-90',
      endereco: 'Rua das Flores, 120 — São Paulo/SP',
    },
    valor: 3500,
    dataInicio: '2026-10-20',
    prazoDias: 30,
    descricao:
      'Desenvolvimento de landing page responsiva com 5 seções, formulário de contato e integração com Google Analytics.',
    status: 'assinado',
    criadoEm: '2026-10-12T14:30:00.000Z',
  },
  {
    id: 'ctr-1002',
    titulo: 'Manutenção mensal de site',
    cliente: {
      nome: 'Clínica Bem Viver',
      email: 'admin@bemviver.com',
      cpfCnpj: '98.765.432/0001-11',
      endereco: 'Av. Central, 450 — Campinas/SP',
    },
    valor: 1200,
    dataInicio: '2026-11-01',
    prazoDias: 90,
    descricao:
      'Atualizações de conteúdo, backups semanais e pequenas correções de layout durante o período contratado.',
    status: 'pendente',
    criadoEm: '2026-10-28T09:10:00.000Z',
  },
  {
    id: 'ctr-1003',
    titulo: 'Sistema de agendamento online',
    cliente: {
      nome: 'Studio Move',
      email: 'contato@studiomove.com',
      cpfCnpj: '45.678.912/0001-34',
      endereco: 'Rua Rio Branco, 77 — Rio de Janeiro/RJ',
    },
    valor: 8900,
    dataInicio: '2026-11-15',
    prazoDias: 60,
    descricao:
      'Aplicação web para agendamento de aulas com painel do aluno, painel da recepção e envio de lembretes por e-mail.',
    status: 'rascunho',
    criadoEm: '2026-11-02T18:45:00.000Z',
  },
]

/** Clientes iniciais derivados dos contratos de exemplo (agenda nunca vazia na 1ª visita). */
const seedClients: SavedClient[] = seedContracts.map((contract, index) => ({
  ...contract.cliente,
  id: `cli-100${index + 1}`,
  criadoEm: contract.criadoEm,
}))

let mockContracts: Contract[] = loadLocal(CONTRACTS_KEY, seedContracts)
let mockClients: SavedClient[] = loadLocal(CLIENTS_KEY, seedClients)
let mockProfile: FreelancerProfile = loadLocal(PROFILE_KEY, seedProfile)

function commitContracts(): void {
  persistLocal(CONTRACTS_KEY, mockContracts)
}

function commitClients(): void {
  persistLocal(CLIENTS_KEY, mockClients)
}

/** Upsert sincrono usado pelas mutações de contrato (mantém a agenda de clientes atualizada). */
function upsertClientSync(client: Client): SavedClient {
  const email = client.email.trim().toLowerCase()
  const existing = mockClients.find((c) => c.email.trim().toLowerCase() === email)

  if (existing) {
    Object.assign(existing, client)
    commitClients()
    return existing
  }

  const created: SavedClient = {
    ...client,
    id: `cli-${Date.now()}`,
    criadoEm: new Date().toISOString(),
  }
  mockClients = [created, ...mockClients]
  commitClients()
  return created
}

// ---------------------------------------------------------------------------
// Contratos — GET/POST /contracts · PUT/DELETE /contracts/:id
// ---------------------------------------------------------------------------

export async function getContracts(): Promise<Contract[]> {
  if (isMockMode) return delay(mockContracts)
  return request<Contract[]>('/contracts')
}

export async function createContract(payload: Omit<Contract, 'id' | 'criadoEm'>): Promise<Contract> {
  if (isMockMode) {
    const created: Contract = {
      ...payload,
      id: `ctr-${Date.now()}`,
      criadoEm: new Date().toISOString(),
    }
    mockContracts = [created, ...mockContracts]
    commitContracts()
    upsertClientSync(payload.cliente)
    return delay(created, 400)
  }
  return request<Contract>('/contracts', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateContract(
  id: string,
  payload: Omit<Contract, 'id' | 'criadoEm'>,
): Promise<Contract> {
  if (isMockMode) {
    const index = mockContracts.findIndex((c) => c.id === id)
    if (index === -1) throw new Error('Contrato não encontrado.')

    const updated: Contract = { ...mockContracts[index], ...payload }
    mockContracts[index] = updated
    commitContracts()
    upsertClientSync(payload.cliente)
    return delay(updated, 400)
  }
  return request<Contract>(`/contracts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function deleteContract(id: string): Promise<void> {
  if (isMockMode) {
    mockContracts = mockContracts.filter((c) => c.id !== id)
    commitContracts()
    await delay(null, 350)
    return
  }
  await request<void>(`/contracts/${id}`, { method: 'DELETE' })
}

/**
 * Assina um contrato: muda o status para "assinado" e grava quem assinou,
 * a data/hora (detectada aqui, automaticamente) e o desenho opcional.
 * POST /contracts/:id/sign
 */
export async function signContract(
  id: string,
  signature: { por: string; imagem?: string },
): Promise<Contract> {
  if (isMockMode) {
    const index = mockContracts.findIndex((c) => c.id === id)
    if (index === -1) throw new Error('Contrato não encontrado.')

    const updated: Contract = {
      ...mockContracts[index],
      status: 'assinado',
      assinatura: {
        por: signature.por.trim(),
        em: new Date().toISOString(),
        imagem: signature.imagem,
      },
    }
    mockContracts[index] = updated
    commitContracts()
    return delay(updated, 450)
  }
  return request<Contract>(`/contracts/${id}/sign`, {
    method: 'POST',
    body: JSON.stringify(signature),
  })
}

// ---------------------------------------------------------------------------
// Clientes — GET/POST /clients · PUT/DELETE /clients/:id
// ---------------------------------------------------------------------------

export async function getClients(): Promise<SavedClient[]> {
  if (isMockMode) return delay(mockClients)
  return request<SavedClient[]>('/clients')
}

/** Salva um cliente; se o e-mail já existir, atualiza o registro (upsert). */
export async function saveClient(client: Client): Promise<SavedClient> {
  if (isMockMode) return delay(upsertClientSync(client), 350)
  return request<SavedClient>('/clients', {
    method: 'POST',
    body: JSON.stringify(client),
  })
}

export async function updateClient(id: string, client: Client): Promise<SavedClient> {
  if (isMockMode) {
    const existing = mockClients.find((c) => c.id === id)
    if (!existing) throw new Error('Cliente não encontrado.')
    Object.assign(existing, client)
    commitClients()
    return delay(existing, 350)
  }
  return request<SavedClient>(`/clients/${id}`, {
    method: 'PUT',
    body: JSON.stringify(client),
  })
}

export async function deleteClient(id: string): Promise<void> {
  if (isMockMode) {
    mockClients = mockClients.filter((c) => c.id !== id)
    commitClients()
    await delay(null, 350)
    return
  }
  await request<void>(`/clients/${id}`, { method: 'DELETE' })
}

// ---------------------------------------------------------------------------
// Perfil — GET/PUT /profile
// ---------------------------------------------------------------------------

export async function getProfile(): Promise<FreelancerProfile> {
  if (isMockMode) return delay(mockProfile)
  return request<FreelancerProfile>('/profile')
}

export async function updateProfile(profile: FreelancerProfile): Promise<FreelancerProfile> {
  if (isMockMode) {
    mockProfile = { ...profile }
    persistLocal(PROFILE_KEY, mockProfile)
    return delay(mockProfile, 400)
  }
  return request<FreelancerProfile>('/profile', {
    method: 'PUT',
    body: JSON.stringify(profile),
  })
}
