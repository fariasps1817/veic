import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import type { AtpvRequest, ShopSettings } from '../types'
import { formatCurrency } from './validation'

const A4_WIDTH = 595.28
const A4_HEIGHT = 841.89
const GREEN = rgb(0.078, 0.325, 0.176)
const LIGHT_GREEN = rgb(0.941, 0.976, 0.953)
const LIGHT_GRAY = rgb(0.945, 0.953, 0.949)
const DARK = rgb(0.09, 0.12, 0.1)
const MUTED = rgb(0.32, 0.38, 0.34)
const WHITE = rgb(1, 1, 1)

interface FieldOptions {
  x: number
  y: number
  width: number
  height: number
  label: string
  value: string
}

function dataUrlBytes(dataUrl: string): Uint8Array | null {
  const match = dataUrl.match(/^data:(image\/(?:png|jpeg));base64,(.+)$/)
  if (!match) return null
  const binary = window.atob(match[2])
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

function drawFittedText(
  page: PDFPage,
  text: string,
  options: { x: number; y: number; maxWidth: number; font: PDFFont; size?: number; color?: ReturnType<typeof rgb> },
): void {
  let size = options.size ?? 12
  while (size > 7 && options.font.widthOfTextAtSize(text, size) > options.maxWidth) size -= 0.5
  page.drawText(text || '—', {
    x: options.x,
    y: options.y,
    size,
    font: options.font,
    color: options.color ?? DARK,
    maxWidth: options.maxWidth,
  })
}

function drawField(page: PDFPage, regular: PDFFont, bold: PDFFont, field: FieldOptions): void {
  page.drawRectangle({
    x: field.x,
    y: field.y,
    width: field.width,
    height: field.height,
    borderColor: rgb(0.32, 0.36, 0.33),
    borderWidth: 0.7,
    color: WHITE,
  })
  page.drawRectangle({
    x: field.x + 0.7,
    y: field.y + field.height - 18,
    width: field.width - 1.4,
    height: 17.3,
    color: LIGHT_GRAY,
  })
  page.drawText(field.label.toLocaleUpperCase('pt-BR'), {
    x: field.x + 7,
    y: field.y + field.height - 13,
    size: 8.5,
    font: bold,
    color: DARK,
  })
  drawFittedText(page, field.value, {
    x: field.x + 8,
    y: field.y + 13,
    maxWidth: field.width - 16,
    font: regular,
    size: 12.5,
  })
}

function fortalezaDateTime(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Fortaleza',
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date(value))
}

export async function generateAtpvPdf(request: AtpvRequest, shop: ShopSettings): Promise<Blob> {
  if (!request.buyer) throw new Error('A solicitação ainda não possui dados do comprador.')

  const pdf = await PDFDocument.create()
  const page = pdf.addPage([A4_WIDTH, A4_HEIGHT])
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique)

  page.drawRectangle({ x: 0, y: 0, width: A4_WIDTH, height: A4_HEIGHT, color: rgb(1, 1, 1) })
  page.drawRectangle({ x: 0, y: A4_HEIGHT - 110, width: A4_WIDTH, height: 110, color: LIGHT_GREEN })
  page.drawRectangle({ x: 0, y: A4_HEIGHT - 7, width: A4_WIDTH, height: 7, color: GREEN })

  let brandX = 40
  if (shop.logoDataUrl) {
    const bytes = dataUrlBytes(shop.logoDataUrl)
    if (bytes) {
      try {
        const image = shop.logoDataUrl.startsWith('data:image/png')
          ? await pdf.embedPng(bytes)
          : await pdf.embedJpg(bytes)
        const scale = Math.min(58 / image.width, 58 / image.height)
        page.drawImage(image, {
          x: 40,
          y: A4_HEIGHT - 87,
          width: image.width * scale,
          height: image.height * scale,
        })
        brandX = 112
      } catch {
        brandX = 40
      }
    }
  }

  drawFittedText(page, shop.nomeFantasia || 'Loja de Veículos', {
    x: brandX,
    y: A4_HEIGHT - 48,
    maxWidth: A4_WIDTH - brandX - 40,
    font: bold,
    size: 17,
    color: GREEN,
  })
  const contact = [shop.telefone, shop.email].filter(Boolean).join('  •  ')
  drawFittedText(page, contact, {
    x: brandX,
    y: A4_HEIGHT - 68,
    maxWidth: A4_WIDTH - brandX - 40,
    font: regular,
    size: 9.5,
    color: MUTED,
  })

  page.drawText('FORMULÁRIO AUXILIAR PARA ATPV', {
    x: 40,
    y: 700,
    size: 19,
    font: bold,
    color: DARK,
  })
  page.drawText('Dados informados pelo comprador para conferência da loja', {
    x: 40,
    y: 682,
    size: 9.5,
    font: italic,
    color: MUTED,
  })

  const left = 40
  const contentWidth = A4_WIDTH - 80
  const oneThird = contentWidth * 0.34
  const half = contentWidth / 2

  drawField(page, regular, bold, {
    x: left,
    y: 615,
    width: oneThird,
    height: 52,
    label: 'Valor da venda',
    value: formatCurrency(request.valorVendaCentavos),
  })
  drawField(page, regular, bold, {
    x: left + oneThird,
    y: 615,
    width: contentWidth - oneThird,
    height: 52,
    label: 'E-mail do vendedor',
    value: request.emailVendedor,
  })

  page.drawRectangle({ x: left, y: 582, width: contentWidth, height: 26, color: GREEN })
  page.drawText('DADOS DO COMPRADOR', {
    x: left + 155,
    y: 589,
    size: 12.5,
    font: bold,
    color: WHITE,
  })

  drawField(page, regular, bold, {
    x: left,
    y: 525,
    width: oneThird,
    height: 52,
    label: 'CPF ou CNPJ',
    value: request.buyer.cpfCnpj,
  })
  drawField(page, regular, bold, {
    x: left + oneThird,
    y: 525,
    width: contentWidth - oneThird,
    height: 52,
    label: 'E-mail do comprador',
    value: request.buyer.emailComprador,
  })
  drawField(page, regular, bold, {
    x: left,
    y: 468,
    width: contentWidth,
    height: 52,
    label: 'Nome completo',
    value: request.buyer.nomeCompleto,
  })
  drawField(page, regular, bold, {
    x: left,
    y: 411,
    width: oneThird,
    height: 52,
    label: 'CEP',
    value: request.buyer.cep,
  })
  drawField(page, regular, bold, {
    x: left + oneThird,
    y: 411,
    width: contentWidth - oneThird,
    height: 52,
    label: 'Logradouro (rua, nº)',
    value: `${request.buyer.logradouro}, ${request.buyer.numero}`,
  })

  const cityWidth = contentWidth * 0.27
  const ufWidth = contentWidth * 0.13
  drawField(page, regular, bold, {
    x: left,
    y: 354,
    width: contentWidth - cityWidth - ufWidth,
    height: 52,
    label: 'Bairro',
    value: request.buyer.bairro,
  })
  drawField(page, regular, bold, {
    x: left + contentWidth - cityWidth - ufWidth,
    y: 354,
    width: cityWidth,
    height: 52,
    label: 'Cidade',
    value: request.buyer.cidade,
  })
  drawField(page, regular, bold, {
    x: left + contentWidth - ufWidth,
    y: 354,
    width: ufWidth,
    height: 52,
    label: 'UF',
    value: request.buyer.uf,
  })
  drawField(page, regular, bold, {
    x: left,
    y: 297,
    width: half,
    height: 52,
    label: 'Complemento',
    value: request.buyer.complemento || '—',
  })
  drawField(page, regular, bold, {
    x: left + half,
    y: 297,
    width: half,
    height: 52,
    label: 'WhatsApp (com DDD)',
    value: request.buyer.whatsapp,
  })

  page.drawRectangle({ x: left, y: 228, width: contentWidth, height: 52, color: LIGHT_GREEN })
  page.drawText('ATENÇÃO', { x: left + 10, y: 260, size: 9, font: bold, color: GREEN })
  page.drawText('Este é um formulário auxiliar e não representa emissão oficial da ATPV-e.', {
    x: left + 10,
    y: 244,
    size: 9.5,
    font: regular,
    color: DARK,
  })

  const submittedAt = request.submittedAt ?? new Date().toISOString()
  page.drawText(`Código: ${request.codigo}`, { x: left, y: 190, size: 9, font: bold, color: DARK })
  page.drawText(`Confirmado em ${fortalezaDateTime(submittedAt)} (horário de Fortaleza)`, {
    x: left,
    y: 174,
    size: 8.5,
    font: regular,
    color: MUTED,
  })
  page.drawText('Documento gerado eletronicamente para conferência administrativa.', {
    x: left,
    y: 72,
    size: 8,
    font: italic,
    color: MUTED,
  })

  pdf.setTitle(`Formulário auxiliar ATPV - ${request.codigo}`)
  pdf.setSubject('Formulário auxiliar para preenchimento de ATPV')
  pdf.setCreator('ATPV Fácil')
  pdf.setProducer('ATPV Fácil')
  pdf.setCreationDate(new Date())

  const bytes = await pdf.save()
  const output = new Uint8Array(bytes.length)
  output.set(bytes)
  return new Blob([output.buffer], { type: 'application/pdf' })
}

export function pdfFileName(request: AtpvRequest): string {
  const buyerName = request.buyer?.nomeCompleto ?? 'comprador'
  const slug = buyerName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  return `atpv-auxiliar-${slug || request.codigo.toLocaleLowerCase('pt-BR')}.pdf`
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
}

export async function sharePdf(blob: Blob, fileName: string): Promise<boolean> {
  const file = new File([blob], fileName, { type: 'application/pdf' })
  if (!navigator.share || !navigator.canShare?.({ files: [file] })) return false
  await navigator.share({
    title: 'Formulário auxiliar ATPV',
    text: 'Segue o formulário auxiliar para ATPV.',
    files: [file],
  })
  return true
}

export function printPdf(blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const printWindow = window.open(url, '_blank')
  if (!printWindow) {
    URL.revokeObjectURL(url)
    throw new Error('Permita a abertura de janelas para imprimir o PDF.')
  }
  printWindow.opener = null
  printWindow.addEventListener('load', () => printWindow.print(), { once: true })
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
