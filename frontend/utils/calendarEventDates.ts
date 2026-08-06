import type { CalendarEvent } from '~/types'

export function calendarDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseCalendarDate(value: string): Date | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return Number.isNaN(date.getTime()) ? null : date
}

export function calendarEventOccursOn(event: CalendarEvent, date: Date): boolean {
  if (!event.activo) return false
  if (event.recurrencia === 'unico') return event.fecha === calendarDateKey(date)
  if (!event.diaDelMes) return false

  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  return date.getDate() === Math.min(event.diaDelMes, lastDay)
}

export function previousOrSameFriday(date: Date): Date {
  const friday = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const daysSinceFriday = (friday.getDay() - 5 + 7) % 7
  friday.setDate(friday.getDate() - daysSinceFriday)
  return friday
}

export function eventOccurrenceForPaymentFriday(
  event: CalendarEvent,
  friday: Date,
): Date | null {
  for (let offset = 0; offset < 7; offset += 1) {
    const candidate = new Date(friday.getFullYear(), friday.getMonth(), friday.getDate() + offset)
    if (calendarEventOccursOn(event, candidate)) return candidate
  }
  return null
}
