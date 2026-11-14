/**
 * App Express do ContratoFree — SEM listen (módulo reutilizável).
 *
 * É importado por:
 * - server/index.js → uso local (`npm run api` / `npm run dev`), com listen;
 * - api/[...slug].js → entrada da Vercel, que monta o app sob /api.
 *
 * Endpoints (mesmo contrato consumido por src/services/api.ts):
 *   GET/POST /contracts · GET/PUT/DELETE /contracts/:id · POST /contracts/:id/sign
 *   GET/POST /clients  · PUT/DELETE /clients/:id
 *   GET/PUT  /profile
 *   GET /health
 */
import express from 'express'
import cors from 'cors'
import { pool } from './db.js'
import { contractsRouter } from './routes/contracts.js'
import { clientsRouter } from './routes/clients.js'
import { profileRouter } from './routes/profile.js'

export const app = express()

app.use(cors())
// Limite generoso: as assinaturas viajam como dataURL (PNG do canvas).
app.use(express.json({ limit: '5mb' }))

/** Smoke test do serviço + do banco. */
app.get('/health', async (req, res, next) => {
  try {
    await pool.query('SELECT 1')
    res.json({
      ok: true,
      servico: 'contratofree-api',
      banco: 'postgresql',
      branch: process.env.NEON_BRANCH ?? null,
    })
  } catch (err) {
    next(err)
  }
})

app.use('/contracts', contractsRouter)
app.use('/clients', clientsRouter)
app.use('/profile', profileRouter)

// 404 em JSON
app.use((req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada.' })
})

// Middleware de erro (Express exige os 4 parâmetros para reconhecer erro)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'JSON inválido no corpo da requisição.' })
  }
  if (err.code === '23505') {
    return res.status(409).json({ erro: 'Já existe um registro com este e-mail.' })
  }
  // O body-parser pode falhar com `status` (padrão) ou, no runtime da Vercel,
  // com apenas `statusCode` — ambos são erros do cliente e não podem virar 500.
  const status = err.status || err.statusCode
  if (status && status >= 400 && status < 500) {
    const mensagem =
      status === 400 && /json/i.test(String(err.message ?? ''))
        ? 'JSON inválido no corpo da requisição.'
        : err.message
    return res.status(status).json({ erro: mensagem })
  }
  console.error('[api] erro interno:', err)
  res.status(500).json({ erro: 'Erro interno do servidor.' })
})
