export interface Casa {
  id: number
  nombre: string
  empresa: string
  sucursal: string
  ocupacionMaxima: number
  ocupacionDisponible: number
  numeroExterior: string
  cp: string
  direccion: string
  activo: boolean
  correo: string | null
  telefono: string | null
  nombreEncargado: string | null
}

export interface CasaContactoPayload {
  correo?: string | null
  telefono?: string | null
  nombreEncargado?: string | null
}
