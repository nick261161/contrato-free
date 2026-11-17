/**
 * Camada de banco de dados — PostgreSQL no Neon (Lakebase).
 *
 * Conforme a skill neon-postgres:
 * - DATABASE_URL (pooler)  → tráfego normal da aplicação (a API);
 * - DATABASE_URL_UNPOOLED  → criação de schema e seed (conexão direta,
 *   pois operações de DDL não devem passar pelo PgBouncer).
 */
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
  // Idempotente: roda a cada cold start (Vercel) e no `npm run dev` local.
  // Cada conta tem seu próprio user_id — listas e escritas são filtradas por ele.
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
      assinatura_contratante JSONB,
      user_id TEXT
    );

    ALTER TABLE contracts ADD COLUMN IF NOT EXISTS user_id TEXT;
    CREATE INDEX IF NOT EXISTS contracts_usuario_idx ON contracts (user_id);

    -- Nicho + cláusulas opcionais do wizard (aditivo, idempotente)
    ALTER TABLE contracts ADD COLUMN IF NOT EXISTS nicho TEXT NOT NULL DEFAULT '';
    ALTER TABLE contracts ADD COLUMN IF NOT EXISTS clausulas JSONB NOT NULL DEFAULT '{}';

    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      email TEXT NOT NULL,
      cpf_cnpj TEXT NOT NULL DEFAULT '',
      endereco TEXT NOT NULL DEFAULT '',
      criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
      user_id TEXT
    );

    ALTER TABLE clients ADD COLUMN IF NOT EXISTS user_id TEXT;
    -- e-mail único POR CONTA (o índice global antigo foi removido na migração)
    DROP INDEX IF EXISTS clients_email_unico;
    CREATE UNIQUE INDEX IF NOT EXISTS clients_email_usuario_unico
      ON clients (user_id, lower(btrim(email)));

    CREATE TABLE IF NOT EXISTS profiles (
      user_id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      email TEXT NOT NULL DEFAULT '',
      telefone TEXT NOT NULL DEFAULT '',
      profissao TEXT NOT NULL DEFAULT '',
      pix TEXT NOT NULL DEFAULT '',
      termos_padrao TEXT NOT NULL DEFAULT ''
    );
  `)
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
    nicho: row.nicho ?? '',
    clausulas: row.clausulas ?? {},
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
 * Upsert de cliente POR CONTA (mesma regra do modo mock: se o e-mail já
 * existir para este usuário — comparação sem caixa/espaços — atualiza o
 * registro; contas diferentes podem ter o mesmo e-mail de cliente).
 * Aceita um executor próprio para rodar dentro de transação.
 */
export async function upsertCliente(cliente, executor = query, usuarioId) {
  const email = cliente.email.trim().toLowerCase()
  const existente = await executor(
    'SELECT * FROM clients WHERE user_id = $1 AND lower(btrim(email)) = $2',
    [usuarioId, email],
  )

  if (existente.rowCount > 0) {
    const { rows } = await executor(
      `UPDATE clients
          SET nome = $1, email = $2, cpf_cnpj = $3, endereco = $4
        WHERE id = $5 AND user_id = $6
        RETURNING *`,
      [
        cliente.nome,
        cliente.email,
        cliente.cpfCnpj,
        cliente.endereco,
        existente.rows[0].id,
        usuarioId,
      ],
    )
    return rows[0]
  }

  const { rows } = await executor(
    `INSERT INTO clients (id, nome, email, cpf_cnpj, endereco, user_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      `cli-${Date.now()}`,
      cliente.nome,
      cliente.email,
      cliente.cpfCnpj,
      cliente.endereco,
      usuarioId,
    ],
  )
  return rows[0]
}
