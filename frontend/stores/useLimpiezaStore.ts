import { useLimpiezaRepository } from '~/repositories/limpiezaRepository'
import type {
  CreateLimpiezaAsignacionPayload,
  LimpiezaAsignacion,
  UpdateLimpiezaAsignacionPayload,
} from '~/types'

const asignacionesEjemplo: LimpiezaAsignacion[] = [
  {
    id: 'demo-limpieza-1',
    casa: 1,
    casaNombre: 'Casa Campestre',
    empresa: 'Petroil',
    personaNombre: 'María Elena López',
    banco: 'BBVA',
    tarjeta: '•••• 4821',
    tarifaDiaria: 450,
    dias: {
      lunes: true,
      martes: true,
      miercoles: true,
      jueves: true,
      viernes: true,
      sabado: false,
      domingo: false,
    },
  },
  {
    id: 'demo-limpieza-2',
    casa: 2,
    casaNombre: 'Casa Centro',
    empresa: 'Transportes Petroil',
    personaNombre: 'Rosa Isela Martínez',
    banco: 'Santander',
    tarjeta: '•••• 7390',
    tarifaDiaria: 500,
    dias: {
      lunes: true,
      martes: false,
      miercoles: true,
      jueves: false,
      viernes: true,
      sabado: true,
      domingo: false,
    },
  },
  {
    id: 'demo-limpieza-3',
    casa: 3,
    casaNombre: 'Casa Norte',
    empresa: 'Petroil',
    personaNombre: 'Patricia Hernández',
    banco: 'Banorte',
    tarjeta: '•••• 1654',
    tarifaDiaria: 425,
    dias: {
      lunes: false,
      martes: true,
      miercoles: true,
      jueves: true,
      viernes: false,
      sabado: false,
      domingo: false,
    },
  },
  {
    id: 'demo-limpieza-4',
    casa: 4,
    casaNombre: 'Casa Jardines',
    empresa: 'Grupo Petroil',
    personaNombre: 'Claudia Ramírez Soto',
    banco: 'HSBC',
    tarjeta: '•••• 9067',
    tarifaDiaria: 475,
    dias: {
      lunes: true,
      martes: true,
      miercoles: false,
      jueves: true,
      viernes: true,
      sabado: false,
      domingo: false,
    },
  },
  {
    id: 'demo-limpieza-5',
    casa: 5,
    casaNombre: 'Casa Industrial',
    empresa: 'Petroil',
    personaNombre: 'Ana Gabriela Torres',
    banco: 'Banamex',
    tarjeta: '•••• 3148',
    tarifaDiaria: 550,
    dias: {
      lunes: true,
      martes: true,
      miercoles: true,
      jueves: true,
      viernes: true,
      sabado: true,
      domingo: false,
    },
  },
]

export const useLimpiezaStore = defineStore('limpieza', () => {
  const items = ref<LimpiezaAsignacion[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchAsignaciones() {
    loading.value = true
    error.value = null
    try {
      const asignaciones = await useLimpiezaRepository().getAsignaciones()
      items.value = asignaciones.length ? asignaciones : structuredClone(asignacionesEjemplo)
    } catch {
      items.value = structuredClone(asignacionesEjemplo)
      error.value = null
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
