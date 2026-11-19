import type { Contract, FreelancerProfile } from '../types'
import { contractSections, contractSummary, documentTheme } from './contractDocument'

const MARGIN = 18
const RIGHT = 192
const WIDTH = RIGHT - MARGIN
const INK = '#1c1830'
const MUTED = '#555267'
const LINE = '#e2dfea'
const GREEN = '#21654e'

const emptyProfile: FreelancerProfile = {
  nome: '', email: '', telefone: '', profissao: '', pix: '', termosPadrao: '',
}

export async function buildContractPdf(
  contract: Contract,
  profile: FreelancerProfile,
  signingUrl?: string,
) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
  const theme = documentTheme(profile)
  const supplier = profile.nome || 'Prestador'
  const brand = profile.marca || supplier
  const client = contract.cliente.nome || 'Contratante'
  const signatures = Number(Boolean(contract.assinaturaPrestador)) + Number(Boolean(contract.assinaturaContratante))
  const title = contract.titulo || 'Contrato de prestação de serviços'
  let y = 21

  doc.setProperties({ title, subject: 'Contrato de prestação de serviços', author: brand, creator: 'ContratoFree' })

  function font(size: number, weight = 'normal', color = INK, family = 'helvetica') {
    doc.setFont(family, weight)
    doc.setFontSize(size)
    doc.setTextColor(color)
  }

  function ensure(height: number) {
    if (y + height <= 275) return
    doc.addPage()
    doc.setFillColor(theme.color)
    doc.rect(0, 0, 210, 3, 'F')
    font(8, 'bold', theme.color)
    doc.text('CONTRATO DE PRESTAÇÃO DE SERVIÇOS', MARGIN, 16)
    y = 26
  }

  function lines(text: string, width = WIDTH): string[] {
    return doc.splitTextToSize(text, width)
  }

  function paragraph(text: string) {
    font(10.5)
    for (const line of lines(text)) {
      ensure(5.4)
      font(10.5)
      doc.text(line, MARGIN, y)
      y += 5.4
    }
    y += 5
  }

  function section(heading: string, number: number, height = 20) {
    ensure(height)
    doc.setDrawColor(LINE)
    doc.line(MARGIN, y - 5, RIGHT, y - 5)
    font(9, 'bold', theme.color)
    doc.text(String(number).padStart(2, '0'), MARGIN, y + 1)
    font(12, 'bold')
    doc.text(heading, MARGIN + 11, y + 1)
    y += 10
  }

  function image(data: string, x: number, top: number, width: number, height: number) {
    try {
      const properties = doc.getImageProperties(data)
      const scale = Math.min(width / properties.width, height / properties.height)
      const w = properties.width * scale
      const h = properties.height * scale
      doc.addImage(data, properties.fileType, x + (width - w) / 2, top + (height - h) / 2, w, h)
    } catch {
      // Uma imagem opcional corrompida não impede a exportação do texto.
    }
  }

  doc.setFillColor(theme.color)
  doc.rect(0, 0, 210, 4, 'F')
  doc.setFillColor(theme.tint)
  doc.roundedRect(MARGIN, 14, WIDTH, 36, 3, 3, 'F')

  const brandX = profile.imagem ? MARGIN + 34 : MARGIN + 8
  if (profile.imagem) {
    doc.setFillColor('#ffffff')
    doc.roundedRect(MARGIN + 6, 21, 22, 22, 2, 2, 'F')
    image(profile.imagem, MARGIN + 8, 23, 18, 18)
  }
  font(9, 'bold', theme.color)
  doc.text('PRESTAÇÃO DE SERVIÇOS', brandX, 26)
  font(13, 'bold')
  doc.text(lines(brand, RIGHT - brandX - 8).slice(0, 2), brandX, 34, { lineHeightFactor: 1.05 })

  font(8.5, 'bold', signatures === 2 ? GREEN : theme.color)
  doc.text(['AGUARDANDO ASSINATURAS', 'ASSINATURA PARCIAL · 1 DE 2', 'ASSINADO · 2 DE 2'][signatures], MARGIN, 60)
  font(8.5, 'normal', MUTED)
  doc.text(new Date(contract.criadoEm).toLocaleDateString('pt-BR'), RIGHT, 60, { align: 'right' })

  y = 75
  font(28, 'normal', INK, 'times')
  for (const line of lines(title)) {
    ensure(11)
    font(28, 'normal', INK, 'times')
    doc.text(line, MARGIN, y)
    y += 11
  }
  y += 3

  const cols = [
    { role: 'Prestador', name: supplier, details: [profile.profissao, profile.documento, profile.email, profile.telefone, profile.endereco], sign: contract.assinaturaPrestador },
    { role: 'Contratante', name: client, details: [contract.cliente.cpfCnpj, contract.cliente.email, contract.cliente.endereco], sign: contract.assinaturaContratante },
  ]
  const cardWidth = (WIDTH - 6) / 2
  const parties = cols.map((party) => {
    font(11, 'bold')
    const nameLines = lines(party.name, cardWidth - 12)
    font(9.5, 'normal', MUTED)
    const details = party.details.flatMap((item) => item ? lines(item, cardWidth - 12) : [])
    return { ...party, nameLines, details }
  })
  const partyHeight = Math.max(...parties.map((party) => 19 + party.nameLines.length * 5 + party.details.length * 4.5))

  if (partyHeight > 105) {
    for (const party of parties) {
      ensure(17)
      font(9, 'bold', theme.color)
      doc.text(party.role.toUpperCase(), MARGIN, y)
      y += 6
      paragraph([party.name, ...party.details].join('\n'))
    }
  } else {
    ensure(partyHeight)
    parties.forEach((party, index) => {
      const x = MARGIN + index * (cardWidth + 6)
      doc.setDrawColor(LINE)
      doc.roundedRect(x, y, cardWidth, partyHeight, 2, 2, 'S')
      font(8.5, 'bold', theme.color)
      doc.text(party.role.toUpperCase(), x + 6, y + 7)
      font(11, 'bold')
      party.nameLines.forEach((line, i) => doc.text(line, x + 6, y + 14 + i * 5))
      font(9.5, 'normal', MUTED)
      party.details.forEach((line, i) => doc.text(line, x + 6, y + 15 + party.nameLines.length * 5 + i * 4.5))
    })
    y += partyHeight + 8
  }

  const summary = contractSummary(contract)
  const summaryWidth = WIDTH / summary.length
  font(11, 'bold')
  const values = summary.map(({ value }) => lines(value, summaryWidth - 14))
  const summaryHeight = 16 + Math.max(...values.map((value) => value.length)) * 5
  ensure(summaryHeight)
  doc.setFillColor(theme.tint)
  doc.roundedRect(MARGIN, y, WIDTH, summaryHeight, 2, 2, 'F')
  summary.forEach(({ label }, index) => {
    const x = MARGIN + 7 + index * summaryWidth
    font(8.5, 'bold', theme.color)
    doc.text(label.toUpperCase(), x, y + 8)
    font(11, 'bold')
    values[index].forEach((line, i) => doc.text(line, x, y + 15 + i * 5))
  })
  y += summaryHeight + 12

  const sections = contractSections(contract, profile)
  sections.forEach(({ titulo, conteudo }, index) => {
    section(titulo, index + 1)
    paragraph(conteudo ?? '')
  })
  section('Assinaturas', sections.length + 1, 61)

  const signatureY = y
  const signArea = 22
  const signLine = signatureY + signArea
  const signaturesText = cols.map(({ role, name, sign }) => {
    font(10, 'bold')
    const nameLines = lines(name, cardWidth - 8)
    font(8, 'normal', MUTED)
    const stamp = sign ? 'Assinado por ' + sign.por + ' em ' + new Date(sign.em).toLocaleString('pt-BR') : 'Aguardando assinatura'
    const details = [stamp, sign?.hash ? 'SHA-256: ' + sign.hash : '', sign?.ip ? 'IP: ' + sign.ip : ''].filter(Boolean)
    return { role, sign, nameLines, details: details.flatMap((detail) => lines(detail, cardWidth - 8)) }
  })

  signaturesText.forEach(({ role, sign }, index) => {
    const x = MARGIN + index * (cardWidth + 6)
    if (sign?.imagem) {
      image(sign.imagem, x + 10, signatureY, cardWidth - 20, signArea - 2)
    } else if (sign) {
      font(14, 'italic', INK, 'times')
      const typed = lines(sign.por, cardWidth - 10).slice(0, 2)
      doc.text(typed, x + cardWidth / 2, signLine - 3 - (typed.length - 1) * 5, { align: 'center' })
    }
    doc.setDrawColor(LINE)
    doc.line(x, signLine, x + cardWidth, signLine)
    font(8.5, 'bold', theme.color)
    doc.text(role.toUpperCase(), x + 4, signLine + 6)
  })

  y = signLine + 12
  const signatureRows = signaturesText.map(({ nameLines, details, sign }) => [
    ...nameLines.map((text) => ({ text, size: 10, weight: 'bold', color: INK })),
    ...details.map((text) => ({ text, size: 8, weight: 'normal', color: sign ? GREEN : MUTED })),
  ])
  const rowCount = Math.max(...signatureRows.map((rows) => rows.length))
  for (let index = 0; index < rowCount; index++) {
    ensure(5)
    signatureRows.forEach((rows, col) => {
      const row = rows[index]
      if (!row) return
      font(row.size, row.weight, row.color)
      doc.text(row.text, MARGIN + 4 + col * (cardWidth + 6), y)
    })
    y += 4.6
  }

  if (!contract.assinaturaContratante && signingUrl) {
    y += 6
    ensure(9)
    font(9, 'bold', theme.color)
    doc.textWithLink('Abrir link de assinatura do cliente', MARGIN, y, { url: signingUrl })
  }

  const pages = doc.getNumberOfPages()
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page)
    doc.setDrawColor(LINE)
    doc.line(MARGIN, 281, RIGHT, 281)
    font(8, 'normal', MUTED)
    doc.text(contract.id ? 'ContratoFree  ·  ' + contract.id : 'ContratoFree  ·  Prévia', MARGIN, 287)
    doc.text(page + ' / ' + pages, RIGHT, 287, { align: 'right' })
  }
  return doc
}

export async function downloadContractPdf(contract: Contract): Promise<void> {
  const profile = contract.prestador ?? await import('./api').then(({ getProfile }) => getProfile()).catch(() => emptyProfile)
  const signingUrl = contract.id
    ? new URL('/assinar/' + encodeURIComponent(contract.id), window.location.origin).href
    : undefined
  const doc = await buildContractPdf(contract, profile, signingUrl)
  const slug = contract.titulo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 40)
    .replace(/^-+|-+$/g, '')
  const signed = Boolean(contract.assinaturaPrestador && contract.assinaturaContratante)
  doc.save('contrato-' + (slug || 'sem-titulo') + (signed ? '-assinado' : '') + '.pdf')
}
