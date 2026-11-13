/**
 * Camada de banco de dados — PostgreSQL no Neon (Lakebase).
 *
 * Conforme a skill neon-postgres:
 * - DATABASE_URL (pooler)  → tráfego normal da aplicação (a API);
 * - DATABASE_URL_UNPOOLED  → criação de schema e seed (conexão direta,
 *   pois operações de DDL não devem passar pelo PgBouncer).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import pg from 'pg'

const here = path.dirname(fileURLToPath(import.meta.url))

// Ordem de precedência: server/.env > .env.local (gerado pelo neon deploy) > .env
dotenv.config({ path: path.join(here, '.env') })
dotenv.config({ path: path.join(here, '..', '.env.local') })
dotenv.config({ path: path.join(here, '..', '.env') })

const URL_APP = process.env.DATABASE_URL?.trim()
const URL_DIRETA = process.env.DATABASE_URL_UNPOOLED?.trim() || URL_APP

if (!URL_APP) {
  console.error('❌ DATABASE_URL não encontrado.')
  console.error('   Rode `neon env pull` na raiz do projeto para gerar o .env.local.')
  process.exit(1)
}

/** Pool para o tráfego normal da API (conexão com pooler do Neon). */
export const pool = new pg.Pool({ connectionString: URL_APP, max: 10 })

/** Conexão direta para schema/seed (sem PgBouncer). */
export const poolDireto = new pg.Pool({ connectionString: URL_DIRETA, max: 2 })

/** Helper de consulta no pool da aplicação. */
export async function query(text, params) {
  return pool.query(text, params)
}

/** Executa um callback dentro de transação (commit/rollback automático). */
export async function withTransaction(fn) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

export async function ensureSchema() {
  await poolDireto.query(`
    CREATE TABLE IF NOT EXISTS contracts (
      id TEXT PRIMARY KEY,
      titulo TEXT NOT NULL,
      cliente JSONB NOT NULL,
      valor DOUBLE PRECISION NOT NULL DEFAULT 0,
      data_inicio TEXT NOT NULL DEFAULT '',
      prazo_dias INTEGER NOT NULL DEFAULT 0,
      descricao TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'rascunho'
        CHECK (status IN ('rascunho', 'pendente', 'assinado', 'concluido')),
      criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
      assinatura_prestador JSONB,
      assinatura_contratante JSONB
    );

    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      email TEXT NOT NULL,
      cpf_cnpj TEXT NOT NULL DEFAULT '',
      endereco TEXT NOT NULL DEFAULT '',
      criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS clients_email_unico
      ON clients (lower(btrim(email)));

    CREATE TABLE IF NOT EXISTS profiles (
      id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      nome TEXT NOT NULL,
      email TEXT NOT NULL DEFAULT '',
      telefone TEXT NOT NULL DEFAULT '',
      profissao TEXT NOT NULL DEFAULT '',
      pix TEXT NOT NULL DEFAULT '',
      termos_padrao TEXT NOT NULL DEFAULT ''
    );
  `)
}

/** Insere os dados de exemplo na primeira execução (banco vazio). */
export async function seedIfEmpty() {
  const seedPath = path.join(here, 'seed.json')
  const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'))

  const { rows } = await poolDireto.query('SELECT count(*)::int AS total FROM contracts')
  if (rows[0].total === 0) {
    for (const c of seed.contracts) {
      await poolDireto.query(
        `INSERT INTO contracts
           (id, titulo, cliente, valor, data_inicio, prazo_dias, descricao, status,
            criado_em, assinatura_prestador, assinatura_contratante)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO NOTHING`,
        [
          c.id,
          c.titulo,
          c.cliente,
          c.valor,
          c.dataInicio,
          c.prazoDias,
          c.descricao,
          c.status,
          c.criadoEm,
          c.assinaturaPrestador ?? null,
          c.assinaturaContratante ?? null,
        ],
      )
    }
    console.log(`🌱 Seed: ${seed.contracts.length} contratos de exemplo inseridos.`)
  }

  const clientes = await poolDireto.query('SELECT count(*)::int AS total FROM clients')
  if (clientes.rows[0].total === 0) {
    for (const cli of seed.clients) {
      await poolDireto.query(
        `INSERT INTO clients (id, nome, email, cpf_cnpj, endereco, criado_em)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO NOTHING`,
        [cli.id, cli.nome, cli.email, cli.cpfCnpj, cli.endereco, cli.criadoEm],
      )
    }
    console.log(`🌱 Seed: ${seed.clients.length} clientes de exemplo inseridos.`)
  }

  await poolDireto.query(
    `INSERT INTO profiles (id, nome, email, telefone, profissao, pix, termos_padrao)
     VALUES (1, $1, $2, $3, $4, $5, $6)
     ON CONFLICT (id) DO NOTHING`,
    [
      seed.profile.nome,
      seed.profile.email,
      seed.profile.telefone,
      seed.profile.profissao,
      seed.profile.pix,
      seed.profile.termosPadrao,
    ],
  )
}

// ---------------------------------------------------------------------------
// Mapeamentos row (Postgres, snake_case) → JSON da API (camelCase)
// ---------------------------------------------------------------------------

export function mapContract(row) {
  return {
    id: row.id,
    titulo: row.titulo,
    cliente: row.cliente,
    valor: Number(row.valor),
    dataInicio: row.data_inicio,
    prazoDias: row.prazo_dias,
    descricao: row.descricao,
    status: row.status,
    criadoEm: new Date(row.criado_em).toISOString(),
    assinaturaPrestador: row.assinatura_prestador ?? undefined,
    assinaturaContratante: row.assinatura_contratante ?? undefined,
  }
}

export function mapClient(row) {
  return {
    id: row.id,
    nome: row.nome,
    email: row.email,
    cpfCnpj: row.cpf_cnpj,
    endereco: row.endereco,
    criadoEm: new Date(row.criado_em).toISOString(),
  }
}

export function mapProfile(row) {
  return {
    nome: row.nome,
    email: row.email,
    telefone: row.telefone,
    profissao: row.profissao,
    pix: row.pix,
    termosPadrao: row.termos_padrao,
  }
}

// ---------------------------------------------------------------------------
// Regras de domínio compartilhadas entre rotas
// ---------------------------------------------------------------------------

/**
 * Upsert de cliente por e-mail (mesma regra do modo mock: se o e-mail já
 * existir — comparação sem caixa/espaços — atualiza o registro).
 * Aceita um executor próprio para rodar dentro de transação.
 */
export async function upsertCliente(cliente, executor = query) {
  const email = cliente.email.trim().toLowerCase()
  const existente = await executor(
    'SELECT * FROM clients WHERE lower(btrim(email)) = $1',
    [email],
  )

  if (existente.rowCount > 0) {
    const { rows } = await executor(
      `UPDATE clients
          SET nome = $1, email = $2, cpf_cnpj = $3, endereco = $4
        WHERE id = $5
        RETURNING *`,
      [cliente.nome, cliente.email, cliente.cpfCnpj, cliente.endereco, existente.rows[0].id],
    )
    return rows[0]
  }

  const { rows } = await executor(
    `INSERT INTO clients (id, nome, email, cpf_cnpj, endereco)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [`cli-${Date.now()}`, cliente.nome, cliente.email, cliente.cpfCnpj, cliente.endereco],
  )
  return rows[0]
}
