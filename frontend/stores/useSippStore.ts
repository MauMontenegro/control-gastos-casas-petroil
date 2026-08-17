import type {
  SaveSippConfiguration,
  SippCatalogOption,
  SippConfiguration,
} from '~/types'
import { useSippRepository } from '~/repositories/sippRepository'

export const useSippStore = defineStore('sipp', () => {
  const configuration = ref<SippConfiguration | null>(null)
  const companies = ref<SippCatalogOption[]>([])
  const branches = ref<SippCatalogOption[]>([])
  const cards = ref<SippCatalogOption[]>([])
  const loading = ref(false)
  const connecting = ref(false)
  const error = ref<string | null>(null)

  async function fetchConfiguration() {
    loading.value = true
    error.value = null
    try {
      configuration.value = await useSippRepository().getConfiguration()
    } catch (cause) {
      error.value =
        cause instanceof Error ? cause.message : 'No fue posible cargar la configuración de SIPP'
      throw cause
    } finally {
      loading.value = false
    }
  }

  async function saveConfiguration(input: SaveSippConfiguration) {
    error.value = null
    try {
      configuration.value = await useSippRepository().saveConfiguration(input)
      return configuration.value
    } catch (cause) {
      error.value =
        cause instanceof Error ? cause.message : 'No fue posible guardar la configuración de SIPP'
      throw cause
    }
  }

  async function connect(companyId?: string) {
    connecting.value = true
    error.value = null
    try {
      const catalogs = await useSippRepository().getCatalogs(companyId)
      companies.value = catalogs.companies
      branches.value = catalogs.branches
      cards.value = catalogs.cards
      await fetchConfiguration()
      return catalogs
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'No fue posible conectar con SIPP'
      throw cause
    } finally {
      connecting.value = false
    }
  }

  return {
    configuration,
    companies,
    branches,
    cards,
    loading,
    connecting,
    error,
    fetchConfiguration,
    saveConfiguration,
    connect,
  }
})
