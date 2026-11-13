import { Router } from 'express'
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

/** GET /clients — agenda completa (mais recentes primeiro). */
clientsRouter.get(
  '/',
  wrap(async (req, res) => {
    const { rows } = await query(
      'SELECT * FROM clients ORDER BY criado_em DESC, id DESC',
    )
    res.json(rows.map(mapClient))
  }),
)

/** POST /clients — salva; se o e-mail já existir, atualiza (upsert). */
clientsRouter.post(
  '/',
  wrap(async (req, res) => {
    const row = await upsertCliente(parseCliente(req.body))
    res.status(201).json(mapClient(row))
  }),
)

/** PUT /clients/:id — atualiza um cliente da agenda. */
clientsRouter.put(
  '/:id',
  wrap(async (req, res) => {
    const dados = parseCliente(req.body)
    const { rows } = await query(
      `UPDATE clients
          SET nome = $1, email = $2, cpf_cnpj = $3, endereco = $4
        WHERE id = $5
        RETURNING *`,
      [dados.nome, dados.email, dados.cpfCnpj, dados.endereco, req.params.id],
    )
    if (!rows[0]) throw httpError(404, 'Cliente não encontrado.')
    res.json(mapClient(rows[0]))
  }),
)

/** DELETE /clients/:id — remove da agenda. */
clientsRouter.delete(
  '/:id',
  wrap(async (req, res) => {
    const { rows } = await query('DELETE FROM clients WHERE id = $1 RETURNING id', [
      req.params.id,
    ])
    if (!rows[0]) throw httpError(404, 'Cliente não encontrado.')
    res.json({ ok: true })
  }),
)
