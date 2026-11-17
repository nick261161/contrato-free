/**
 * Conteúdo canônico + hash SHA-256 do contrato.
 *
 * O SERVIDOR calcula o hash oficial no momento da assinatura (ele também vê o
 * IP); este módulo existe para o MODO MOCK manter o mesmo formato de hash —
 * o JSON é montado na MESMA ordem de campos do `sha256Conteudo` em
 * server/routes/contracts.js, então as duas implementações coincidem.
 */
import type { Contract } from '../types'

/** JSON canônico do conteúdo do contrato (sem status e sem assinaturas). */
export function contratoCanonico(contrato: Contract): string {
  return JSON.stringify({
    id: contrato.id,
    titulo: contrato.titulo,
    cliente: {
      nome: contrato.cliente.nome,
      email: contrato.cliente.email,
      cpfCnpj: contrato.cliente.cpfCnpj,
      endereco: contrato.cliente.endereco,
    },
    valor: Number(contrato.valor),
    dataInicio: contrato.dataInicio,
    prazoDias: contrato.prazoDias,
    descricao: contrato.descricao,
    nicho: contrato.nicho ?? '',
    clausulas: {
      multa: Boolean(contrato.clausulas?.multa),
      nda: Boolean(contrato.clausulas?.nda),
      portfolio: Boolean(contrato.clausulas?.portfolio),
      rescisao: Boolean(contrato.clausulas?.rescisao),
    },
    criadoEm: contrato.criadoEm,
  })
}

/**
 * SHA-256 em hex do texto. Usa Web Crypto — disponível apenas em contexto
 * seguro (https/localhost); fora dele retorna `null` e a assinatura fica
 * sem hash (mesmo comportamento visual do modo real sem hash antigo).
 */
export async function sha256Hex(texto: string): Promise<string | null> {
  try {
    const bytes = new TextEncoder().encode(texto)
    const digest = await crypto.subtle.digest('SHA-256', bytes)
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('')
  } catch {
    return null
  }
}
