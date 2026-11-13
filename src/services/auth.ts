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

/** Usuário no formato devolvido pelo Better Auth (name/email). */
export interface UsuarioAuth {
  name?: string | null
  email: string
}
