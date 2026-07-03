import ExcelJS from "exceljs"

export type ParsedLeadRow = {
  name: string
  company: string
  email: string
  phone: string
  value: number
  stage: string
  source: string
  notes: string
}

const VALID_STAGES = new Set(["new", "contacted", "qualified", "proposal", "won", "lost"])

// Recognized header spellings per field, matched case/space/punctuation-insensitively.
const HEADER_SYNONYMS: Record<keyof ParsedLeadRow, string[]> = {
  name: ["name", "contact", "contactname", "fullname", "lead", "leadname"],
  company: ["company", "account", "organization", "organisation", "business"],
  email: ["email", "emailaddress"],
  phone: ["phone", "phonenumber", "mobile", "contactnumber", "tel"],
  value: ["value", "dealvalue", "amount", "dealsize", "revenue", "price"],
  stage: ["stage", "status", "pipelinestage"],
  source: ["source", "leadsource", "channel"],
  notes: ["notes", "note", "description", "comments", "remarks"],
}

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, "")
}

function buildColumnMap(headerRow: string[]): Partial<Record<keyof ParsedLeadRow, number>> {
  const normalized = headerRow.map(normalizeHeader)
  const map: Partial<Record<keyof ParsedLeadRow, number>> = {}
  for (const field of Object.keys(HEADER_SYNONYMS) as (keyof ParsedLeadRow)[]) {
    const idx = normalized.findIndex(h => HEADER_SYNONYMS[field].includes(h))
    if (idx !== -1) map[field] = idx
  }
  return map
}

function cellText(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return ""
  if (typeof v === "object" && "text" in v) return String((v as { text: unknown }).text ?? "")
  if (typeof v === "object" && "result" in v) return String((v as { result: unknown }).result ?? "")
  return String(v).trim()
}

function parseMoney(s: string): number {
  const n = parseFloat(s.replace(/[^0-9.\-]/g, ""))
  return Number.isFinite(n) ? n : 0
}

// Minimal CSV parser — handles quoted fields with embedded commas.
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else { inQuotes = false }
      } else field += c
    } else if (c === '"') inQuotes = true
    else if (c === ",") { row.push(field); field = "" }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++
      row.push(field); field = ""
      if (row.some(f => f !== "")) rows.push(row)
      row = []
    } else field += c
  }
  if (field !== "" || row.length > 0) { row.push(field); rows.push(row) }
  return rows
}

const MAX_ROWS = 500

export async function parseLeadsFile(buffer: Buffer, filename: string): Promise<{ rows: ParsedLeadRow[]; totalDataRows: number }> {
  const isCsv = filename.toLowerCase().endsWith(".csv")

  let rawRows: string[][]
  if (isCsv) {
    rawRows = parseCsv(buffer.toString("utf-8"))
  } else {
    const workbook = new ExcelJS.Workbook()
    // exceljs depends on fast-csv, which bundles its own older @types/node —
    // that nested Buffer declaration conflicts with this project's, even
    // though both are the same real Node Buffer at runtime. `any` sidesteps
    // the version-skewed ambient type collision.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await workbook.xlsx.load(buffer as any)
    const sheet = workbook.worksheets[0]
    if (!sheet) throw new Error("No worksheet found in file")
    rawRows = []
    sheet.eachRow(row => {
      const cells: string[] = []
      row.eachCell({ includeEmpty: true }, cell => { cells.push(cellText(cell.value)) })
      rawRows.push(cells)
    })
  }

  if (rawRows.length === 0) throw new Error("File is empty")
  const [headerRow, ...dataRows] = rawRows
  const colMap = buildColumnMap(headerRow)
  if (colMap.name === undefined) {
    throw new Error(`Couldn't find a "Name" column. Found headers: ${headerRow.filter(Boolean).join(", ") || "(none)"}`)
  }

  const totalDataRows = dataRows.filter(r => r.some(c => c && c.trim())).length

  const rows: ParsedLeadRow[] = []
  for (const r of dataRows) {
    if (rows.length >= MAX_ROWS) break
    const get = (field: keyof ParsedLeadRow): string => (colMap[field] !== undefined ? (r[colMap[field]!] ?? "").trim() : "")
    const name = get("name")
    if (!name) continue
    const stageRaw = get("stage").toLowerCase()
    rows.push({
      name,
      company: get("company"),
      email: get("email"),
      phone: get("phone"),
      value: get("value") ? parseMoney(get("value")) : 0,
      stage: VALID_STAGES.has(stageRaw) ? stageRaw : "new",
      source: get("source"),
      notes: get("notes"),
    })
  }

  return { rows, totalDataRows }
}
