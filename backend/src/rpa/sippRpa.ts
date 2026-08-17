import { existsSync } from 'node:fs'
import { chromium, type Browser, type Page } from 'playwright'
import { config, getSippBaseUrl } from '../config.js'
import { decryptSecret } from '../crypto.js'
import type { FundRequestRecord } from '../repositories/requestRepository.js'
import type { SippConfigurationRecord } from '../types.js'

export interface CatalogOption {
  id: string
  name: string
}

async function login(page: Page, configuration: SippConfigurationRecord) {
  const loginUrl = new URL('login.html', getSippBaseUrl(configuration.environment)).toString()
  await page.goto(loginUrl, { waitUntil: 'domcontentloaded' })
  await page.locator('#nb_Usuario').fill(configuration.username)
  await page.locator('input[placeholder="Contraseña"]').first().fill(
    decryptSecret(configuration.password_encrypted),
  )
  await Promise.all([
    page.waitForLoadState('networkidle').catch(() => undefined),
    page.locator('#btnLogin').click(),
  ])
  await page.waitForFunction(() => !document.querySelector('#btnLogin'), undefined, {
    timeout: config.RPA_TIMEOUT_MS,
  })
}

async function withSession<T>(
  configuration: SippConfigurationRecord,
  operation: (page: Page) => Promise<T>,
) {
  let browser: Browser | undefined
  try {
    browser = await chromium.launch({
      headless: configuration.headless !== 0,
      channel: config.RPA_BROWSER_CHANNEL,
      args: [
        '--disable-features=LocalNetworkAccessChecks,PrivateNetworkAccessChecks,PrivateNetworkAccessRespectPreflightResults',
      ],
    })
    const context = await browser.newContext({ ignoreHTTPSErrors: true })
    const page = await context.newPage()
    page.setDefaultTimeout(config.RPA_TIMEOUT_MS)
    await login(page, configuration)
    return await operation(page)
  } finally {
    await browser?.close()
  }
}

async function selectAngularOption(page: Page, selector: string, value: string) {
  const control = page.locator(selector)
  await control.waitFor({ state: 'attached' })
  await control.evaluate((element, selectedValue) => {
    const select = element as HTMLSelectElement
    select.value = selectedValue
    element.dispatchEvent(new Event('input', { bubbles: true }))
    element.dispatchEvent(new Event('change', { bubbles: true }))
  }, value)
}

async function selectChosenByText(page: Page, selector: string, text: string) {
  const chosen = page.locator(`${selector} + .chosen-container`)
  await chosen.locator('.chosen-single').click()
  const search = chosen.locator('.chosen-search-input')
  await search.fill(text)
  await page.waitForFunction(
    ({ selectSelector, expectedText }) => {
      const select = document.querySelector(selectSelector)
      const container = select?.nextElementSibling
      const results = Array.from(
        container?.querySelectorAll<HTMLLIElement>('li.active-result') ?? [],
      ).filter((item) => item.offsetParent !== null)
      const exactMatches = results.filter(
        (item) => item.textContent?.trim().toLocaleLowerCase() === expectedText.toLocaleLowerCase(),
      )
      return exactMatches.length === 1
    },
    { selectSelector: selector, expectedText: text },
  )
  await chosen
    .locator('li.active-result:visible')
    .filter({ hasText: new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') })
    .click()
  await page.waitForFunction(
    ({ selectSelector, expectedText }) => {
      const select = document.querySelector<HTMLSelectElement>(selectSelector)
      return (
        select?.selectedOptions[0]?.textContent?.trim().toLocaleLowerCase() ===
        expectedText.toLocaleLowerCase()
      )
    },
    { selectSelector: selector, expectedText: text },
  )
}

async function optionsFrom(page: Page, selector: string): Promise<CatalogOption[]> {
  return page.locator(`${selector} option`).evaluateAll((options) =>
    options
      .map((option) => ({
        id: (option as HTMLOptionElement).value,
        name: (option.textContent || '').trim(),
      }))
      .filter((option) => option.id && option.id !== '0'),
  )
}

async function clickAngularButton(page: Page, selector: string) {
  const button = page.locator(selector)
  await button.waitFor({ state: 'attached' })
  await button.evaluate((element) => (element as HTMLElement).click())
}

async function navigateAngularRoute(page: Page, route: string) {
  await page.evaluate((nextRoute) => {
    window.location.hash = nextRoute
  }, route)
  await page.waitForURL((url) => url.hash === route)
}

export async function readSippCatalogs(
  configuration: SippConfigurationRecord,
  companyId?: string,
) {
  return withSession(configuration, async (page) => {
    await page.goto(`${getSippBaseUrl(configuration.environment)}#/ConfiguracionSession`)
    await page.locator('select[ng-model="id_Empresa"]').waitFor({ state: 'attached' })
    await page.waitForFunction(
      () => document.querySelectorAll('select[ng-model="id_Empresa"] option').length > 1,
    )
    const companies = await optionsFrom(page, 'select[ng-model="id_Empresa"]')
    const selectedCompany = companyId || configuration.company_id
    let branches: CatalogOption[] = []
    let cards: CatalogOption[] = []

    if (selectedCompany) {
      const company = companies.find((item) => item.id === selectedCompany)
      if (!company) throw new Error('La empresa configurada ya no está disponible en SIPP')
      await selectChosenByText(page, 'select[ng-model="id_Empresa"]', company.name)
      await page.waitForFunction(
        () => document.querySelectorAll('select[ng-model="id_Sucursal"] option').length > 1,
      )
      branches = await optionsFrom(page, 'select[ng-model="id_Sucursal"]')

      if (configuration.branch_id) {
        const branch = branches.find((item) => item.id === configuration.branch_id)
        if (!branch) throw new Error('La sucursal configurada ya no está disponible en SIPP')
        await selectChosenByText(page, 'select[ng-model="id_Sucursal"]', branch.name)
        await clickAngularButton(page, 'button[ng-click="Guardar()"]')
        await page.waitForTimeout(1500)
        await navigateAngularRoute(page, '#/SolicitudIncrementoSaldo')
        await page.locator('#cmb_Tarjeta').waitFor({ state: 'attached' })
        await page.waitForFunction(
          () => document.querySelectorAll('#cmb_Tarjeta option').length > 1,
        )
        cards = await optionsFrom(page, '#cmb_Tarjeta')
      }
    }
    return { companies, branches, cards }
  })
}

export async function captureRequestInSipp(
  configuration: SippConfigurationRecord,
  request: FundRequestRecord,
) {
  if (
    !configuration.company_id ||
    !configuration.company_name ||
    !configuration.branch_id ||
    !configuration.branch_name
  ) {
    throw new Error('Configura empresa y sucursal de SIPP antes de capturar')
  }
  return withSession(configuration, async (page) => {
    const baseUrl = getSippBaseUrl(configuration.environment)
    await page.goto(`${baseUrl}#/ConfiguracionSession`)
    await page.locator('select[ng-model="id_Empresa"]').waitFor({ state: 'attached' })
    await page.waitForFunction(
      () => document.querySelectorAll('select[ng-model="id_Empresa"] option').length > 1,
    )
    await selectChosenByText(
      page,
      'select[ng-model="id_Empresa"]',
      configuration.company_name!,
    )
    await page.waitForFunction(
      () => document.querySelectorAll('select[ng-model="id_Sucursal"] option').length > 1,
    )
    await selectChosenByText(
      page,
      'select[ng-model="id_Sucursal"]',
      configuration.branch_name!,
    )
    await clickAngularButton(page, 'button[ng-click="Guardar()"]')
    await page.waitForTimeout(1500)

    await navigateAngularRoute(page, '#/SolicitudIncrementoSaldo')
    await page.locator('button[title="Nueva Solicitud"]').click()
    await page.locator('#content_modalSolicitud').waitFor({ state: 'visible' })
    const cardName = request.sipp_card_name || configuration.card_name
    if (!cardName) throw new Error('La tarjeta seleccionada no tiene un nombre válido')
    await selectChosenByText(page, '#cmb_TarjetaEmpleado', cardName)
    await page.locator('[id="incremento.im_Importe0"]').fill(String(request.total))
    await selectAngularOption(
      page,
      '[id="incremento.id_OpcionIncremento0"]',
      request.increment_type,
    )
    await page.locator('[id="incremento.de_Motivo0"]').fill(request.concept.slice(0, 300))
    if (request.support_path && existsSync(request.support_path)) {
      await page.locator('#ar_Soporte').setInputFiles(request.support_path)
    }

    await page.locator('button[ng-click="generarSolicitud(1601)"]').click()
    try {
      await page.locator('#content_modalSolicitud').waitFor({
        state: 'hidden',
        timeout: config.RPA_TIMEOUT_MS,
      })
    } catch {
      const visibleError = await page
        .locator('.alert-danger:visible, .bootbox-body:visible, [role="alert"]:visible')
        .first()
        .textContent()
        .catch(() => null)
      throw new Error(visibleError?.trim() || 'SIPP no confirmó el guardado de la solicitud')
    }
    const bodyText = await page.locator('body').innerText()
    const folio = bodyText.match(/(?:folio|solicitud)\D{0,20}(\d{3,})/i)?.[1] ?? null
    return { folio }
  })
}
