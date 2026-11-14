/**
 * Handler compartilado pelas funções explícitas da Vercel
 * (api/contracts/..., api/clients/..., api/profile.js).
 *
 * A Vercel casa cada arquivo de `api/` com um formato de caminho; aqui
 * montamos o MESMO app Express de server/app.js sob o prefixo /api
 * (caminho original da requisição) e também "solto", para o caso de a
 * função receber o caminho já recortado. O schema é garantido uma vez
 * por cold start (idempotente).
 */
import express from 'express'
import { ensureSchema } from './db.js'
import { app } from './app.js'

const pronto = ensureSchema()

const raiz = express()
raiz.use('/api', app)
raiz.use(app)

export default async function handler(req, res) {
  await pronto
  raiz(req, res)
}
