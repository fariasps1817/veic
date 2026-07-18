import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright-core'

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const baseUrl = process.env.APP_URL ?? 'http://127.0.0.1:5173'
const screenshotDir = 'docs/screenshots'

const browser = await chromium.launch({ executablePath: edgePath, headless: true })
const context = await browser.newContext({
  locale: 'pt-BR',
  timezoneId: 'America/Fortaleza',
  viewport: { width: 1440, height: 1000 },
  acceptDownloads: true,
})
const page = await context.newPage()
const pageErrors = []
page.on('pageerror', (error) => pageErrors.push(error.message))

await page.route('https://servicodados.ibge.gov.br/**', async (route) => {
  const url = route.request().url()
  if (url.includes('/municipios')) {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify([{ id: 2304400, nome: 'Fortaleza' }]),
    })
    return
  }
  await route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify([{ id: 23, sigla: 'CE', nome: 'Ceará' }]),
  })
})

await page.route('https://viacep.com.br/**', (route) => route.fulfill({
  contentType: 'application/json',
  body: JSON.stringify({
    cep: '60120-100',
    logradouro: 'Rua Frei Vidal',
    complemento: '',
    bairro: 'Tauape',
    localidade: 'Fortaleza',
    uf: 'CE',
  }),
}))

await mkdir(screenshotDir, { recursive: true })
await page.goto(baseUrl)
await page.evaluate(() => localStorage.clear())
await page.reload()

await page.getByRole('heading', { name: 'Solicitações de ATPV' }).waitFor()
await page.getByText('Sua Loja de Veículos', { exact: true }).waitFor()
await page.getByRole('link', { name: 'A2 & FJ Tecnologia' }).waitFor()

await page.goto(`${baseUrl}/configuracoes`)
await page.getByRole('heading', { name: 'Usuários do sistema' }).waitFor()
await page.getByRole('heading', { name: 'Alterar minha senha' }).waitFor()
await page.screenshot({ path: `${screenshotDir}/configuracoes-desktop.png`, fullPage: true })

await page.goto(`${baseUrl}/nova`)
await page.getByLabel('Valor da venda').fill('3000000')
await page.getByLabel('E-mail do vendedor').fill('vendedor@lojacar.com')
await page.getByRole('button', { name: 'Criar link de 1 hora' }).click()
await page.waitForURL(/\/solicitacoes\//)

const publicLink = await page.getByLabel('Link temporário do formulário').inputValue()
if (!publicLink.includes('/preencher/')) throw new Error('Link público não foi gerado.')

await page.setViewportSize({ width: 390, height: 844 })
await page.goto(publicLink)
const documentInput = page.getByLabel('CPF ou CNPJ')
if (await documentInput.getAttribute('inputmode') !== 'numeric') throw new Error('CPF não abriu o modo numérico.')
await page.getByRole('button', { name: 'CNPJ', exact: true }).click()
if (await documentInput.getAttribute('inputmode') !== 'text') throw new Error('CNPJ não aceitou o modo alfanumérico.')
await documentInput.fill('12abc34501de35')
if (await documentInput.inputValue() !== '12.ABC.345/01DE-35') throw new Error('Máscara alfanumérica do CNPJ não foi aplicada.')
await page.getByRole('button', { name: 'CPF', exact: true }).click()
await documentInput.fill('529abc98224725')
if (await documentInput.inputValue() !== '529.982.247-25') throw new Error('CPF aceitou caracteres não numéricos.')
await page.getByLabel('Nome completo').fill('JOSE MARIA DA SILVA')
await page.getByLabel('E-mail').fill('comprador@car.com')
const whatsappInput = page.getByLabel('WhatsApp com DDD')
if (await whatsappInput.getAttribute('inputmode') !== 'numeric') throw new Error('WhatsApp não abriu o modo numérico.')
await whatsappInput.fill('85abc988811817')
if (await whatsappInput.inputValue() !== '(85) 98881-1817') throw new Error('WhatsApp aceitou caracteres não numéricos.')
await page.getByRole('button', { name: 'Continuar' }).click()

const cepInput = page.getByPlaceholder('00000-000')
if (await cepInput.getAttribute('inputmode') !== 'numeric') throw new Error('CEP não abriu o modo numérico.')
await cepInput.fill('60abc120100')
const maskedCep = await cepInput.inputValue()
if (maskedCep !== '60120-100') throw new Error(`CEP aceitou caracteres não numéricos: ${JSON.stringify(maskedCep)}.`)
await page.getByRole('button', { name: 'Consultar CEP' }).click()
await page.getByText('Endereço encontrado. Confira e edite o que for necessário.').waitFor()
await page.getByLabel('Número').fill('15')
await page.getByLabel('Complemento').fill('AP 301')
await page.screenshot({ path: `${screenshotDir}/formulario-mobile.png`, fullPage: true })
await page.getByRole('button', { name: 'Continuar' }).click()

await page.locator('.consent-box__check').waitFor()
await page.locator('label.consent-box').click()
if (!await page.locator('label.consent-box input').isChecked()) throw new Error('Confirmação de conferência não foi marcada.')
await page.getByRole('button', { name: 'Confirmar e enviar' }).click()
await page.getByRole('heading', { name: 'Dados enviados!' }).waitFor()

await page.setViewportSize({ width: 1440, height: 1000 })
await page.goto(baseUrl)
const requestRow = page.getByText('Jose Maria da Silva')
await requestRow.click()
await page.getByRole('button', { name: 'Aprovar dados' }).click()
await page.getByText('Dados aprovados. O PDF já pode ser exportado.').waitFor()

const downloadPromise = page.waitForEvent('download')
await page.getByRole('button', { name: 'Baixar PDF' }).click()
const download = await downloadPromise
if (!download.suggestedFilename().endsWith('.pdf')) throw new Error('O PDF não foi baixado corretamente.')
await download.saveAs(`${screenshotDir}/formulario-auxiliar-teste.pdf`)

await page.goto(baseUrl)
await page.getByText('Jose Maria da Silva').waitFor()
await page.screenshot({ path: `${screenshotDir}/painel-desktop.png`, fullPage: true })

if (pageErrors.length) throw new Error(`Erros no navegador: ${pageErrors.join(' | ')}`)

await browser.close()
console.log('Fluxo completo validado: criação, preenchimento, aprovação e PDF.')
