import { Router } from 'express'
import { requerUsuario } from '../auth.js'
import { mapClient, query, upsertCliente } from '../db.js'
import { httpError, wrap } from '../http.js'

export const clientsRouter = Router()

function parseCliente(body) {
  const nome = String(body?.nome ?? '').trim()
  const email = String(body?.email ?? '').trim()
  if (!nome) throw httpError(400, 'Informe o nome do cliente.')
  if (!email) throw httpError(400, 'Informe o e-mail do cliente.')

  return {
    nome,
    email,
    cpfCnpj: String(body?.cpfCnpj ?? '').trim(),
    endereco: String(body?.endereco ?? '').trim(),
  }
}

/** GET /clients — agenda da CONTA logada (mais recentes primeiro). */
clientsRouter.get(
  '/',
  requerUsuario,
  wrap(async (req, res) => {
    const { rows } = await query(
      'SELECT * FROM clients WHERE user_id = $1 ORDER BY criado_em DESC, id DESC',
      [req.usuarioId],
    )
    res.json(rows.map(mapClient))
  }),
)

/** POST /clients — salva na CONTA logada; e-mail repetido nela atualiza (upsert). */
clientsRouter.post(
  '/',
  requerUsuario,
  wrap(async (req, res) => {
    const row = await upsertCliente(parseCliente(req.body), query, req.usuarioId)
    res.status(201).json(mapClient(row))
  }),
)

/** PUT /clients/:id — atualiza um cliente da agenda da CONTA dona. */
clientsRouter.put(
  '/:id',
  requerUsuario,
  wrap(async (req, res) => {
    const dados = parseCliente(req.body)
    const { rows } = await query(
      `UPDATE clients
          SET nome = $1, email = $2, cpf_cnpj = $3, endereco = $4
        WHERE id = $5 AND user_id = $6
        RETURNING *`,
      [
        dados.nome,
        dados.email,
        dados.cpfCnpj,
        dados.endereco,
        req.params.id,
        req.usuarioId,
      ],
    )
    if (!rows[0]) throw httpError(404, 'Cliente não encontrado.')
    res.json(mapClient(rows[0]))
  }),
)

/** DELETE /clients/:id — remove da agenda da CONTA dona. */
clientsRouter.delete(
  '/:id',
  requerUsuario,
  wrap(async (req, res) => {
    const { rows } = await query(
      'DELETE FROM clients WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.usuarioId],
    )
    if (!rows[0]) throw httpError(404, 'Cliente não encontrado.')
    res.json({ ok: true })
  }),
)
