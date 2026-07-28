import { useCleaningRepository } from '~/repositories/cleaningRepository'
import type { CleaningDay, CleaningWeek } from '~/types'

export const useCleaningStore = defineStore('cleaning', () => {
  const week = ref<CleaningWeek | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const workedDays = computed(() => week.value?.days.filter((d) => d.active).length ?? 0)
  const extraDays = computed(() => week.value?.extraDays ?? 0)
  const discount = computed(() => week.value?.discount ?? 0)
  const dailyRate = computed(() => week.value?.dailyRate ?? 0)
  const extraAmount = computed(() => extraDays.value * dailyRate.value)
  const total = computed(
    () => workedDays.value * dailyRate.value + extraAmount.value - discount.value,
  )

  async function fetchCurrentWeek() {
    loading.value = true
    error.value = null
    try {
      week.value = await useCleaningRepository().getCurrentWeek()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al cargar la semana de limpieza'
    } finally {
      loading.value = false
    }
  }

  function toggleDay(day: CleaningDay) {
    if (!week.value) return
    day.active = !day.active
  }

  function setExtraDays(value: number) {
    if (week.value) week.value.extraDays = value
  }

  function setDiscount(value: number) {
    if (week.value) week.value.discount = value
  }

  return {
    week,
    loading,
    error,
    workedDays,
    extraDays,
    discount,
    dailyRate,
    extraAmount,
    total,
    fetchCurrentWeek,
    toggleDay,
    setExtraDays,
    setDiscount,
  }
})
