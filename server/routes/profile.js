import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Router } from 'express'
import { mapProfile, query } from '../db.js'
import { httpError, wrap } from '../http.js'

export const profileRouter = Router()

const here = path.dirname(fileURLToPath(import.meta.url))

function seedProfile() {
  const seed = JSON.parse(
    fs.readFileSync(path.join(here, '..', 'seed.json'), 'utf8'),
  )
  return seed.profile
}

/** GET /profile — perfil do freelancer (linha única, id = 1). */
profileRouter.get(
  '/',
  wrap(async (req, res) => {
    let { rows } = await query('SELECT * FROM profiles WHERE id = 1')

    // primeira execução sem seed: cria com os dados padrão
    if (!rows[0]) {
      const p = seedProfile()
      const insert = await query(
        `INSERT INTO profiles (id, nome, email, telefone, profissao, pix, termos_padrao)
         VALUES (1, $1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome
         RETURNING *`,
        [p.nome, p.email, p.telefone, p.profissao, p.pix, p.termosPadrao],
      )
      rows = insert.rows
    }

    res.json(mapProfile(rows[0]))
  }),
)

/** PUT /profile — atualiza (upsert) o perfil. */
profileRouter.put(
  '/',
  wrap(async (req, res) => {
    const body = req.body ?? {}
    const nome = String(body.nome ?? '').trim()
    if (!nome) throw httpError(400, 'Informe o nome do prestador.')

    const { rows } = await query(
      `INSERT INTO profiles (id, nome, email, telefone, profissao, pix, termos_padrao)
       VALUES (1, $1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         nome = EXCLUDED.nome,
         email = EXCLUDED.email,
         telefone = EXCLUDED.telefone,
         profissao = EXCLUDED.profissao,
         pix = EXCLUDED.pix,
         termos_padrao = EXCLUDED.termos_padrao
       RETURNING *`,
      [
        nome,
        String(body.email ?? '').trim(),
        String(body.telefone ?? '').trim(),
        String(body.profissao ?? '').trim(),
        String(body.pix ?? '').trim(),
        String(body.termosPadrao ?? '').trim(),
      ],
    )

    res.json(mapProfile(rows[0]))
  }),
)
