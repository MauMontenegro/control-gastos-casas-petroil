export type CalendarEventRecurrence = 'unico' | 'mensual'

export interface CalendarEvent {
  id: string
  casa: number
  casaNombre: string
  tipoPago: string
  recurrencia: CalendarEventRecurrence
  /** YYYY-MM-DD, requerido si recurrencia === 'unico'. */
  fecha?: string
  /** 1-31, requerido si recurrencia === 'mensual'. Se ajusta a meses cortos. */
  diaDelMes?: number
  nota?: string
  activo: boolean
}

export interface CreateCalendarEventPayload {
  casa: number
  tipoPago: string
  recurrencia: CalendarEventRecurrence
  fecha?: string
  diaDelMes?: number
  nota?: string
}

export interface UpdateCalendarEventPayload extends Partial<CreateCalendarEventPayload> {
  activo?: boolean
}
