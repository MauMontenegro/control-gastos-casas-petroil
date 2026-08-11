// El "Tipo de Incremento" se deriva del tipo de gasto: Limpieza siempre se
// paga en cajero (no hay ventanilla/establecimiento para eso), el resto en
// establecimiento por default. El usuario puede cambiarlo a mano después.
export function deriveIncrementType(expenseType: string): string {
  return expenseType === 'Limpieza' ? 'Cajero Automático' : 'Pago en establecimiento'
}

// En el cajero automático solo se puede retirar en múltiplos de $100 — se
// redondea siempre hacia arriba (1353 -> 1400) para no quedar corto.
export function roundToCajero(amount: number): number {
  return Math.ceil(amount / 100) * 100
}
