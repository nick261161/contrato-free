import type { Contract, FreelancerProfile } from '../types'
import { CLAUSULAS_OPCIONAIS, NICHOS } from './clausulas'
import { TEMAS_PDF } from './modelos'

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const calendar = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' })

export function documentTheme(profile: FreelancerProfile) {
  return TEMAS_PDF.find((tema) => tema.value === profile.temaPdf) ?? TEMAS_PDF[0]
}

export function contractSummary(contract: Contract) {
  const start = Date.parse(`${contract.dataInicio}T00:00:00Z`)
  const end = start + contract.prazoDias * 86_400_000
  const date = (value: number) => Math.abs(value) <= 8.64e15 ? calendar.format(value) : '—'
  return [
    { label: 'Valor total', value: currency.format(contract.valor) },
    { label: 'Início', value: date(start) },
    { label: 'Entrega prevista', value: date(end) },
  ]
}

export function contractSections(contract: Contract, profile: FreelancerProfile) {
  const nicho = NICHOS.find((item) => item.value === contract.nicho)
  const sections = [
    { titulo: 'Escopo do serviço', conteudo: contract.descricao },
    { titulo: 'Entregáveis', conteudo: contract.entregaveis },
    { titulo: 'Condições de pagamento', conteudo: contract.pagamento && profile.pix
      ? `${contract.pagamento}\n\nChave PIX: ${profile.pix}`
      : contract.pagamento },
    { titulo: 'Condições padrão do prestador', conteudo: profile.termosPadrao },
  ]
  if (nicho) sections.push({ titulo: `Cláusulas-base · ${nicho.label}`, conteudo: nicho.clausulas.join('\n\n') })
  for (const item of CLAUSULAS_OPCIONAIS) {
    if (contract.clausulas?.[item.chave]) sections.push({ titulo: item.titulo, conteudo: item.texto })
  }
  return sections.filter((section) => section.conteudo?.trim())
}
