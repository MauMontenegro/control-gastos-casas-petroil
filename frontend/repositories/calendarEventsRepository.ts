import type {
  CalendarEvent,
  CreateCalendarEventPayload,
  LinkCalendarEventPreparationPayload,
  UpdateCalendarEventPayload,
} from '~/types'
import { useHttpClient } from '~/repositories/httpClient'

export function useCalendarEventsRepository() {
  async function getEvents(): Promise<CalendarEvent[]> {
    return useHttpClient().request<CalendarEvent[]>('/calendar-events')
  }

  async function createEvent(payload: CreateCalendarEventPayload): Promise<CalendarEvent> {
    return useHttpClient().request<CalendarEvent>('/calendar-events', {
      method: 'POST',
      body: payload,
    })
  }

  async function updateEvent(
    id: string,
    payload: UpdateCalendarEventPayload,
  ): Promise<CalendarEvent> {
    return useHttpClient().request<CalendarEvent>(`/calendar-events/${id}`, {
      method: 'PATCH',
      body: payload,
    })
  }

  async function deleteEvent(id: string): Promise<void> {
    await useHttpClient().request(`/calendar-events/${id}`, { method: 'DELETE' })
  }

  // Vincula la ocurrencia (periodKey) preparada desde el calendario con el
  // concepto de solicitud recién creado/agregado, para poder reflejar su
  // comprobacionStatus en el propio recordatorio.
  async function linkPreparation(
    id: string,
    payload: LinkCalendarEventPreparationPayload,
  ): Promise<CalendarEvent> {
    return useHttpClient().request<CalendarEvent>(`/calendar-events/${id}/preparations`, {
      method: 'POST',
      body: payload,
    })
  }

  return { getEvents, createEvent, updateEvent, deleteEvent, linkPreparation }
}
