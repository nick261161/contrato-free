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
  /**
   * SHA-256 (hex) do conteúdo do contrato no momento da assinatura —
   * gerado pelo servidor para comprovar integridade; no modo mock, gerado
   * localmente com Web Crypto (ver services/canonico.ts).
   */
  hash?: string
  /** Endereço IP de quem assinou (registrado pelo servidor). */
  ip?: string
}

/**
 * Qual parte do contrato está assinando:
 * - `prestador` = o freelancer (assinado no painel);
 * - `contratante` = o cliente (assinado pelo link público /assinar/:id).
 */
export type SignRole = 'prestador' | 'contratante'

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
  /** Assinatura do prestador (freelancer) — registrada no dashboard. */
  assinaturaPrestador?: Signature
  /** Assinatura do contratante (cliente) — registrada pelo link público. */
  assinaturaContratante?: Signature
  /**
   * Perfil público do prestador (dono do contrato) — embutido na busca
   * pública por id para a página de assinatura (/assinar/:id) mostrar
   * quem preparou e os termos sem exigir login.
   */
  prestador?: FreelancerProfile
  /**
   * Nicho de atuação escolhido no wizard (design, dev, social, video,
   * redacao) — define as cláusulas-base do contrato (services/clausulas.ts).
   */
  nicho?: string
  /** Cláusulas opcionais ativas (liga/desliga) neste contrato. */
  clausulas?: Clausulas
}

/** Cláusulas opcionais que o freelancer liga/desliga no wizard. */
export interface Clausulas {
  /** Multa por atraso no pagamento. */
  multa: boolean
  /** Confidencialidade (NDA). */
  nda: boolean
  /** Direito de uso do trabalho em portfólio. */
  portfolio: boolean
  /** Rescisão antecipada. */
  rescisao: boolean
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
