// Tipos compartilhados por toda a aplicação
export type ContractStatus = 'rascunho' | 'pendente' | 'assinado' | 'concluido'

export interface Client {
  nome: string
  email: string
  cpfCnpj: string
  endereco: string
}

/** Assinatura registrada sobre um contrato. */
export interface Signature {
  /** Quem assinou (nome). */
  por: string
  /** Data/hora ISO da assinatura (detectada automaticamente pelo app). */
  em: string
  /** Desenho da assinatura em dataURL (opcional). */
  imagem?: string
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
  assinatura?: Signature
}

export interface FreelancerProfile {
  nome: string
  email: string
  telefone: string
  profissao: string
  pix: string
  termosPadrao: string
}

/** Cliente salvo na agenda do freelancer (persistido). */
export interface SavedClient extends Client {
  id: string
  criadoEm: string
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
