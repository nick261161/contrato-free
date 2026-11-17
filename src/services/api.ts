/**
 * Camada de integração com o backend.
 *
 * Como funciona:
 * - Se a variável de ambiente VITE_API_URL estiver definida (ex.: http://localhost:3001),
 *   as funções passam a consumir a API REST real usando fetch.
 * - Enquanto VITE_API_URL não existir, a aplicação roda em modo MOCK: os dados de
 *   contratos, clientes e perfil são persistidos no localStorage (sobrevivem ao F5)
 *   e as funções retornam Promises com latência simulada.
 *
 * Neste projeto a API real é o Express em `server/`, ligado ao PostgreSQL do Neon
 * (DATABASE_URL do `.env.local`, gerado pelo `neon deploy`). Para usá-la:
 *   npm run dev   (sobe API em :3001 + Vite em :5173)
 * O contrato REST implementado pelo servidor está listado no README.
 */
import type {
  Client,
  Contract,
  FreelancerProfile,
  SavedClient,
  SignRole,
  Signature,
} from '../types'
import { authClient, definirTokenSessao, EVENTO_SESSAO_EXPIRADA, tokenSessaoReserva } from './auth'

const API_BASE_URL: string = import.meta.env.VITE_API_URL ?? ''
const MOCK_DELAY_MS = 600

export const isMockMode = API_BASE_URL.trim() === ''

// Chaves de persistência do modo mock
const CONTRACTS_KEY = 'contratofree.mock.contracts'
const CLIENTS_KEY = 'contratofree.mock.clients'
const PROFILE_KEY = 'contratofree.mock.profile'

/** Shape da sessão devolvida por `authClient.getSession()` (SDK Better Auth). */
type SessaoSdk = { data?: { session?: { token?: string } | null } | null }

/** Token da sessão atual: cache do SDK primeiro, reserva do sign-in por último. */
async function obterTokenSessao(): Promise<string | null> {
  try {
    const sessao = (await authClient.getSession()) as SessaoSdk | null | undefined
    const token = sessao?.data?.session?.token
    if (token) return token
  } catch {
    // sem rede ou sem sessão ativa: cai na reserva gravada no sign-in
  }
  return tokenSessaoReserva()
}

/**
 * Busca uma sessão IGNORANDO o cache do SDK (header `X-Force-Fetch`,
 * tratado pelo customFetchImpl do @neon/auth). Usado quando a API responde
 * 401: pode ser que o token em uso esteja desatualizado e a sessão real
 * (cookie) ainda esteja boa.
 */
async function sessaoForcada(): Promise<string | null> {
  try {
    const sessao = (await authClient.getSession({
      fetchOptions: { headers: { 'X-Force-Fetch': 'true' } },
    })) as SessaoSdk | null | undefined
    return sessao?.data?.session?.token ?? null
  } catch {
    return null
  }
}

/** Helper genérico para chamadas REST reais. */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }

  // Envia o token da sessão do Neon Auth: a API valida ele e usa o
  // usuário para isolar contratos/clientes/perfil por conta.
  let token = await obterTokenSessao()
  if (token) headers.Authorization = `Bearer ${token}`

  const enviar = () =>
    fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { ...headers, ...(init?.headers as Record<string, string> | undefined) },
    })

  let response = await enviar()

  // 401 com token em uso: pode ser uma reserva/cached desatualizado. Busca uma
  // sessão fresca (sem cache) e repete a chamada UMA vez antes de desistir.
  if (response.status === 401 && token) {
    const tokenNovo = await sessaoForcada()
    if (tokenNovo && tokenNovo !== token) {
      token = tokenNovo
      definirTokenSessao(tokenNovo)
      headers.Authorization = `Bearer ${tokenNovo}`
      response = await enviar()
    }
  }

  if (!response.ok) {
    // 401 da API só encerra a sessão quando um token FOI enviado e a API o
    // rejeitou (expirada ou revogada). Requisição sem token não derruba o
    // login — era isso que mostrava "Sua sessão expirou" logo após entrar.
    if (response.status === 401 && token) {
      definirTokenSessao(null)
      window.dispatchEvent(new CustomEvent(EVENTO_SESSAO_EXPIRADA))
    }
    let detalhe = response.statusText || `HTTP ${response.status}`
    try {
      const corpo = (await response.json()) as { erro?: string }
      if (corpo?.erro) detalhe = corpo.erro
    } catch {
      // resposta sem corpo JSON: mantém o statusText
    }
    throw new Error(`Erro ${response.status}: ${detalhe}`)
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

/**
 * Migra contratos gravados em versões antigas da app: existia um campo único
 * `assinatura` (hoje separado em `assinaturaPrestador` / `assinaturaContratante`)
 * e o status só passa a "assinado" quando as DUAS assinaturas estão presentes.
 */
function migrateContracts(list: Contract[]): Contract[] {
  return list.map((raw) => {
    const legado = raw as Contract & { assinatura?: Signature }
    if (!legado.assinatura) return raw

    const { assinatura, ...resto } = legado
    const migrado: Contract = { ...resto, assinaturaContratante: assinatura }
    if (migrado.status !== 'concluido') migrado.status = 'pendente'
    return migrado
  })
}

let mockContracts: Contract[] = migrateContracts(loadLocal(CONTRACTS_KEY, seedContracts))
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

/** Busca um contrato pelo id (usado pela página pública de assinatura). */
export async function getContract(id: string): Promise<Contract> {
  if (isMockMode) {
    const found = mockContracts.find((c) => c.id === id)
    if (!found) throw new Error('Contrato não encontrado.')
    return delay(found, 400)
  }
  return request<Contract>(`/contracts/${id}`)
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
 * Registra a assinatura de uma das partes do contrato:
 * - `prestador` = o freelancer (assina no dashboard);
 * - `contratante` = o cliente (assina pelo link público /assinar/:id).
 *
 * Grava quem assinou, a data/hora (detectada aqui, automaticamente) e o desenho
 * opcional. O status só vira "assinado" quando as DUAS assinaturas existem.
 * POST /contracts/:id/sign
 */
export async function signContract(
  id: string,
  signature: { por: string; imagem?: string; quem: SignRole },
): Promise<Contract> {
  if (isMockMode) {
    const index = mockContracts.findIndex((c) => c.id === id)
    if (index === -1) throw new Error('Contrato não encontrado.')

    const atual = mockContracts[index]
    const nova: Signature = {
      por: signature.por.trim(),
      em: new Date().toISOString(),
      imagem: signature.imagem,
    }

    const updated: Contract =
      signature.quem === 'prestador'
        ? { ...atual, assinaturaPrestador: nova }
        : { ...atual, assinaturaContratante: nova }

    updated.status =
      updated.assinaturaPrestador && updated.assinaturaContratante
        ? 'assinado'
        : updated.status === 'concluido'
          ? 'concluido'
          : 'pendente'

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
