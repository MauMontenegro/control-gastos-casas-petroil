import { useProofsRepository } from '~/repositories/proofsRepository'
import type { Proof } from '~/types'

export const useProofsStore = defineStore('proofs', () => {
  const items = ref<Proof[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const completeCount = computed(() => items.value.filter((p) => p.status === 'completo').length)
  const pendingCount = computed(() => items.value.filter((p) => p.status === 'pendiente').length)

  async function fetchProofs() {
    loading.value = true
    error.value = null
    try {
      items.value = await useProofsRepository().getProofs()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al cargar comprobaciones'
    } finally {
      loading.value = false
    }
  }

  return { items, loading, error, completeCount, pendingCount, fetchProofs }
})
