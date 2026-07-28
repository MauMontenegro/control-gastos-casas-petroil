import { usePaymentsRepository } from '~/repositories/paymentsRepository'
import type { CreatePaymentPayload, Payment } from '~/types'

export const usePaymentsStore = defineStore('payments', () => {
  const items = ref<Payment[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const readyCount = computed(() => items.value.filter((p) => p.status === 'listo').length)

  async function fetchPayments() {
    loading.value = true
    error.value = null
    try {
      items.value = await usePaymentsRepository().getPayments()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al cargar pagos'
    } finally {
      loading.value = false
    }
  }

  async function registerPayment(payload: CreatePaymentPayload) {
    const created = await usePaymentsRepository().createPayment(payload)
    items.value.unshift(created)
    return created
  }

  return { items, loading, error, readyCount, fetchPayments, registerPayment }
})
