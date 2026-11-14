/**
 * Entrada da API na Vercel (fallback: caminhos de 1 segmento após /api,
 * como /api/health — as rotas com :id têm funções explícitas em
 * api/contracts/..., api/clients/... e api/profile.js, porque a Vercel
 * não casa múltiplos segmentos com este catch-all).
 *
 * O frontend em produção chama caminhos relativos com VITE_API_URL=/api,
 * então montamos o mesmo app Express de server/app.js sob o prefixo /api —
 * mantendo o contrato REST de src/services/api.ts intacto.
 */
import express from 'express'
import { ensureSchema } from '../server/db.js'
import { app } from '../server/app.js'

// Schema idempotente: roda uma vez por cold start,
// mesmo comportamento do `npm run api` local.
const pronto = ensureSchema()

const raiz = express()
raiz.use('/api', app)

export default async function handler(req, res) {
  await pronto
  raiz(req, res)
}
