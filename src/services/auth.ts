import { createAuthClient } from '@neon/auth'
import { BetterAuthReactAdapter } from '@neon/auth/react/adapters'

/**
 * Cliente do Neon Auth (Managed Better Auth) — ver skill neon-auth (React/Vite).
 *
 * A URL pública da branch vem de VITE_NEON_AUTH_URL, um alias manual criado em
 * `.env.local` (o `neon env pull` só escreve NEON_AUTH_BASE_URL, que é
 * server-side). Sem ela o app avisa no console e as chamadas falham.
 */
const baseUrl: string = import.meta.env.VITE_NEON_AUTH_URL ?? ''

if (!baseUrl) {
  console.error(
    '[auth] VITE_NEON_AUTH_URL ausente — rode `neon env pull` na raiz e reinicie o Vite.',
  )
}

export const authClient = createAuthClient(baseUrl, {
  adapter: BetterAuthReactAdapter(),
})

/**
 * Evento disparado (via `window`) quando a API responde 401 para uma
 * requisição que LEVOU token: a sessão era válida e foi rejeitada
 * (expirada ou revogada). O AuthContext escuta e encerra a sessão na UI.
 */
export const EVENTO_SESSAO_EXPIRADA = 'contratofree:sessao-expirada'

/**
 * Token da sessão recém-iniciada pelo sign-in/sign-up, guardado como reserva.
 *
 * O Better Auth devolve `{ token, user }` no sign-in — sem `session` — então o
 * cache interno do SDK não é populado ali: o primeiro `getSession()` só encontra
 * o token depois de uma ida ao servidor (`/get-session`). Enquanto isso não
 * acontece (rede lenta, cookie ainda não visível), as chamadas da API sairiam
 * SEM Authorization, a API responderia 401 e o app derrubava a sessão recém-criada
 * (o "Sua sessão expirou" logo após o login). O token do próprio sign-in cobre
 * esse intervalo até o SDK passar a devolver a sessão.
 */
let tokenReserva: string | null = null

/** Registra (ou limpa, ao receber `null`) o token da sessão atual. */
export function definirTokenSessao(token: string | null | undefined): void {
  tokenReserva = token ?? null
}

/** Token guardado no sign-in — reserva usada quando `getSession()` não traz. */
export function tokenSessaoReserva(): string | null {
  return tokenReserva
}

/** Usuário no formato devolvido pelo Better Auth (name/email). */
export interface UsuarioAuth {
  name?: string | null
  email: string
}

/** Traduz os erros comuns do Better Auth para PT-BR (mensagem específica). */
export function mensagemDeErro(
  error: { message?: string; code?: string } | null | undefined,
): string {
  const texto = (error?.message ?? '').toLowerCase()

  if (texto.includes('invalid email or password') || texto.includes('invalid credential')) {
    return 'E-mail ou senha incorretos.'
  }
  if (texto.includes('user already exists') || texto.includes('already registered')) {
    return 'Já existe uma conta com este e-mail.'
  }
  if (texto.includes('password') && (texto.includes('at least') || texto.includes('minimum'))) {
    return 'A senha precisa ter no mínimo 8 caracteres.'
  }
  if (texto.includes('rate limit') || texto.includes('too many')) {
    return 'Muitas tentativas. Aguarde alguns segundos e tente novamente.'
  }

  return error?.message || 'Falha na autenticação. Tente novamente.'
}
