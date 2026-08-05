import { useLimpiezaRepository } from '~/repositories/limpiezaRepository'
import type {
  CreateLimpiezaAsignacionPayload,
  LimpiezaAsignacion,
  UpdateLimpiezaAsignacionPayload,
} from '~/types'

export const useLimpiezaStore = defineStore('limpieza', () => {
  const items = ref<LimpiezaAsignacion[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchAsignaciones() {
    loading.value = true
    error.value = null
    try {
      items.value = await useLimpiezaRepository().getAsignaciones()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al cargar limpieza'
    } finally {
      loading.value = false
    }
  }

  async function createAsignacion(payload: CreateLimpiezaAsignacionPayload) {
    const created = await useLimpiezaRepository().createAsignacion(payload)
    items.value.push(created)
    return created
  }

  async function updateAsignacion(id: string, payload: UpdateLimpiezaAsignacionPayload) {
    const updated = await useLimpiezaRepository().updateAsignacion(id, payload)
    const index = items.value.findIndex((a) => a.id === id)
    if (index !== -1) items.value[index] = updated
    return updated
  }

  async function deleteAsignacion(id: string) {
    await useLimpiezaRepository().deleteAsignacion(id)
    items.value = items.value.filter((a) => a.id !== id)
  }

  return {
    items,
    loading,
    error,
    fetchAsignaciones,
    createAsignacion,
    updateAsignacion,
    deleteAsignacion,
  }
})
