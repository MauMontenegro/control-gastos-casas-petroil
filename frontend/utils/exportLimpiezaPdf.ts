import jsPDF from 'jspdf'
import { saveAs } from 'file-saver'
import type { LimpiezaAsignacion, LimpiezaDias } from '~/types'

const dias: { key: keyof LimpiezaDias; label: string }[] = [
  { key: 'lunes', label: 'L' },
  { key: 'martes', label: 'M' },
  { key: 'miercoles', label: 'Mi' },
  { key: 'jueves', label: 'J' },
  { key: 'viernes', label: 'V' },
  { key: 'sabado', label: 'S' },
  { key: 'domingo', label: 'D' },
]

function currency(value: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value)
}

function workedDays(asignacion: LimpiezaAsignacion): string {
  const selected = dias.filter((dia) => asignacion.dias[dia.key]).map((dia) => dia.label)
  return selected.length ? selected.join(', ') : 'Sin dias'
}

export function exportLimpiezaPdf(asignaciones: LimpiezaAsignacion[]) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 12
  const columns = [
    { label: 'Persona', x: 14, width: 38 },
    { label: 'Casa / empresa', x: 54, width: 52 },
    { label: 'Banco', x: 108, width: 35 },
    { label: 'Tarjeta', x: 145, width: 34 },
    { label: 'Dias', x: 181, width: 29 },
    { label: 'Tarifa', x: 212, width: 27 },
    { label: 'Monto', x: 241, width: 38 },
  ]
  let y = 0

  const drawHeader = () => {
    doc.setFillColor(7, 95, 153)
    doc.rect(0, 0, pageWidth, 24, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(15)
    doc.text('Control semanal de limpieza', margin, 11)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.text(`Generado: ${new Date().toLocaleString('es-MX')}`, margin, 17)
    doc.text(`${asignaciones.length} asignaciones`, pageWidth - margin, 17, { align: 'right' })

    y = 31
    doc.setFillColor(237, 245, 248)
    doc.roundedRect(margin, y - 5, pageWidth - margin * 2, 9, 2, 2, 'F')
    doc.setTextColor(66, 91, 108)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    columns.forEach((column) => doc.text(column.label, column.x, y))
    y += 8
  }

  drawHeader()

  asignaciones.forEach((asignacion, index) => {
    if (y + 12 > pageHeight - 15) {
      doc.addPage()
      drawHeader()
    }

    if (index % 2 === 0) {
      doc.setFillColor(249, 251, 252)
      doc.rect(margin, y - 5, pageWidth - margin * 2, 11, 'F')
    }

    const count = dias.filter((dia) => asignacion.dias[dia.key]).length
    const values = [
      asignacion.personaNombre,
      `${asignacion.casaNombre} / ${asignacion.empresa}`,
      asignacion.banco,
      asignacion.tarjeta,
      `${workedDays(asignacion)} (${count})`,
      currency(asignacion.tarifaDiaria),
      currency(asignacion.tarifaDiaria * count),
    ]

    doc.setTextColor(30, 62, 83)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    columns.forEach((column, columnIndex) => {
      const text = doc.splitTextToSize(values[columnIndex] ?? '', column.width)
      doc.text(text[0] ?? '', column.x, y)
    })
    y += 11
  })

  const total = asignaciones.reduce((sum, asignacion) => {
    const count = dias.filter((dia) => asignacion.dias[dia.key]).length
    return sum + asignacion.tarifaDiaria * count
  }, 0)

  if (y + 18 > pageHeight - 10) {
    doc.addPage()
    drawHeader()
  }
  doc.setDrawColor(190, 213, 225)
  doc.line(margin, y, pageWidth - margin, y)
  y += 8
  doc.setTextColor(7, 95, 153)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('Total semanal', 225, y)
  doc.text(currency(total), pageWidth - margin, y, { align: 'right' })

  const filenameDate = new Date().toISOString().slice(0, 10)
  saveAs(doc.output('blob'), `limpieza-semanal-${filenameDate}.pdf`)
}
