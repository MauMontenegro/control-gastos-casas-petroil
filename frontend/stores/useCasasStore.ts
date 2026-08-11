import { useCasasRepository } from '~/repositories/casasRepository'
import type { Casa, CasaContactoPayload } from '~/types'

export const useCasasStore = defineStore('casas', () => {
  const items = ref<Casa[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const syncing = ref(false)

  async function fetchCasas() {
    loading.value = true
    error.value = null
    try {
      items.value = await useCasasRepository().getCasas()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al cargar casas'
    } finally {
      loading.value = false
    }
  }

  async function updateContacto(id: number, payload: CasaContactoPayload): Promise<Casa> {
    const updated = await useCasasRepository().updateCasaContacto(id, payload)
    const item = items.value.find((c) => c.id === id)
    if (item) Object.assign(item, updated)
    return updated
  }

  async function syncCasas() {
    syncing.value = true
    try {
      items.value = await useCasasRepository().syncCasas()
    } finally {
      syncing.value = false
    }
  }

  return { items, loading, error, syncing, fetchCasas, updateContacto, syncCasas }
})
