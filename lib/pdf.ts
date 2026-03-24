/**
 * lib/pdf.ts
 * Client-side FIR PDF generation using jsPDF.
 * Only imported dynamically on the browser.
 */
import type { FIR } from "@/lib/types"

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  "under-verification": "Under Review",
  verified: "Verified",
  rejected: "Rejected",
}

export async function downloadFIRPdf(fir: FIR): Promise<void> {
  // Dynamic import keeps jsPDF out of the server bundle
  const { jsPDF } = await import("jspdf")
  const autoTable = (await import("jspdf-autotable")).default

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 18
  let y = margin

  // ── Header bar ────────────────────────────────────────────────────────────
  doc.setFillColor(30, 41, 59) // slate-800
  doc.rect(0, 0, pageW, 22, "F")
  doc.setTextColor(248, 250, 252)
  doc.setFontSize(13)
  doc.setFont("helvetica", "bold")
  doc.text("VeriFIR — Blockchain FIR System", margin, 14)
  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  doc.text("Tamper-Proof FIR Record", pageW - margin, 14, { align: "right" })

  y = 32

  // ── FIR ID + Status ───────────────────────────────────────────────────────
  doc.setTextColor(15, 23, 42)
  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  doc.text(fir.id, margin, y)

  const statusColor: Record<string, [number, number, number]> = {
    verified: [22, 163, 74],
    rejected: [220, 38, 38],
    "under-verification": [37, 99, 235],
    pending: [217, 119, 6],
  }
  const [r, g, b] = statusColor[fir.status] ?? [107, 114, 128]
  doc.setFontSize(10)
  doc.setTextColor(r, g, b)
  doc.setFont("helvetica", "bold")
  doc.text(`Status: ${STATUS_LABELS[fir.status] ?? fir.status}`, pageW - margin, y, { align: "right" })
  y += 6

  doc.setFontSize(11)
  doc.setTextColor(51, 65, 85)
  doc.setFont("helvetica", "normal")
  doc.text(fir.title, margin, y)
  y += 10

  // ── Divider ───────────────────────────────────────────────────────────────
  doc.setDrawColor(226, 232, 240)
  doc.line(margin, y, pageW - margin, y)
  y += 8

  // ── Details table ─────────────────────────────────────────────────────────
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 48, textColor: [100, 116, 139] }, 1: { textColor: [15, 23, 42] } },
    body: [
      ["FIR ID", fir.id],
      ["Title", fir.title],
      ["Incident Date", new Date(fir.incidentDate).toLocaleDateString("en-IN")],
      ["Filed Date", new Date(fir.filedDate).toLocaleDateString("en-IN")],
      ["Location", fir.location],
      ["Filed By", `${fir.citizenName} (ID: ${fir.citizenId})`],
      ...(fir.policeVerifierName ? [["Police Officer", fir.policeVerifierName]] : []),
      ...(fir.verifiedAt ? [["Verified On", new Date(fir.verifiedAt).toLocaleDateString("en-IN")]] : []),
      ...(fir.rejectionReason ? [["Rejection Reason", fir.rejectionReason]] : []),
    ],
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 8

  // ── Description ──────────────────────────────────────────────────────────
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(100, 116, 139)
  doc.text("DESCRIPTION", margin, y)
  y += 5

  doc.setFont("helvetica", "normal")
  doc.setTextColor(15, 23, 42)
  doc.setFontSize(9)
  const descLines = doc.splitTextToSize(fir.description, pageW - margin * 2)
  doc.text(descLines, margin, y)
  y += descLines.length * 5 + 8

  // ── Evidence files ────────────────────────────────────────────────────────
  if (fir.evidenceFiles.length > 0) {
    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(100, 116, 139)
    doc.text("EVIDENCE FILES", margin, y)
    y += 2

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: "striped",
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 8 },
      styles: { fontSize: 8 },
      head: [["File Name", "Type", "IPFS CID"]],
      body: fir.evidenceFiles.map((f) => [
        f.name,
        f.type || "—",
        f.ipfsCid.slice(0, 30) + "…",
      ]),
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 8
  }

  // ── Blockchain record ─────────────────────────────────────────────────────
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(100, 116, 139)
  doc.text("BLOCKCHAIN RECORD", margin, y)
  y += 2

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: "plain",
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 42, textColor: [100, 116, 139] }, 1: { textColor: [15, 23, 42], fontStyle: "normal" } },
    body: [
      ["Tx Hash", fir.blockchainTxHash],
      ["IPFS CID", fir.ipfsCid],
      ["Data Hash (SHA-256)", fir.storedHash],
    ],
  })

  // ── Verified watermark ────────────────────────────────────────────────────
  if (fir.status === "verified") {
    const pageH = doc.internal.pageSize.getHeight()
    doc.saveGraphicsState()
    doc.setGState(new doc.GState({ opacity: 0.07 }))
    doc.setTextColor(22, 163, 74)
    doc.setFontSize(44)
    doc.setFont("helvetica", "bold")
    doc.text("BLOCKCHAIN VERIFIED", pageW / 2, pageH / 2, {
      align: "center",
      angle: 45,
    })
    doc.restoreGraphicsState()
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  const pageH = doc.internal.pageSize.getHeight()
  doc.setFontSize(7)
  doc.setTextColor(148, 163, 184)
  doc.setFont("helvetica", "normal")
  doc.text(
    `Generated on ${new Date().toLocaleString("en-IN")} | VeriFIR Blockchain FIR System`,
    pageW / 2,
    pageH - 8,
    { align: "center" }
  )

  doc.save(`FIR-${fir.id}.pdf`)
}
