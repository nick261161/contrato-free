/**
 * Camada de integração com o backend (ponto extra).
 *
 * Como funciona:
 * - Se a variável de ambiente VITE_API_URL estiver definida (ex.: http://localhost:3001),
 *   as funções passam a consumir a API REST real usando fetch.
 * - Enquanto VITE_API_URL não existir, a aplicação roda em modo MOCK (dados simulados
 *   com delay, como se fosse uma chamada de rede).
 *
 * Para conectar ao seu backend Node.js basta criar um arquivo .env na raiz com:
 *   VITE_API_URL=http://localhost:3001
 * e manter os mesmos endpoints REST (/contracts, /profile).
 */
import type { Contract, FreelancerProfile } from '../types'

const API_BASE_URL: string = import.meta.env.VITE_API_URL ?? ''
const MOCK_DELAY_MS = 600

export const isMockMode = API_BASE_URL.trim() === ''

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

// ---------------------------------------------------------------------------
// MOCK: estado simulado do servidor
// ---------------------------------------------------------------------------
const mockProfile: FreelancerProfile = {
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

let mockContracts: Contract[] = [
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

// ---------------------------------------------------------------------------
// Endpoints públicos (mesmos nomes no mock e na API real)
// ---------------------------------------------------------------------------

/** GET /contracts */
export async function getContracts(): Promise<Contract[]> {
  if (isMockMode) return delay(mockContracts)
  return request<Contract[]>('/contracts')
}

/** POST /contracts */
export async function createContract(payload: Omit<Contract, 'id' | 'criadoEm'>): Promise<Contract> {
  if (isMockMode) {
    const created: Contract = {
      ...payload,
      id: `ctr-${Date.now()}`,
      criadoEm: new Date().toISOString(),
    }
    mockContracts = [created, ...mockContracts]
    return delay(created, 400)
  }
  return request<Contract>('/contracts', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/** GET /profile */
export async function getProfile(): Promise<FreelancerProfile> {
  if (isMockMode) return delay(mockProfile)
  return request<FreelancerProfile>('/profile')
}

/** PUT /profile */
export async function updateProfile(profile: FreelancerProfile): Promise<FreelancerProfile> {
  if (isMockMode) {
    Object.assign(mockProfile, profile)
    return delay(mockProfile, 400)
  }
  return request<FreelancerProfile>('/profile', {
    method: 'PUT',
    body: JSON.stringify(profile),
  })
}
