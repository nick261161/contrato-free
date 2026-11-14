/**
 * API REST do ContratoFree — entrada LOCAL (Express + PostgreSQL no Neon).
 *
 * O app em si (rotas, middlewares) vive em server/app.js; aqui só rodamos
 * o ciclo local: garante o schema e sobe o listener.
 *
 * Na Vercel a mesma aplicação é montada pelas funções de api/ (ver
 * server/vercel.js) sob /api.
 */
import { ensureSchema } from './db.js'
import { app } from './app.js'

const PORTA = Number(process.env.PORT) || 3001

async function iniciar() {
  await ensureSchema()
  app.listen(PORTA, () => {
    console.log(`✅ API ContratoFree em http://localhost:${PORTA}`)
    console.log(`   Banco: PostgreSQL ${process.env.NEON_BRANCH ?? ''}`.trim())
  })
}

iniciar().catch((err) => {
  console.error('❌ Falha ao preparar o banco:', err.message)
  process.exit(1)
})
