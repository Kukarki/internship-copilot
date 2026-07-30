import { jsPDF } from "jspdf";

/** Generate a clean, multi-page PDF from plain text and download it. */
export function downloadTextPdf(filename: string, heading: string, body: string) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const margin = 56;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const usable = pageWidth - margin * 2;

  let y = margin;

  // Heading
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(heading, margin, y);
  y += 10;
  doc.setDrawColor(180);
  doc.line(margin, y, pageWidth - margin, y);
  y += 22;

  // Body
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);

  const paragraphs = body.split(/\n{2,}/);
  for (const para of paragraphs) {
    const clean = para.replace(/\s*\n\s*/g, " ").trim();
    if (!clean) continue;

    // Treat ALL-CAPS short lines as section headers.
    const isHeader = clean.length < 40 && clean === clean.toUpperCase() && /[A-Z]/.test(clean);
    if (isHeader) {
      y += 6;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
    }

    const lines = doc.splitTextToSize(clean, usable) as string[];
    for (const line of lines) {
      if (y > pageHeight - margin) { doc.addPage(); y = margin; }
      doc.text(line, margin, y);
      y += 16;
    }

    if (isHeader) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
    }
    y += 8;
  }

  doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}