import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Router } from 'express'
import { requerUsuario } from '../auth.js'
import { mapProfile, query } from '../db.js'
import { httpError, wrap } from '../http.js'

export const profileRouter = Router()

const here = path.dirname(fileURLToPath(import.meta.url))
const nichos = ['design', 'dev', 'social', 'video', 'redacao']

function preferencias(body) {
  const imagem = String(body.imagem ?? '')
  if (imagem && (imagem.length > 120_000 || !/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(imagem))) {
    throw httpError(400, 'Envie uma foto ou logo válido.')
  }
  const defaults = body.padroes ?? {}
  const prazo = Math.round(Number(defaults.prazoDias))
  const valor = Number(defaults.valor)
  return {
    marca: String(body.marca ?? '').trim().slice(0, 120),
    documento: String(body.documento ?? '').trim().slice(0, 30),
    endereco: String(body.endereco ?? '').trim().slice(0, 280),
    imagem,
    temaPdf: body.temaPdf === 'botanico' ? 'botanico' : 'editorial',
    padroes: {
      nicho: nichos.includes(defaults.nicho) ? defaults.nicho : '',
      prazoDias: prazo >= 1 && prazo <= 3650 ? prazo : 0,
      valor: Number.isFinite(valor) && valor > 0 ? valor : 0,
      pagamento: String(defaults.pagamento ?? '').trim().slice(0, 1600),
      clausulas: Object.fromEntries(['multa', 'nda', 'portfolio', 'rescisao'].map(
        (chave) => [chave, defaults.clausulas?.[chave] === true],
      )),
    },
  }
}

/** Template padrão (textos oficiais de server/seed.json). */
function templatePerfil() {
  const seed = JSON.parse(
    fs.readFileSync(path.join(here, '..', 'seed.json'), 'utf8'),
  )
  return seed.profile
}

/**
 * GET /profile — perfil da CONTA logada (uma linha por conta).
 * Na primeira visita cria a linha com os dados da própria conta
 * (nome/e-mail do Neon Auth) + os textos padrão do template.
 */
profileRouter.get(
  '/',
  requerUsuario,
  wrap(async (req, res) => {
    let { rows } = await query('SELECT * FROM profiles WHERE user_id = $1', [
      req.usuarioId,
    ])

    if (!rows[0]) {
      const t = templatePerfil()
      const conta = await query(
        'SELECT name, email FROM neon_auth.user WHERE id = $1',
        [req.usuarioId],
      )
      const insert = await query(
        `INSERT INTO profiles (user_id, nome, email, telefone, profissao, pix, termos_padrao)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (user_id) DO UPDATE SET nome = EXCLUDED.nome
         RETURNING *`,
        [
          req.usuarioId,
          String(conta.rows[0]?.name ?? '').trim() || t.nome,
          String(conta.rows[0]?.email ?? '').trim() || t.email,
          t.telefone,
          t.profissao,
          t.pix,
          t.termosPadrao,
        ],
      )
      rows = insert.rows
    }

    res.json(mapProfile(rows[0]))
  }),
)

/** PUT /profile — atualiza (upsert) o perfil da CONTA logada. */
profileRouter.put(
  '/',
  requerUsuario,
  wrap(async (req, res) => {
    const body = req.body ?? {}
    const nome = String(body.nome ?? '').trim()
    if (!nome) throw httpError(400, 'Informe o nome do prestador.')

    const { rows } = await query(
      `INSERT INTO profiles (user_id, nome, email, telefone, profissao, pix, termos_padrao, preferencias)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (user_id) DO UPDATE SET
         nome = EXCLUDED.nome,
         email = EXCLUDED.email,
         telefone = EXCLUDED.telefone,
         profissao = EXCLUDED.profissao,
         pix = EXCLUDED.pix,
         termos_padrao = EXCLUDED.termos_padrao,
         preferencias = profiles.preferencias || EXCLUDED.preferencias
       RETURNING *`,
      [
        req.usuarioId,
        nome,
        String(body.email ?? '').trim(),
        String(body.telefone ?? '').trim(),
        String(body.profissao ?? '').trim(),
        String(body.pix ?? '').trim(),
        String(body.termosPadrao ?? '').trim(),
        ['marca', 'documento', 'endereco', 'imagem', 'temaPdf', 'padroes'].some((key) => key in body)
          ? preferencias(body)
          : {},
      ],
    )

    res.json(mapProfile(rows[0]))
  }),
)
