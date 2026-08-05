import { useCalendarEventsRepository } from '~/repositories/calendarEventsRepository'
import type { CalendarEvent, CreateCalendarEventPayload, UpdateCalendarEventPayload } from '~/types'

export const useCalendarEventsStore = defineStore('calendarEvents', () => {
  const items = ref<CalendarEvent[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchEvents() {
    loading.value = true
    error.value = null
    try {
      items.value = await useCalendarEventsRepository().getEvents()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al cargar recordatorios'
    } finally {
      loading.value = false
    }
  }

  async function createEvent(payload: CreateCalendarEventPayload) {
    const created = await useCalendarEventsRepository().createEvent(payload)
    items.value.push(created)
    return created
  }

  async function updateEvent(id: string, payload: UpdateCalendarEventPayload) {
    const updated = await useCalendarEventsRepository().updateEvent(id, payload)
    const index = items.value.findIndex((e) => e.id === id)
    if (index !== -1) items.value[index] = updated
    return updated
  }

  async function deleteEvent(id: string) {
    await useCalendarEventsRepository().deleteEvent(id)
    items.value = items.value.filter((e) => e.id !== id)
  }

  return { items, loading, error, fetchEvents, createEvent, updateEvent, deleteEvent }
})
