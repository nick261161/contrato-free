/**
 * Geração do PDF do contrato (download real do arquivo).
 *
 * Usa jsPDF para montar o documento em texto (A4) e anexa as assinaturas
 * desenhadas (dataURL) de cada parte — prestador e contratante — cada uma
 * sobre a sua linha, com carimbo de data/hora.
 */
import type { jsPDF } from 'jspdf'
import type { Contract, FreelancerProfile } from '../types'
import { getProfile } from './api'

const M = 18 // margem em mm
const W = 210
const RIGHT = W - M
const CW = RIGHT - M // largura útil

/** Perfil vazio de fallback para quando não há dados do prestador. */
const PERFIL_VAZIO: FreelancerProfile = {
  nome: '',
  email: '',
  telefone: '',
  profissao: '',
  pix: '',
  termosPadrao: '',
}

const INDIGO: [number, number, number] = [79, 70, 229]
const DARK: [number, number, number] = [28, 32, 51]
const SOFT: [number, number, number] = [92, 97, 120]
const BORDER: [number, number, number] = [200, 203, 218]
const GREEN: [number, number, number] = [5, 150, 105]

function brDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR')
}

function brDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR')
}

/** Lê as dimensões de um PNG em dataURL para escalar a assinatura. */
function pngSize(dataUrl: string): { w: number; h: number } {
  try {
    const bin = atob(dataUrl.split(',')[1] ?? '')
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    const view = new DataView(bytes.buffer)
    return { w: view.getUint32(16), h: view.getUint32(20) }
  } catch {
    return { w: 440, h: 170 }
  }
}

/** Monta o PDF do contrato (não baixa — retorna o documento). */
export async function buildContractPdf(
  contract: Contract,
  profile: FreelancerProfile,
): Promise<jsPDF> {
  // jsPDF carregado sob demanda para não pesar o bundle inicial
  const { jsPDF: JsPdf } = await import('jspdf')
  const doc = new JsPdf({ unit: 'mm', format: 'a4' })
  let y = M

  function ensure(height: number) {
    if (y + height > 297 - M) {
      doc.addPage()
      y = M
    }
  }

  function rule() {
    doc.setDrawColor(...BORDER)
    doc.setLineWidth(0.3)
    doc.line(M, y, RIGHT, y)
    y += 6
  }

  function sectionTitle(title: string) {
    ensure(16)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...DARK)
    doc.text(title, M, y)
    y += 6
  }

  function paragraph(content: string, size = 9.5) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(size)
    doc.setTextColor(...DARK)
    const lines: string[] = doc.splitTextToSize(content || '—', CW)
    for (const line of lines) {
      ensure(6)
      doc.text(line, M, y)
      y += 5
    }
    y += 2
  }

  function party(x: number, width: number, heading: string, name: string, details: string[]): number {
    let cy = y
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...INDIGO)
    doc.text(heading.toUpperCase(), x, cy)
    cy += 5

    doc.setFontSize(11)
    doc.setTextColor(...DARK)
    for (const line of doc.splitTextToSize(name || '—', width)) {
      doc.text(line, x, cy)
      cy += 5
    }

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...SOFT)
    for (const detail of details) {
      for (const line of doc.splitTextToSize(detail || '—', width)) {
        doc.text(line, x, cy)
        cy += 4.5
      }
    }
    return cy
  }

  // ---------------------------------------------------------------- cabeçalho
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(...INDIGO)
  doc.text('§ ContratoFree', M, y)
  doc.setFontSize(9)
  doc.setTextColor(...SOFT)
  doc.text(`#${contract.id}`, RIGHT, y, { align: 'right' })
  y += 4
  rule()

  const temPrestador = Boolean(contract.assinaturaPrestador)
  const temCliente = Boolean(contract.assinaturaContratante)
  const completo = temPrestador && temCliente
  const parcial = temPrestador || temCliente

  const statusLabel = completo
    ? 'ASSINADO (PRESTADOR + CONTRATANTE)'
    : parcial
      ? `ASSINATURA PARCIAL (${(temPrestador ? 1 : 0) + (temCliente ? 1 : 0)} DE 2)`
      : 'AGUARDANDO ASSINATURA'
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...(completo ? GREEN : parcial ? INDIGO : SOFT))
  doc.text(`STATUS: ${statusLabel}`, M, y)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...SOFT)
  doc.text(`Emitido em ${brDate(contract.criadoEm)}`, RIGHT, y, { align: 'right' })
  y += 10

  // ------------------------------------------------------------------- título
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.setTextColor(...DARK)
  const titleLines: string[] = doc.splitTextToSize(contract.titulo || 'Sem título', CW)
  for (const line of titleLines) {
    ensure(9)
    doc.text(line, W / 2, y, { align: 'center' })
    y += 8
  }
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(...SOFT)
  doc.text(
    `Contrato de prestação de serviços entre ${profile.nome || '—'} e ${contract.cliente.nome || '—'}.`,
    W / 2,
    y,
    { align: 'center' },
  )
  y += 10

  // -------------------------------------------------------------------- partes
  ensure(56)
  const colW = (CW - 8) / 2
  const endA = party(M, colW, 'Prestador', profile.nome, [
    profile.profissao,
    profile.email,
    profile.telefone,
  ])
  const endB = party(M + colW + 8, colW, 'Contratante', contract.cliente.nome, [
    contract.cliente.cpfCnpj,
    contract.cliente.email,
    contract.cliente.endereco,
  ])
  y = Math.max(endA, endB) + 6

  // --------------------------------------------------------------- condições
  ensure(30)
  const cellW = (CW - 16) / 3
  const cells: Array<[string, string]> = [
    ['Valor total', contract.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })],
    ['Início', contract.dataInicio ? brDate(`${contract.dataInicio}T00:00:00`) : '—'],
    ['Entrega prevista', contract.dataInicio
      ? brDate(
          new Date(
            new Date(`${contract.dataInicio}T00:00:00`).getTime() +
              contract.prazoDias * 86_400_000,
          ).toISOString(),
        )
      : '—'],
  ]
  let cx = M
  for (const [label, value] of cells) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...SOFT)
    doc.text(label.toUpperCase(), cx, y)
    doc.setFontSize(10.5)
    doc.setTextColor(...DARK)
    doc.text(value, cx, y + 6)
    cx += cellW + 8
  }
  y += 16

  sectionTitle('1. Objeto do contrato')
  paragraph(contract.descricao)

  sectionTitle('2. Condições padrão do prestador')
  paragraph(profile.termosPadrao)

  // -------------------------------------------------------------- assinaturas
  sectionTitle('3. Assinaturas')

  const signW = (CW - 10) / 2
  const areaH = 26 // altura reservada para o desenho/nome digitado (mm)
  ensure(areaH + 32)
  const lineY = y + areaH

  const cols = [
    {
      x: M,
      sig: contract.assinaturaPrestador,
      nome: profile.nome || 'Prestador',
      papel: 'Prestador',
    },
    {
      x: M + signW + 10,
      sig: contract.assinaturaContratante,
      nome: contract.cliente.nome || 'Contratante',
      papel: 'Contratante',
    },
  ]

  for (const col of cols) {
    // desenho ou nome digitado — encostado por cima da linha
    if (col.sig?.imagem) {
      const size = pngSize(col.sig.imagem)
      const scale = Math.min(46 / size.w, (areaH - 6) / size.h)
      const imgW = size.w * scale
      const imgH = size.h * scale
      doc.addImage(
        col.sig.imagem,
        'PNG',
        col.x + (signW - imgW) / 2,
        lineY - 3 - imgH,
        imgW,
        imgH,
      )
    } else if (col.sig) {
      doc.setFont('helvetica', 'oblique')
      doc.setFontSize(15)
      doc.setTextColor(...DARK)
      const nomeLines: string[] = doc.splitTextToSize(col.sig.por, signW - 6)
      let ny = lineY - 5
      for (const line of nomeLines) {
        doc.text(line, col.x + 3, ny)
        ny -= 6
      }
    } else {
      doc.setFont('helvetica', 'oblique')
      doc.setFontSize(8.5)
      doc.setTextColor(...SOFT)
      doc.text(
        `${col.papel} — aguardando assinatura`,
        col.x + signW / 2,
        lineY - 6,
        { align: 'center' },
      )
    }

    // a linha "do contrato" + nome da parte embaixo
    doc.setDrawColor(...SOFT)
    doc.setLineWidth(0.3)
    doc.line(col.x, lineY, col.x + signW, lineY)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.setTextColor(...DARK)
    doc.text(col.nome, col.x + signW / 2, lineY + 5, { align: 'center' })

    // carimbo (quem assinou + data/hora) ou aviso de pendência
    doc.setFontSize(7.5)
    const stamp = col.sig
      ? `Assinado por ${col.sig.por} em ${brDateTime(col.sig.em)}`
      : 'Aguardando assinatura'
    doc.setTextColor(...(col.sig ? GREEN : SOFT))
    let sy = lineY + 11
    for (const line of doc.splitTextToSize(stamp, signW)) {
      doc.text(line, col.x + signW / 2, sy, { align: 'center' })
      sy += 4
    }
    y = Math.max(y, sy + 6)
  }

  if (!temCliente) {
    doc.setFontSize(8)
    doc.setTextColor(...INDIGO)
    doc.text(
      `Link para assinatura do cliente: ${window.location.origin}/assinar/${contract.id}`,
      M,
      y,
    )
    y += 6
  }

  // ----------------------------------------------------------------- rodapé
  ensure(14)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...SOFT)
  doc.text(
    `Documento gerado automaticamente pela plataforma ContratoFree em ${brDate(new Date().toISOString())}.`,
    W / 2,
    y,
    { align: 'center' },
  )

  return doc
}

/** Gera e baixa o PDF do contrato (com assinatura, quando houver). */
export async function downloadContractPdf(contract: Contract): Promise<void> {
  // Contrato vindo da busca pública por id já traz o perfil do prestador
  // embutido (página de assinatura, sem login); nos fluxos logados, busca
  // o perfil da conta atual. Sem perfil disponível, o PDF usa campos vazios.
  const profile =
    contract.prestador ?? (await getProfile().catch(() => PERFIL_VAZIO))
  const doc = await buildContractPdf(contract, profile)

  const slug = (contract.titulo || 'contrato')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)

  const completo = Boolean(contract.assinaturaPrestador && contract.assinaturaContratante)
  doc.save(`contrato-${slug || 'sem-titulo'}${completo ? '-assinado' : ''}.pdf`)
}
