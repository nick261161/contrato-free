import { Router } from 'express'
import {
  mapContract,
  query,
  upsertCliente,
  withTransaction,
} from '../db.js'
import { httpError, wrap } from '../http.js'

export const contractsRouter = Router()

const STATUS_VALIDOS = ['rascunho', 'pendente', 'assinado', 'concluido']

/** Normaliza e valida o payload de contrato vindo do front. */
function parseContrato(body) {
  const cliente = body?.cliente ?? {}
  const titulo = String(body?.titulo ?? '').trim()
  const nomeCliente = String(cliente.nome ?? '').trim()

  if (!titulo) throw httpError(400, 'Título é obrigatório.')
  if (!nomeCliente) throw httpError(400, 'Informe o nome do cliente.')

  return {
    titulo,
    cliente: {
      nome: nomeCliente,
      email: String(cliente.email ?? '').trim(),
      cpfCnpj: String(cliente.cpfCnpj ?? '').trim(),
      endereco: String(cliente.endereco ?? '').trim(),
    },
    valor: Number(body?.valor) || 0,
    dataInicio: String(body?.dataInicio ?? ''),
    prazoDias: Math.max(0, Math.round(Number(body?.prazoDias) || 0)),
    descricao: String(body?.descricao ?? ''),
    status: STATUS_VALIDOS.includes(body?.status) ? body.status : 'rascunho',
    assinaturaPrestador: body?.assinaturaPrestador ?? null,
    assinaturaContratante: body?.assinaturaContratante ?? null,
  }
}

/** GET /contracts — lista (mais recentes primeiro). */
contractsRouter.get(
  '/',
  wrap(async (req, res) => {
    const { rows } = await query(
      'SELECT * FROM contracts ORDER BY criado_em DESC, id DESC',
    )
    res.json(rows.map(mapContract))
  }),
)

/** GET /contracts/:id — busca 1 contrato (usado pela página pública de assinatura). */
contractsRouter.get(
  '/:id',
  wrap(async (req, res) => {
    const { rows } = await query('SELECT * FROM contracts WHERE id = $1', [
      req.params.id,
    ])
    if (!rows[0]) throw httpError(404, 'Contrato não encontrado.')
    res.json(mapContract(rows[0]))
  }),
)

/** POST /contracts — cria e sincroniza a agenda de clientes (transação). */
contractsRouter.post(
  '/',
  wrap(async (req, res) => {
    const dados = parseContrato(req.body)
    const id = `ctr-${Date.now()}`

    const row = await withTransaction(async (tx) => {
      const { rows } = await tx.query(
        `INSERT INTO contracts
           (id, titulo, cliente, valor, data_inicio, prazo_dias, descricao, status,
            assinatura_prestador, assinatura_contratante)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          id,
          dados.titulo,
          dados.cliente,
          dados.valor,
          dados.dataInicio,
          dados.prazoDias,
          dados.descricao,
          dados.status,
          dados.assinaturaPrestador,
          dados.assinaturaContratante,
        ],
      )
      await upsertCliente(dados.cliente, (text, params) => tx.query(text, params))
      return rows[0]
    })

    res.status(201).json(mapContract(row))
  }),
)

/** PUT /contracts/:id — edição completa (preserva as assinaturas enviadas). */
contractsRouter.put(
  '/:id',
  wrap(async (req, res) => {
    const dados = parseContrato(req.body)

    const row = await withTransaction(async (tx) => {
      const { rows } = await tx.query(
        `UPDATE contracts
            SET titulo = $1, cliente = $2, valor = $3, data_inicio = $4,
                prazo_dias = $5, descricao = $6, status = $7,
                assinatura_prestador = $8, assinatura_contratante = $9
          WHERE id = $10
          RETURNING *`,
        [
          dados.titulo,
          dados.cliente,
          dados.valor,
          dados.dataInicio,
          dados.prazoDias,
          dados.descricao,
          dados.status,
          dados.assinaturaPrestador,
          dados.assinaturaContratante,
          req.params.id,
        ],
      )
      if (!rows[0]) throw httpError(404, 'Contrato não encontrado.')
      await upsertCliente(dados.cliente, (text, params) => tx.query(text, params))
      return rows[0]
    })

    res.json(mapContract(row))
  }),
)

/** DELETE /contracts/:id — remove (sempre responde JSON). */
contractsRouter.delete(
  '/:id',
  wrap(async (req, res) => {
    const { rows } = await query(
      'DELETE FROM contracts WHERE id = $1 RETURNING id',
      [req.params.id],
    )
    if (!rows[0]) throw httpError(404, 'Contrato não encontrado.')
    res.json({ ok: true })
  }),
)

/**
 * POST /contracts/:id/sign — registra a assinatura de uma das partes
 * (prestador = freelancer, contratante = cliente). Grava quem assinou e a
 * data/hora automaticamente; o status só vira "assinado" quando as DUAS
 * assinaturas existem.
 */
contractsRouter.post(
  '/:id/sign',
  wrap(async (req, res) => {
    const { por, imagem, quem } = req.body ?? {}

    if (!['prestador', 'contratante'].includes(quem)) {
      throw httpError(400, 'Informe quem assina: prestador ou contratante.')
    }
    const nome = String(por ?? '').trim()
    if (!nome) throw httpError(400, 'Informe o nome de quem assina.')

    const atual = await query('SELECT * FROM contracts WHERE id = $1', [
      req.params.id,
    ])
    const row = atual.rows[0]
    if (!row) throw httpError(404, 'Contrato não encontrado.')

    const nova = { por: nome, em: new Date().toISOString() }
    if (imagem) nova.imagem = imagem

    const prestador = quem === 'prestador' ? nova : row.assinatura_prestador
    const contratante = quem === 'contratante' ? nova : row.assinatura_contratante
    const status =
      prestador && contratante
        ? 'assinado'
        : row.status === 'concluido'
          ? 'concluido'
          : 'pendente'

    const { rows } = await query(
      `UPDATE contracts
          SET assinatura_prestador = $1, assinatura_contratante = $2, status = $3
        WHERE id = $4
        RETURNING *`,
      [prestador, contratante, status, req.params.id],
    )

    res.json(mapContract(rows[0]))
  }),
)
