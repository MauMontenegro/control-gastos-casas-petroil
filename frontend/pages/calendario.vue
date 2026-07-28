<script setup lang="ts">
const store = usePaymentsStore()

onMounted(() => {
  store.fetchPayments()
})

const monthMap: Record<string, number> = {
  ene: 0,
  feb: 1,
  mar: 2,
  abr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  ago: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dic: 11,
}

function parseDueDate(dueDate: string): Date {
  const [day, month, year] = dueDate.split(' ')
  return new Date(Number(year), monthMap[month.toLowerCase()] ?? 0, Number(day))
}

const statusColor: Record<string, string> = {
  listo: 'success',
  variacion: 'warning',
  'falta-recibo': 'error',
  pagado: 'secondary',
}

const events = computed(() =>
  store.items.map((payment) => {
    const date = parseDueDate(payment.dueDate)
    return {
      title: `${payment.service} · ${payment.branch}`,
      start: date,
      end: date,
      color: statusColor[payment.status] ?? 'secondary',
      allDay: true,
    }
  }),
)

const focusDate = ref(new Date(2026, 6, 21))
</script>

<template>
  <div>
    <div class="mb-6">
      <p class="text-caption font-weight-bold text-secondary text-uppercase mb-1">
        AGENDA OPERATIVA
      </p>
      <h1 class="text-h4 font-weight-bold mb-1">Calendario de gastos</h1>
      <p class="text-body-2 text-medium-emphasis">
        Organiza vencimientos y atiende cada compromiso en orden.
      </p>
    </div>

    <v-card class="pa-4">
      <ClientOnly>
        <v-calendar v-model="focusDate" :events="events" view-mode="month" />
      </ClientOnly>
    </v-card>
  </div>
</template>
