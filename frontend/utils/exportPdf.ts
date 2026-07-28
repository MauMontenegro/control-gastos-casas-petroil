import jsPDF from 'jspdf'
import { saveAs } from 'file-saver'

export function exportSimplePdf(title: string, rows: [string, string][]) {
  const doc = new jsPDF()
  doc.setFontSize(16)
  doc.text(title, 14, 20)
  doc.setFontSize(11)
  rows.forEach(([label, value], i) => doc.text(`${label}: ${value}`, 14, 32 + i * 8))
  saveAs(doc.output('blob'), `${title.replace(/\s+/g, '-').toLowerCase()}.pdf`)
}
