export interface LimpiezaDias {
  lunes: boolean
  martes: boolean
  miercoles: boolean
  jueves: boolean
  viernes: boolean
  sabado: boolean
  domingo: boolean
}

export interface LimpiezaAsignacion {
  id: string
  casa: number
  casaNombre: string
  empresa: string
  personaNombre: string
  banco: string
  tarjeta: string
  cantidadSemanal: number
  dias: LimpiezaDias
}

export interface CreateLimpiezaAsignacionPayload {
  casa: number
  personaNombre: string
  banco: string
  tarjeta: string
  cantidadSemanal: number
}

export interface UpdateLimpiezaAsignacionPayload
  extends Partial<CreateLimpiezaAsignacionPayload> {
  dias?: Partial<LimpiezaDias>
}
