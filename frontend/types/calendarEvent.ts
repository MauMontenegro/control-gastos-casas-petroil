import type { ComprobacionStatus } from './fundRequest'

export type CalendarEventRecurrence = 'unico' | 'mensual'

/**
 * Vínculo entre una ocurrencia del recordatorio (una fecha, o un mes cuando
 * es mensual) y el concepto de solicitud que se generó al darle "Preparar".
 * comprobacionStatus se refleja en vivo desde ese concepto — cuando llega a
 * 'enviada' (se capturó el pago en SIPP) esa ocurrencia deja de alertar.
 */
export interface CalendarEventPreparation {
  /** 'YYYY-MM' para recordatorios mensuales, 'YYYY-MM-DD' para únicos. */
  periodKey: string
  requestId: string
  conceptId: string
  comprobacionStatus: ComprobacionStatus
}

export interface CalendarEvent {
  id: string
  casa: number
  casaNombre: string
  tipoPago: string
  tarjeta: string
  recurrencia: CalendarEventRecurrence
  /** YYYY-MM-DD, requerido si recurrencia === 'unico'. */
  fecha?: string
  /** 1-31, requerido si recurrencia === 'mensual'. Se ajusta a meses cortos. */
  diaDelMes?: number
  nota?: string
  activo: boolean
  preparations: CalendarEventPreparation[]
}

export interface CreateCalendarEventPayload {
  casa: number
  tipoPago: string
  tarjeta: string
  recurrencia: CalendarEventRecurrence
  fecha?: string
  diaDelMes?: number
  nota?: string
}

export interface UpdateCalendarEventPayload extends Partial<CreateCalendarEventPayload> {
  activo?: boolean
}

export interface LinkCalendarEventPreparationPayload {
  periodKey: string
  requestId: string
  conceptId: string
}

/** Datos que precargan el diálogo de solicitud al darle "Preparar" a un recordatorio. */
export interface CalendarEventPrepareContext {
  casa: number
  expenseType: string
  tarjeta: string
  calendarEventId: string
  periodKey: string
}
