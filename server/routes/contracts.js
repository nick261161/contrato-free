import { createHash, randomBytes } from 'node:crypto'
import { Router } from 'express'
import { requerUsuario } from '../auth.js'
import {
  mapContract,
  profileSnapshot,
  query,
  upsertCliente,
  withTransaction,
} from '../db.js'
import { httpError, wrap } from '../http.js'

export const contractsRouter = Router()

const STATUS_VALIDOS = ['rascunho', 'pendente', 'assinado', 'concluido']
const CLAUSULAS_CHAVES = ['multa', 'nda', 'portfolio', 'rescisao']

/** Normaliza e valida o payload de contrato vindo do front. */
function parseContrato(body) {
  const cliente = body?.cliente ?? {}
  const titulo = String(body?.titulo ?? '').trim()
  const nomeCliente = String(cliente.nome ?? '').trim()

  if (!titulo) throw httpError(400, 'Título é obrigatório.')
  if (!nomeCliente) throw httpError(400, 'Informe o nome do cliente.')

  const clausulasRaw = body?.clausulas ?? {}

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
    pagamento: String(body?.pagamento ?? '').trim().slice(0, 1600),
    entregaveis: String(body?.entregaveis ?? '').trim().slice(0, 3000),
    status: STATUS_VALIDOS.includes(body?.status) ? body.status : 'rascunho',
    assinaturaPrestador: body?.assinaturaPrestador ?? null,
    assinaturaContratante: body?.assinaturaContratante ?? null,
    nicho: String(body?.nicho ?? '').trim(),
    clausulas: Object.fromEntries(
      CLAUSULAS_CHAVES.map((chave) => [chave, Boolean(clausulasRaw[chave])]),
    ),
  }
}

/**
 * SHA-256 (hex) do CONTEÚDO do contrato no momento da assinatura — sem
 * status e sem as assinaturas, para que as DUAS partes registrem o MESMO
 * hash do documento. A ordem dos campos é fixa (igual ao modo mock em
 * src/services/canonico.ts) porque JSONB do Postgres reordena chaves.
 */
function sha256Conteudo(row) {
  const payload = JSON.stringify({
    id: row.id,
    titulo: row.titulo,
    cliente: {
      nome: row.cliente?.nome ?? '',
      email: row.cliente?.email ?? '',
      cpfCnpj: row.cliente?.cpfCnpj ?? '',
      endereco: row.cliente?.endereco ?? '',
    },
    valor: Number(row.valor),
    dataInicio: row.data_inicio,
    prazoDias: row.prazo_dias,
    descricao: row.descricao,
    nicho: row.nicho ?? '',
    clausulas: {
      multa: Boolean(row.clausulas?.multa),
      nda: Boolean(row.clausulas?.nda),
      portfolio: Boolean(row.clausulas?.portfolio),
      rescisao: Boolean(row.clausulas?.rescisao),
    },
    criadoEm: new Date(row.criado_em).toISOString(),
    ...(row.pagamento && { pagamento: row.pagamento }),
    ...(row.entregaveis && { entregaveis: row.entregaveis }),
    ...(row.prestador_snapshot && {
      prestador: camposPrestador(row.prestador_snapshot),
    }),
  })
  return createHash('sha256').update(payload).digest('hex')
}

function camposPrestador(prestador) {
  return [
    prestador.nome, prestador.email, prestador.telefone, prestador.profissao,
    prestador.pix, prestador.termosPadrao, prestador.marca, prestador.documento,
    prestador.endereco, prestador.imagem, prestador.temaPdf,
  ]
}

/** IP do cliente: atrás do proxy da Vercel vale o x-forwarded-for original. */
function ipDoCliente(req) {
  const encaminhado = String(req.headers['x-forwarded-for'] ?? '')
    .split(',')[0]
    .trim()
  return encaminhado || req.ip || ''
}

/** GET /contracts — lista da CONTA logada (mais recentes primeiro). */
contractsRouter.get(
  '/',
  requerUsuario,
  wrap(async (req, res) => {
    const { rows } = await query(
      `SELECT id, titulo, cliente, valor, data_inicio, prazo_dias, descricao, status,
              criado_em, assinatura_prestador, assinatura_contratante, nicho,
              clausulas, pagamento, entregaveis
         FROM contracts WHERE user_id = $1 ORDER BY criado_em DESC, id DESC`,
      [req.usuarioId],
    )
    res.json(rows.map(mapContract))
  }),
)

/**
 * GET /contracts/:id — busca 1 contrato. É a base do link PÚBLICO de
 * assinatura (funciona sem login), então devolve junto o perfil do dono
 * (nome/profissao/contato/termos): o signatário precisa ver quem preparou
 * o documento e os termos que está assinando.
 */
contractsRouter.get(
  '/:id',
  wrap(async (req, res) => {
    const { rows } = await query(
      `SELECT c.*, to_jsonb(p) AS perfil_atual
         FROM contracts c
         LEFT JOIN profiles p ON p.user_id = c.user_id
        WHERE c.id = $1`,
      [req.params.id],
    )
    if (!rows[0]) throw httpError(404, 'Contrato não encontrado.')

    const row = rows[0]
    const contrato = mapContract(row)
    contrato.prestador ??= profileSnapshot(row.perfil_atual)
    res.json(contrato)
  }),
)

/** POST /contracts — cria para a CONTA logada e sincroniza a agenda (transação). */
contractsRouter.post(
  '/',
  requerUsuario,
  wrap(async (req, res) => {
    const dados = parseContrato(req.body)
    // id com aleatoriedade: o GET /:id é público (link de assinatura),
    // então o id precisa ser incapaz de ser adivinhado.
    const id = `ctr-${Date.now()}-${randomBytes(4).toString('hex')}`

    const row = await withTransaction(async (tx) => {
      const perfil = await tx.query('SELECT * FROM profiles WHERE user_id = $1', [req.usuarioId])
      const { rows } = await tx.query(
        `INSERT INTO contracts
           (id, titulo, cliente, valor, data_inicio, prazo_dias, descricao, status,
            assinatura_prestador, assinatura_contratante, user_id, nicho, clausulas,
            pagamento, entregaveis, prestador_snapshot)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
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
          req.usuarioId,
          dados.nicho,
          dados.clausulas,
          dados.pagamento,
          dados.entregaveis,
          profileSnapshot(perfil.rows[0]) ?? null,
        ],
      )
      await upsertCliente(
        dados.cliente,
        (text, params) => tx.query(text, params),
        req.usuarioId,
      )
      return rows[0]
    })

    res.status(201).json(mapContract(row))
  }),
)

/** PUT /contracts/:id — edição completa, apenas da CONTA dona do contrato. */
contractsRouter.put(
  '/:id',
  requerUsuario,
  wrap(async (req, res) => {
    const dados = parseContrato(req.body)

    const row = await withTransaction(async (tx) => {
      const { rows } = await tx.query(
        `UPDATE contracts
            SET titulo = $1, cliente = $2, valor = $3, data_inicio = $4,
                prazo_dias = $5, descricao = $6, status = $7,
                assinatura_prestador = $8, assinatura_contratante = $9,
                nicho = $10, clausulas = $11,
                pagamento = COALESCE($12, pagamento), entregaveis = COALESCE($13, entregaveis)
          WHERE id = $14 AND user_id = $15
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
          dados.nicho,
          dados.clausulas,
          req.body.pagamento === undefined ? null : dados.pagamento,
          req.body.entregaveis === undefined ? null : dados.entregaveis,
          req.params.id,
          req.usuarioId,
        ],
      )
      if (!rows[0]) throw httpError(404, 'Contrato não encontrado.')
      await upsertCliente(
        dados.cliente,
        (text, params) => tx.query(text, params),
        req.usuarioId,
      )
      return rows[0]
    })

    res.json(mapContract(row))
  }),
)

/** DELETE /contracts/:id — remove apenas da CONTA dona (sempre responde JSON). */
contractsRouter.delete(
  '/:id',
  requerUsuario,
  wrap(async (req, res) => {
    const { rows } = await query(
      'DELETE FROM contracts WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.usuarioId],
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
    // Integridade da assinatura: hash SHA-256 do conteúdo + IP de quem assinou
    // (a data/hora já fica em `em`). As DUAS partes registram o mesmo hash.
    nova.hash = sha256Conteudo(row)
    const ip = ipDoCliente(req)
    if (ip) nova.ip = ip

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
