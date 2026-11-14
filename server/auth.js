/**
 * Autenticação da API — isolamento de dados por conta.
 *
 * O frontend envia como `Authorization: Bearer <token>` o JWT que o SDK do
 * Neon Auth devolve em `getSession().data.session.token` (alg EdDSA, emitido
 * pelo próprio Neon Auth). Aqui validamos a assinatura contra o JWKS
 * (NEON_AUTH_JWKS_URL) com a biblioteca `jose` — sem chamadas de rede por
 * requisição (o JWKS é cacheado) e sem depender de segredos compartilhados.
 *
 * Compatibilidade: tokens opacos (o `session.token` cru da tabela
 * neon_auth.session, úteis em testes via curl) também são aceitos, validados
 * direto no banco (mesmo esquema do Neon Auth).
 *
 * Em caso de sucesso, expõe `req.usuarioId` para as rotas.
 */
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { query } from './db.js'
import { httpError, wrap } from './http.js'

const URL_JWKS = process.env.NEON_AUTH_JWKS_URL?.trim()

/** Cache do JWKS (busca a primeira vez e revalida sozinho). */
const jwks = URL_JWKS ? createRemoteJWKSet(new URL(URL_JWKS)) : null

/** Valida um token opaco consultando a tabela de sessões do Neon Auth. */
async function usuarioPorTokenOpaco(token) {
  const { rows } = await query(
    `SELECT "userId" FROM neon_auth.session
      WHERE token = $1 AND "expiresAt" > now()`,
    [token],
  )
  return rows[0]?.userId ?? null
}

export const requerUsuario = wrap(async (req, res, next) => {
  const cabecalho = String(req.headers.authorization ?? '')
  const token = cabecalho.startsWith('Bearer ')
    ? cabecalho.slice(7).trim()
    : ''

  if (!token) {
    throw httpError(401, 'Sessão não encontrada. Faça login novamente.')
  }

  let usuarioId = null

  if (token.startsWith('eyJ')) {
    // JWT do Neon Auth: valida assinatura (JWKS) + expiração.
    if (!jwks) {
      throw httpError(
        500,
        'NEON_AUTH_JWKS_URL não configurado no ambiente.',
      )
    }
    try {
      const { payload } = await jwtVerify(token, jwks)
      usuarioId = payload.sub ?? null
    } catch {
      throw httpError(401, 'Sessão expirada. Faça login novamente.')
    }
  } else {
    // Token opaco (fallback): precisa existir e não estar expirado.
    usuarioId = await usuarioPorTokenOpaco(token)
    if (!usuarioId) {
      throw httpError(401, 'Sessão expirada. Faça login novamente.')
    }
  }

  if (!usuarioId) {
    throw httpError(401, 'Sessão expirada. Faça login novamente.')
  }

  req.usuarioId = usuarioId
  next()
})
