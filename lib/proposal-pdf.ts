// Ported from the sister "propsalgen" app's exportPdf.js (same visual design,
// same jsPDF/jspdf-autotable approach) so proposals generated inside the CRM
// look identical to the ones generated in the standalone tool. A real
// download, not window.print() — the browser print dialog reuses whatever
// destination (printer, OneNote, etc.) was last used, which isn't what a
// client-facing "Download PDF" button should do.
// Named import, not default — jsPDF's shipped ESM build's default export
// doesn't actually match its own type declarations (a known mismatch in its
// minified dist bundle); the named export reliably resolves to the real class.
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { format } from "date-fns"
import type { ProposalResult, PdfPod } from "@/lib/proposal-roles"

type DocWithAutoTable = jsPDF & { lastAutoTable: { finalY: number } }

const COLORS = {
  navy:       [13,  27,  62]   as const,
  teal:       [20,  184, 166]  as const,
  lightTeal:  [204, 251, 241]  as const,
  white:      [255, 255, 255]  as const,
  lightGray:  [248, 250, 252]  as const,
  gray:       [100, 116, 139]  as const,
  darkGray:   [30,  41,  59]   as const,
  red:        [239, 68,  68]   as const,
  lightRed:   [254, 242, 242]  as const,
}

function addPageHeader(doc: jsPDF, title: string, pageNum: number) {
  doc.setFillColor(...COLORS.navy)
  doc.rect(0, 0, 210, 14, "F")
  doc.setFontSize(8)
  doc.setTextColor(...COLORS.white)
  doc.setFont("helvetica", "bold")
  doc.text("BINARYNEXT", 14, 9)
  doc.setFont("helvetica", "normal")
  doc.text(title, 105, 9, { align: "center" })
  doc.text(`Page ${pageNum}`, 196, 9, { align: "right" })
}

function addSectionTitle(doc: jsPDF, title: string, y: number): number {
  doc.setFillColor(...COLORS.teal)
  doc.rect(14, y, 4, 8, "F")
  doc.setFontSize(13)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...COLORS.navy)
  doc.text(title, 22, y + 6)
  return y + 14
}

function checkPage(doc: jsPDF, y: number, pageNum: number, title: string): { y: number; pageNum: number } {
  if (y > 255) {
    doc.addPage()
    pageNum++
    addPageHeader(doc, title, pageNum)
    return { y: 24, pageNum }
  }
  return { y, pageNum }
}

export type ProposalPdfInput = {
  clientName: string
  projectType: string
  timeline: string
  pods: PdfPod[]
  ai: ProposalResult
}

export function exportProposalPdf(input: ProposalPdfInput) {
  const doc = new jsPDF({ unit: "mm", format: "a4" })
  const pageW = 210
  let pageNum = 1
  const clientName = input.clientName || "Valued Client"
  const ai = input.ai
  const propTitle = input.projectType || "Proposal"

  // ── PAGE 1: COVER ──────────────────────────────────────────────
  doc.setFillColor(...COLORS.navy)
  doc.rect(0, 0, pageW, 297, "F")
  doc.setFillColor(...COLORS.teal)
  doc.rect(0, 100, pageW, 4, "F")

  const logoChars: { ch: string; rgb: readonly [number, number, number] }[] = [
    { ch: "0", rgb: [34, 211, 238] },
    { ch: "1", rgb: [250, 204, 21] },
    { ch: "0", rgb: [248, 113, 113] },
    { ch: "1", rgb: [129, 140, 248] },
    { ch: "0", rgb: [74, 222, 128] },
  ]
  doc.setFontSize(28)
  doc.setFont("courier", "bold")
  const charW = 12
  const logoTotalW = logoChars.length * charW
  let lx = pageW / 2 - logoTotalW / 2
  const logoY = 46
  logoChars.forEach(({ ch, rgb }) => {
    doc.setTextColor(...rgb)
    doc.text(ch, lx + charW / 2, logoY, { align: "center" })
    lx += charW
  })
  doc.setDrawColor(255, 255, 255)
  doc.setLineWidth(0.6)
  doc.line(pageW / 2 - logoTotalW / 2, logoY - 8, pageW / 2 + logoTotalW / 2, logoY - 8)

  doc.setFontSize(22)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...COLORS.white)
  doc.text("BINARYNEXT", pageW / 2, 62, { align: "center" })
  doc.setFontSize(11)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(...COLORS.teal)
  doc.text("Offshore Pods & Dedicated Teams", pageW / 2, 72, { align: "center" })

  doc.setFontSize(22)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...COLORS.white)
  doc.text("PARTNERSHIP PROPOSAL", pageW / 2, 120, { align: "center" })
  doc.setFontSize(16)
  doc.setTextColor(...COLORS.teal)
  doc.text(clientName.toUpperCase(), pageW / 2, 134, { align: "center" })

  let detailY = 160
  const coverDetails: [string, string][] = [
    ["Project Type", input.projectType || "—"],
    ["Timeline", input.timeline || "—"],
    ["Prepared By", "Syed Bokhari / BinaryNext"],
    ["Date", format(new Date(), "MMMM d, yyyy")],
  ]
  coverDetails.forEach(([label, val]) => {
    doc.setFontSize(8)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(...COLORS.gray)
    doc.text(label.toUpperCase(), pageW / 2, detailY, { align: "center" })
    doc.setFontSize(11)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(...COLORS.white)
    doc.text(val, pageW / 2, detailY + 7, { align: "center" })
    detailY += 20
  })

  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(...COLORS.gray)
  doc.text("www.binarynext.io  |  operations@binarynext.io", pageW / 2, 285, { align: "center" })

  // ── PAGE 2: EXECUTIVE SUMMARY ──────────────────────────────────
  doc.addPage()
  pageNum++
  addPageHeader(doc, propTitle, pageNum)
  let y = 24

  y = addSectionTitle(doc, "Executive Summary", y)

  if (ai.executiveSummary) {
    const exLines = doc.splitTextToSize(ai.executiveSummary, 182)
    doc.setFontSize(9)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(...COLORS.darkGray)
    doc.text(exLines, 14, y)
    y += exLines.length * 5 + 8
  }

  if (ai.strategicFrame) {
    autoTable(doc, {
      startY: y,
      head: [["What They Need", "What We Provide", "The Goal"]],
      body: [[
        ai.strategicFrame.clientNeed || "",
        ai.strategicFrame.binaryNextProvides || "",
        ai.strategicFrame.goal || "",
      ]],
      theme: "grid",
      headStyles: { fillColor: [...COLORS.teal], textColor: [...COLORS.white], fontStyle: "bold", fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: [...COLORS.darkGray], cellPadding: 5 },
      columnStyles: { 0: { cellWidth: 61 }, 1: { cellWidth: 61 }, 2: { cellWidth: 60 } },
      margin: { left: 14, right: 14 },
    })
    y = (doc as DocWithAutoTable).lastAutoTable.finalY + 8
  }

  if (ai.coreChallenge) {
    doc.setFontSize(9)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(...COLORS.gray)
    doc.text("THE CHALLENGE", 14, y)
    y += 5
    doc.setFont("helvetica", "normal")
    doc.setTextColor(...COLORS.darkGray)
    const lines = doc.splitTextToSize(ai.coreChallenge, 182)
    doc.text(lines, 14, y)
    y += lines.length * 5 + 6
  }

  if (ai.hiringProblem) {
    doc.setFontSize(9)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(...COLORS.gray)
    doc.text("THE HIRING PROBLEM", 14, y)
    y += 5
    doc.setFont("helvetica", "normal")
    doc.setTextColor(...COLORS.darkGray)
    const lines = doc.splitTextToSize(ai.hiringProblem, 182)
    doc.text(lines, 14, y)
    y += lines.length * 5 + 6
  }

  if (ai.howBinaryNextFits) {
    doc.setFillColor(...COLORS.navy)
    const fitLines = doc.splitTextToSize(ai.howBinaryNextFits, 172)
    const boxH = fitLines.length * 5 + 12
    doc.roundedRect(14, y, 182, boxH, 2, 2, "F")
    doc.setFontSize(8)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(...COLORS.teal)
    doc.text("HOW BINARYNEXT FITS", 18, y + 6)
    doc.setFontSize(9)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(...COLORS.white)
    doc.text(fitLines, 18, y + 12)
    y += boxH + 8
  }

  // ── PAGE 3: WHAT CLIENT NEEDS ──────────────────────────────────
  ;({ y, pageNum } = checkPage(doc, y, pageNum, propTitle))
  if (y > 24) y += 4

  if (ai.clientNeeds?.length > 0) {
    y = addSectionTitle(doc, `What ${clientName} Needs Right Now`, y)
    ai.clientNeeds.forEach((need, i) => {
      ;({ y, pageNum } = checkPage(doc, y, pageNum, propTitle))
      doc.setFillColor(...COLORS.lightGray)
      const descLines = doc.splitTextToSize(need.description || "", 158)
      const boxH = descLines.length * 5 + 14
      doc.roundedRect(14, y, 182, boxH, 2, 2, "F")
      doc.setFillColor(...COLORS.teal)
      doc.circle(22, y + 7, 3.5, "F")
      doc.setFontSize(8)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(...COLORS.white)
      doc.text(String(i + 1), 22, y + 9, { align: "center" })
      doc.setFontSize(10)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(...COLORS.navy)
      doc.text(need.title || "", 30, y + 8)
      doc.setFontSize(9)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(...COLORS.darkGray)
      doc.text(descLines, 30, y + 14)
      y += boxH + 4
    })
    y += 4
  }

  if (ai.positioning) {
    ;({ y, pageNum } = checkPage(doc, y, pageNum, propTitle))
    y = addSectionTitle(doc, "Why BinaryNext", y)
    const posLines = doc.splitTextToSize(ai.positioning, 182)
    doc.setFontSize(9)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(...COLORS.darkGray)
    doc.text(posLines, 14, y)
    y += posLines.length * 5 + 6

    const chips = ["60–75% cheaper than US hiring", "Live in 3–5 business days", "No contracts. Month-to-month", "Instant replacement guarantee"]
    const chipW = 43
    chips.forEach((chip, i) => {
      doc.setFillColor(...COLORS.lightTeal)
      doc.roundedRect(14 + i * (chipW + 2), y, chipW, 10, 2, 2, "F")
      doc.setFontSize(7)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(...COLORS.navy)
      const chipLines = doc.splitTextToSize(chip, chipW - 4)
      doc.text(chipLines[0], 14 + i * (chipW + 2) + chipW / 2, y + 6.5, { align: "center" })
    })
    y += 16

    if (ai.competitiveLandscape) {
      ;({ y, pageNum } = checkPage(doc, y, pageNum, propTitle))
      doc.setFontSize(8)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(...COLORS.gray)
      doc.text("COMPETITIVE LANDSCAPE", 14, y)
      y += 5
      const compLines = doc.splitTextToSize(ai.competitiveLandscape, 182)
      doc.setFontSize(9)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(...COLORS.darkGray)
      doc.text(compLines, 14, y)
      y += compLines.length * 5 + 6
    }
  }

  // ── TEAM STRUCTURE ─────────────────────────────────────────────
  ;({ y, pageNum } = checkPage(doc, y, pageNum, propTitle))
  if (y > 24) y += 4
  y = addSectionTitle(doc, "Specialized Team Structure", y)

  if (ai.teamRationale) {
    doc.setFillColor(...COLORS.lightTeal)
    const rationaleLines = doc.splitTextToSize(`"${ai.teamRationale}"`, 172)
    const boxH = rationaleLines.length * 5 + 10
    doc.roundedRect(14, y, 182, boxH, 2, 2, "F")
    doc.setFontSize(9)
    doc.setFont("helvetica", "italic")
    doc.setTextColor(...COLORS.navy)
    doc.text(rationaleLines, 18, y + 7)
    y += boxH + 6
  }

  input.pods.forEach((pod, podIdx) => {
    ;({ y, pageNum } = checkPage(doc, y, pageNum, propTitle))

    doc.setFillColor(...COLORS.navy)
    doc.roundedRect(14, y, 182, 10, 2, 2, "F")
    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(...COLORS.white)
    const podTotal = pod.roles.reduce((s, r) => s + r.monthlyRate * r.count, 0)
    const isSoloPod = pod.type === "solo"
    const podLabel = isSoloPod
      ? `Solo Hire: ${pod.roles[0]?.roleLabel || "Unnamed"}`
      : (pod.name ? `Pod ${podIdx + 1}: ${pod.name}` : `Pod ${podIdx + 1}`)
    doc.text(podLabel, 18, y + 7)
    doc.text(`$${podTotal.toLocaleString()}/mo`, 192, y + 7, { align: "right" })
    y += 14

    const tableRows = pod.roles.map(r => [
      r.roleLabel,
      String(r.count),
      `$${r.hourlyRate}/hr`,
      `$${(r.monthlyRate * r.count).toLocaleString()}/mo`,
    ])

    autoTable(doc, {
      startY: y,
      head: [["Role", "Count", "Rate", "Monthly Cost"]],
      body: tableRows,
      theme: "grid",
      headStyles: { fillColor: [...COLORS.teal], textColor: [...COLORS.white], fontStyle: "bold", fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: [...COLORS.darkGray] },
      alternateRowStyles: { fillColor: [...COLORS.lightGray] },
      columnStyles: { 0: { cellWidth: 85 }, 1: { cellWidth: 20, halign: "center" }, 2: { cellWidth: 35, halign: "right" }, 3: { cellWidth: 42, halign: "right" } },
      margin: { left: 14, right: 14 },
    })
    y = (doc as DocWithAutoTable).lastAutoTable.finalY + 8
  })

  // ── 90-DAY TIMELINE ────────────────────────────────────────────
  ;({ y, pageNum } = checkPage(doc, y, pageNum, propTitle))
  if (y > 24) y += 4
  y = addSectionTitle(doc, "90-Day Deployment & Execution Plan", y)

  autoTable(doc, {
    startY: y,
    head: [["Phase", "Activity"]],
    body: [
      ["Day 1–3", "Role intake & requirements alignment"],
      ["Day 4–7", "Candidate sourcing & screening"],
      ["Day 8–10", "Interviews & client selection"],
      ["Day 10–14", "Onboarding & CRM / portal setup"],
      ["Day 14+", "Pod goes live — KPIs activated"],
      ["Day 30", "Scale review: add roles or additional pods"],
      ["Day 60–90", "Full execution at velocity — pipeline, output, reporting"],
    ],
    theme: "striped",
    headStyles: { fillColor: [...COLORS.navy], textColor: [...COLORS.white], fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: [...COLORS.darkGray] },
    alternateRowStyles: { fillColor: [...COLORS.lightGray] },
    columnStyles: { 0: { cellWidth: 35, fontStyle: "bold" } },
    margin: { left: 14, right: 14 },
  })
  y = (doc as DocWithAutoTable).lastAutoTable.finalY + 8

  if (ai.successMetrics) {
    ;({ y, pageNum } = checkPage(doc, y, pageNum, propTitle))
    if (y > 24) y += 4
    y = addSectionTitle(doc, "Success Metrics & KPIs", y)
    const smLines = doc.splitTextToSize(ai.successMetrics, 182)
    doc.setFontSize(9)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(...COLORS.darkGray)
    doc.text(smLines, 14, y)
    y += smLines.length * 5 + 8
  }

  // ── COMMERCIAL MODEL / PRICING ─────────────────────────────────
  ;({ y, pageNum } = checkPage(doc, y, pageNum, propTitle))
  if (y > 24) y += 4
  y = addSectionTitle(doc, "Commercial Model", y)

  const pricingRows: string[][] = []
  let totalMonthly = 0
  input.pods.forEach((pod, i) => {
    const podMonthly = pod.roles.reduce((s, r) => s + r.monthlyRate * r.count, 0)
    totalMonthly += podMonthly
    const pricingPodLabel = pod.name ? `Pod ${i + 1}: ${pod.name}` : `Pod ${i + 1}`
    pricingRows.push([pricingPodLabel, pod.roles.map(r => `${r.count}x ${r.roleLabel}`).join(", "), `$${podMonthly.toLocaleString()}/mo`])
  })

  autoTable(doc, {
    startY: y,
    head: [["Pod", "Composition", "Monthly Cost"]],
    body: pricingRows,
    foot: [["", "TOTAL MONTHLY INVESTMENT", `$${totalMonthly.toLocaleString()}/mo`]],
    theme: "grid",
    headStyles: { fillColor: [...COLORS.teal], textColor: [...COLORS.white], fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: [...COLORS.darkGray] },
    footStyles: { fillColor: [...COLORS.navy], textColor: [...COLORS.white], fontStyle: "bold", fontSize: 10 },
    alternateRowStyles: { fillColor: [...COLORS.lightGray] },
    columnStyles: { 0: { cellWidth: 45 }, 1: { cellWidth: 100 }, 2: { cellWidth: 37, halign: "right" } },
    margin: { left: 14, right: 14 },
  })
  y = (doc as DocWithAutoTable).lastAutoTable.finalY + 8

  ;({ y, pageNum } = checkPage(doc, y, pageNum, propTitle))
  const usEquivalent = Math.round(totalMonthly * 3.5)
  const halfW = 88

  doc.setFillColor(...COLORS.lightRed)
  doc.roundedRect(14, y, halfW, 24, 2, 2, "F")
  doc.setFontSize(7.5)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...COLORS.red)
  doc.text("US IN-HOUSE EQUIVALENT", 14 + halfW / 2, y + 6, { align: "center" })
  doc.setFontSize(14)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...COLORS.red)
  doc.text(`~$${usEquivalent.toLocaleString()}/mo`, 14 + halfW / 2, y + 16, { align: "center" })
  doc.setFontSize(7)
  doc.setFont("helvetica", "normal")
  doc.text("+ benefits, overhead, 60-90 day ramp", 14 + halfW / 2, y + 22, { align: "center" })

  doc.setFillColor(...COLORS.lightTeal)
  doc.roundedRect(14 + halfW + 6, y, halfW, 24, 2, 2, "F")
  doc.setFontSize(7.5)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...COLORS.teal)
  doc.text("BINARYNEXT", 14 + halfW + 6 + halfW / 2, y + 6, { align: "center" })
  doc.setFontSize(14)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(15, 118, 110)
  doc.text(`$${totalMonthly.toLocaleString()}/mo`, 14 + halfW + 6 + halfW / 2, y + 16, { align: "center" })
  doc.setFontSize(7)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(...COLORS.gray)
  doc.text("Live in 3-5 days · instant replacement", 14 + halfW + 6 + halfW / 2, y + 22, { align: "center" })
  y += 30

  // ── WHY HARD TO REFUSE ─────────────────────────────────────────
  if (ai.whyHardToRefuse?.length > 0) {
    ;({ y, pageNum } = checkPage(doc, y, pageNum, propTitle))
    if (y > 24) y += 4
    y = addSectionTitle(doc, "Why This Is Hard to Refuse", y)
    ai.whyHardToRefuse.forEach(point => {
      ;({ y, pageNum } = checkPage(doc, y, pageNum, propTitle))
      doc.setFillColor(...COLORS.lightTeal)
      const ptLines = doc.splitTextToSize(point, 168)
      const boxH = ptLines.length * 5 + 10
      doc.roundedRect(14, y, 182, boxH, 2, 2, "F")
      doc.setFillColor(...COLORS.teal)
      doc.rect(14, y, 3, boxH, "F")
      doc.setFontSize(9)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(...COLORS.navy)
      doc.text(ptLines, 22, y + 7)
      y += boxH + 4
    })
    y += 4
  }

  // ── ENGAGEMENT + NEXT STEPS ────────────────────────────────────
  ;({ y, pageNum } = checkPage(doc, y, pageNum, propTitle))
  if (y > 24) y += 4
  y = addSectionTitle(doc, "Engagement Model & Next Steps", y)

  autoTable(doc, {
    startY: y,
    body: [
      ["Commitment", "Month-to-month — cancel anytime, no penalties"],
      ["Reporting", "Daily dashboards + weekly strategy sync"],
      ["Integration", "Embeds into your CRM, Slack, and tech stack"],
      ["KPIs", "Clear, agreed KPIs from day one"],
      ["Replacement", "Instant replacement guarantee on all roles"],
    ],
    theme: "plain",
    bodyStyles: { fontSize: 9, textColor: [...COLORS.darkGray], cellPadding: 4 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 40, textColor: [...COLORS.navy] }, 1: { cellWidth: 142 } },
    margin: { left: 14, right: 14 },
  })
  y = (doc as DocWithAutoTable).lastAutoTable.finalY + 8

  doc.setFontSize(11)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...COLORS.navy)
  doc.text("Next Steps", 14, y)
  y += 8

  const nextSteps = ["Confirm ICP, roles, and pod composition", "Sign engagement letter (1-page)", "2–3 day onboarding & CRM setup", "Pod goes live — KPIs activated", "Weekly pipeline reviews begin"]
  nextSteps.forEach((step, i) => {
    doc.setFontSize(9)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(...COLORS.darkGray)
    doc.setFillColor(...COLORS.teal)
    doc.circle(17, y - 1.5, 1.5, "F")
    doc.text(`${i + 1}. ${step}`, 22, y)
    y += 8
  })

  y += 8
  ;({ y, pageNum } = checkPage(doc, y, pageNum, propTitle))
  const closing = ai.closingStatement || `The question for ${clientName} isn't whether you need this capacity — it's whether you build it the expensive way or the smart way.`
  doc.setFontSize(9)
  const closingLines = doc.splitTextToSize(closing, 172)
  const closingBoxH = closingLines.length * 5.5 + 12
  doc.setFillColor(...COLORS.navy)
  doc.rect(14, y, 182, closingBoxH, "F")
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...COLORS.white)
  doc.text(closingLines, 105, y + 8, { align: "center" })
  y += closingBoxH + 5
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(...COLORS.teal)
  doc.text("www.binarynext.io  |  operations@binarynext.io  |  Syed Bokhari / BinaryNext", 105, y, { align: "center" })

  const fileName = `BinaryNext_Proposal_${clientName.replace(/\s+/g, "_")}_${format(new Date(), "yyyy-MM-dd")}.pdf`
  doc.save(fileName)
}
