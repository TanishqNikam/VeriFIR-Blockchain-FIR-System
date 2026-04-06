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

  // ── NCRB Form Header ─────────────────────────────────────────────────────
  doc.setTextColor(15, 23, 42)
  doc.setFontSize(9)
  doc.setFont("helvetica", "bold")
  doc.text("N.C.R.B. I.I.F.-I", pageW / 2, y, { align: "center" })
  y += 5
  doc.setFontSize(14)
  doc.text("FIRST INFORMATION REPORT", pageW / 2, y, { align: "center" })
  y += 4
  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(100, 116, 139)
  doc.text("(Under Section 173 B.N.S.S.)", pageW / 2, y, { align: "center" })
  y += 8

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
      ...(fir.district ? [["District", fir.district]] : []),
      ...(fir.policeStation ? [["Police Station", fir.policeStation]] : []),
      ["Offence", fir.title],
      ["Incident Date", new Date(fir.incidentDate).toLocaleDateString("en-IN") + (fir.incidentDateTo ? ` to ${new Date(fir.incidentDateTo).toLocaleDateString("en-IN")}` : "")],
      ...(fir.incidentTimeFrom ? [["Time of Occurrence", `${fir.incidentTimeFrom}${fir.incidentTimeTo ? ` – ${fir.incidentTimeTo}` : ""}`]] : []),
      ["Filed Date", new Date(fir.filedDate).toLocaleDateString("en-IN")],
      ["Location (Area)", fir.location],
      ...(fir.placeAddress ? [["Full Address", fir.placeAddress]] : []),
      ...(fir.typeOfInformation ? [["Type of Information", fir.typeOfInformation.charAt(0).toUpperCase() + fir.typeOfInformation.slice(1)]] : []),
      ["Filed By", `${fir.citizenName} (ID: ${fir.citizenId})`],
      ...(fir.complainantDetails?.mobile ? [["Complainant Mobile", fir.complainantDetails.mobile]] : []),
      ...(fir.complainantDetails?.occupation ? [["Complainant Occupation", fir.complainantDetails.occupation]] : []),
      ...(fir.policeVerifierName ? [["Police Officer", fir.policeVerifierName]] : []),
      ...(fir.verifiedAt ? [["Verified On", new Date(fir.verifiedAt).toLocaleDateString("en-IN")]] : []),
      ...(fir.rejectionReason ? [["Rejection Reason", fir.rejectionReason]] : []),
      ...(fir.totalPropertyValue ? [["Total Property Value", `₹ ${fir.totalPropertyValue.toLocaleString("en-IN")}`]] : []),
    ],
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 8

  // ── Acts & Sections ────────────────────────────────────────────────────────
  if (fir.acts && fir.acts.length > 0) {
    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(100, 116, 139)
    doc.text("ACTS & SECTIONS", margin, y)
    y += 2
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: "striped",
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 8 },
      styles: { fontSize: 8 },
      head: [["S.No.", "Act / Adhiniyam", "Sections (Kalam)"]],
      body: fir.acts.map((a, i) => [String(i + 1), a.act, a.sections]),
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 8
  }

  // ── Accused Details ────────────────────────────────────────────────────────
  if (fir.accusedDetails && fir.accusedDetails.length > 0) {
    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(100, 116, 139)
    doc.text("ACCUSED / SUSPECTED PERSONS", margin, y)
    y += 2
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: "striped",
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 8 },
      styles: { fontSize: 8 },
      head: [["S.No.", "Name", "Alias", "Relative's Name", "Address"]],
      body: fir.accusedDetails.map((a, i) => [
        String(i + 1), a.name, a.alias || "—", a.relativeName || "—", a.address || "—",
      ]),
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 8
  }

  // ── First Information Contents (Narrative) ─────────────────────────────────
  const narrative = fir.firstInformationContents || fir.description
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(100, 116, 139)
  doc.text("FIRST INFORMATION CONTENTS (FARYAD)", margin, y)
  y += 5

  doc.setFont("helvetica", "normal")
  doc.setTextColor(15, 23, 42)
  doc.setFontSize(9)
  const descLines = doc.splitTextToSize(narrative, pageW - margin * 2)
  doc.text(descLines, margin, y)
  y += descLines.length * 5 + 8

  // ── Delay Reason ─────────────────────────────────────────────────────────
  if (fir.delayReason) {
    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(100, 116, 139)
    doc.text("REASON FOR DELAY IN REPORTING", margin, y)
    y += 5
    doc.setFont("helvetica", "normal")
    doc.setTextColor(15, 23, 42)
    doc.setFontSize(9)
    const delayLines = doc.splitTextToSize(fir.delayReason, pageW - margin * 2)
    doc.text(delayLines, margin, y)
    y += delayLines.length * 5 + 8
  }

  // ── Property Details ────────────────────────────────────────────────────────
  if (fir.propertyDetails && fir.propertyDetails.length > 0) {
    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(100, 116, 139)
    doc.text("PARTICULARS OF PROPERTY", margin, y)
    y += 2
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: "striped",
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 8 },
      styles: { fontSize: 8 },
      head: [["S.No.", "Category", "Type", "Description", "Value (₹)"]],
      body: fir.propertyDetails.map((p, i) => [
        String(i + 1), p.category, p.type, p.description, p.value.toLocaleString("en-IN"),
      ]),
      foot: fir.totalPropertyValue ? [["", "", "", "Total", `₹ ${fir.totalPropertyValue.toLocaleString("en-IN")}`]] : undefined,
      footStyles: { fontStyle: "bold", fillColor: [241, 245, 249] },
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 8
  }

  // ── Evidence files ────────────────────────────────────────────────────────
  const allEvidenceFiles = [
    ...fir.evidenceFiles,
    ...(fir.policeEvidenceFiles ?? []),
  ]

  if (allEvidenceFiles.length > 0) {
    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(100, 116, 139)
    doc.text("EVIDENCE FILES", margin, y)
    y += 2

    // Separate files by type
    const imageFiles = allEvidenceFiles.filter((f) =>
      /^image\//i.test(f.type || "") || /\.(jpg|jpeg|png|gif|webp)$/i.test(f.name)
    )
    const audioFiles = allEvidenceFiles.filter((f) =>
      /^audio\//i.test(f.type || "") || /\.(mp3|wav|ogg|aac|m4a)$/i.test(f.name)
    )
    const videoFiles = allEvidenceFiles.filter((f) =>
      /^video\//i.test(f.type || "") || /\.(mp4|mov|avi|mkv|webm)$/i.test(f.name)
    )
    const otherFiles = allEvidenceFiles.filter(
      (f) => !imageFiles.includes(f) && !audioFiles.includes(f) && !videoFiles.includes(f)
    )

    // Table of all evidence with type labels
    const evidenceRows = allEvidenceFiles.map((f, i) => {
      let category = "Document"
      if (imageFiles.includes(f)) category = "Image"
      else if (audioFiles.includes(f)) category = "Audio"
      else if (videoFiles.includes(f)) category = "Video"
      const addedBy = (f as { uploadedBy?: string }).uploadedBy
        ? `Officer: ${(f as { uploadedBy?: string }).uploadedBy}`
        : "Complainant"
      return [String(i + 1), f.name, category, addedBy, f.ipfsCid.slice(0, 28) + "…"]
    })

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: "striped",
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 8 },
      styles: { fontSize: 8 },
      head: [["#", "File Name", "Type", "Submitted By", "IPFS CID"]],
      body: evidenceRows,
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 6

    // Audio/Video media note
    const mediaFiles = [...audioFiles, ...videoFiles]
    if (mediaFiles.length > 0) {
      doc.setFontSize(8)
      doc.setFont("helvetica", "italic")
      doc.setTextColor(100, 116, 139)
      const mediaNote = `Note: ${audioFiles.length > 0 ? `${audioFiles.length} audio file(s)` : ""}${audioFiles.length > 0 && videoFiles.length > 0 ? " and " : ""}${videoFiles.length > 0 ? `${videoFiles.length} video file(s)` : ""} are attached as evidence. Audio and video files cannot be embedded in PDF. Download the evidence package from IPFS using the CIDs listed above to access these files.`
      const mediaLines = doc.splitTextToSize(mediaNote, pageW - margin * 2)
      doc.text(mediaLines, margin, y)
      y += mediaLines.length * 4 + 6
    }

    // Embedded images
    if (imageFiles.length > 0) {
      const IPFS_GATEWAYS = [
        "https://gateway.pinata.cloud/ipfs",
        "https://cloudflare-ipfs.com/ipfs",
        "https://ipfs.io/ipfs",
      ]

      doc.setFont("helvetica", "bold")
      doc.setFontSize(9)
      doc.setTextColor(100, 116, 139)
      doc.text("ATTACHED IMAGES", margin, y)
      y += 5

      for (const imgFile of imageFiles) {
        // Try to fetch and embed each image
        let imgData: string | null = null
        for (const gateway of IPFS_GATEWAYS) {
          try {
            const res = await fetch(`${gateway}/${imgFile.ipfsCid}`)
            if (!res.ok) continue
            const blob = await res.blob()
            imgData = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader()
              reader.onload = () => resolve(reader.result as string)
              reader.onerror = reject
              reader.readAsDataURL(blob)
            })
            break
          } catch {
            // try next gateway
          }
        }

        if (imgData) {
          // Check page space; add new page if needed
          const imgMaxHeight = 60
          const imgMaxWidth = pageW - margin * 2
          if (y + imgMaxHeight + 20 > doc.internal.pageSize.getHeight() - 20) {
            doc.addPage()
            y = margin
          }
          try {
            // Determine image format
            const format = imgData.startsWith("data:image/png") ? "PNG"
              : imgData.startsWith("data:image/gif") ? "GIF"
              : "JPEG"
            doc.addImage(imgData, format, margin, y, imgMaxWidth, 0)
            // Calculate rendered height based on aspect ratio
            const tempImg = new Image()
            tempImg.src = imgData
            const aspectRatio = tempImg.naturalHeight / (tempImg.naturalWidth || 1)
            const renderedHeight = Math.min(imgMaxWidth * aspectRatio, imgMaxHeight)
            y += renderedHeight + 4
            doc.setFontSize(7)
            doc.setFont("helvetica", "italic")
            doc.setTextColor(148, 163, 184)
            doc.text(imgFile.name, margin, y)
            y += 6
          } catch {
            // If image embed fails, just log the file name
            doc.setFontSize(8)
            doc.setFont("helvetica", "normal")
            doc.setTextColor(100, 116, 139)
            doc.text(`[Image could not be embedded: ${imgFile.name}]`, margin, y)
            y += 6
          }
        } else {
          // Could not fetch from any gateway
          doc.setFontSize(8)
          doc.setFont("helvetica", "italic")
          doc.setTextColor(100, 116, 139)
          doc.text(`[Image unavailable from IPFS: ${imgFile.name} — CID: ${imgFile.ipfsCid.slice(0, 20)}…]`, margin, y)
          y += 6
        }
      }
      y += 4
    }
  }

  // ── Complainant Signature ────────────────────────────────────────────────
  if (fir.signatureImageCid) {
    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(100, 116, 139)
    doc.text("COMPLAINANT SIGNATURE", margin, y)
    y += 5

    const SIG_GATEWAYS = [
      "https://gateway.pinata.cloud/ipfs",
      "https://cloudflare-ipfs.com/ipfs",
      "https://ipfs.io/ipfs",
    ]
    let sigData: string | null = null
    for (const gateway of SIG_GATEWAYS) {
      try {
        const res = await fetch(`${gateway}/${fir.signatureImageCid}`)
        if (!res.ok) continue
        const blob = await res.blob()
        sigData = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(blob)
        })
        break
      } catch { /* try next */ }
    }

    if (sigData) {
      if (y + 30 > doc.internal.pageSize.getHeight() - 20) { doc.addPage(); y = margin }
      const format = sigData.startsWith("data:image/png") ? "PNG" : "JPEG"
      doc.addImage(sigData, format, margin, y, 60, 0)
      const tempImg = new Image()
      tempImg.src = sigData
      const renderedH = Math.min(60 * (tempImg.naturalHeight / (tempImg.naturalWidth || 1)), 30)
      y += renderedH + 4
    } else {
      doc.setFontSize(8)
      doc.setFont("helvetica", "italic")
      doc.setTextColor(100, 116, 139)
      doc.text(`[Signature image — CID: ${fir.signatureImageCid.slice(0, 28)}…]`, margin, y)
      y += 6
    }

    doc.setFontSize(7)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(148, 163, 184)
    doc.text(`IPFS CID: ${fir.signatureImageCid}`, margin, y)
    y += 8
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    doc.setGState(new (doc as any).GState({ opacity: 0.07 }))
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
