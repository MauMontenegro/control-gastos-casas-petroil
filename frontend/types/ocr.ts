// Resultado de leer automáticamente el documento adjunto a un concepto de
// solicitud. Campos nullable porque el OCR no siempre logra extraer todo —
// el usuario siempre puede corregir manualmente lo que se autocompleta.
export type OcrExpenseType = 'Luz' | 'Agua' | 'Limpieza' | 'Gas' | 'Internet' | 'Otros'

export interface OcrExtractionResult {
  expenseType: OcrExpenseType | null
  provider: string | null
  amount: number | null
}
