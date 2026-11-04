// Tipos compartilhados por toda a aplicação
export type ContractStatus = 'rascunho' | 'pendente' | 'assinado' | 'concluido'

export interface Client {
  nome: string
  email: string
  cpfCnpj: string
  endereco: string
}

export interface Contract {
  id: string
  titulo: string
  cliente: Client
  valor: number
  dataInicio: string
  prazoDias: number
  descricao: string
  status: ContractStatus
  criadoEm: string
}

export interface FreelancerProfile {
  nome: string
  email: string
  telefone: string
  profissao: string
  pix: string
  termosPadrao: string
}

export interface AuthUser {
  nome: string
  email: string
}

export interface Metric {
  label: string
  value: string
  hint: string
}

export const STATUS_LABEL: Record<ContractStatus, string> = {
  rascunho: 'Rascunho',
  pendente: 'Pendente',
  assinado: 'Assinado',
  concluido: 'Concluído',
}
