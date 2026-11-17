/**
 * Consultas públicas de CNPJ e CEP pela BrasilAPI (brasilapi.com.br).
 *
 * API gratuita, sem chave e com CORS liberado (`Access-Control-Allow-Origin: *`),
 * ideal para preencher automaticamente nome e endereço do cliente enquanto o
 * freelancer digita no wizard e na agenda. Respostas 404 viram `null`; falhas
 * de rede lançam erro (o chamador decide o que mostrar).
 */

const TIMEOUT_MS = 8000

/** Remove tudo que não for dígito (aceita "33.000.167/0001-01" → "33000167000101"). */
export function apenasDigitos(valor: string): string {
  return valor.replace(/\D+/g, '')
}

/** Formata 8 dígitos como 00000-000 (mantém o valor se não tiver 8). */
export function formatarCEP(cep: string): string {
  return cep.length === 8 ? `${cep.slice(0, 5)}-${cep.slice(5)}` : cep
}

async function getJson<T>(url: string): Promise<T | null> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) return null // 404/400: não encontrado (diferente de falha de rede)
    return (await response.json()) as T
  } finally {
    window.clearTimeout(timer)
  }
}

/** Dados úteis de uma empresa para preencher o formulário. */
export interface EmpresaEncontrada {
  /** Nome fantasia (ou razão social quando não houver fantasia). */
  nome: string
  razaoSocial: string
  /** Endereço montado no formato do app: "Logradouro, nº — bairro — Cidade/UF". */
  endereco: string
  /** CEP só com dígitos (8). */
  cep: string
}

interface RespostaCnpj {
  razao_social?: string
  nome_fantasia?: string
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  municipio?: string
  uf?: string
  cep?: string | number
}

/** Monta o endereço no padrão já usado pelo app ("Rua X, 120 — Cidade/UF"). */
function montarEndereco(dados: RespostaCnpj): string {
  const partes = [
    [dados.logradouro, dados.numero].filter(Boolean).join(', '),
    dados.complemento?.trim() || '',
    dados.bairro || '',
    [dados.municipio, dados.uf].filter(Boolean).join('/'),
  ].filter(Boolean)
  return partes.join(' — ')
}

/**
 * Consulta um CNPJ (14 dígitos). Retorna `null` quando o documento não existe
 * na base; lança em caso de falha de rede/timeout.
 */
export async function buscarCNPJ(cnpj: string): Promise<EmpresaEncontrada | null> {
  const digitos = apenasDigitos(cnpj)
  if (digitos.length !== 14) return null

  const dados = await getJson<RespostaCnpj>(
    `https://brasilapi.com.br/api/cnpj/v1/${digitos}`,
  )
  if (!dados) return null

  const razaoSocial = dados.razao_social?.trim() ?? ''
  return {
    nome: dados.nome_fantasia?.trim() || razaoSocial,
    razaoSocial,
    endereco: montarEndereco(dados),
    cep: apenasDigitos(String(dados.cep ?? '')),
  }
}

/** Endereço encontrado para um CEP. */
export interface EnderecoEncontrado {
  endereco: string
  cep: string
}

interface RespostaCep {
  street?: string
  neighborhood?: string
  city?: string
  state?: string
}

/**
 * Consulta um CEP (8 dígitos). Retorna `null` quando não existe; lança em
 * caso de falha de rede/timeout.
 */
export async function buscarCEP(cep: string): Promise<EnderecoEncontrado | null> {
  const digitos = apenasDigitos(cep)
  if (digitos.length !== 8) return null

  const dados = await getJson<RespostaCep>(
    `https://brasilapi.com.br/api/cep/v1/${digitos}`,
  )
  if (!dados?.street) return null

  return {
    endereco: [dados.street, dados.neighborhood, [dados.city, dados.state].filter(Boolean).join('/')]
      .filter(Boolean)
      .join(' — '),
    cep: formatarCEP(digitos),
  }
}
