import ExcelJS from "exceljs"
import JSZip from "jszip"
import { XMLParser } from "fast-xml-parser"

export type ParsedLeadRow = {
  name: string
  company: string
  email: string
  phone: string
  value: number
  stage: string
  source: string
  notes: string
  customFields: Record<string, string>
}

// The fixed set of fields we recognize by header name. Any column that
// doesn't match one of these is preserved as a custom field instead of
// being dropped — different lead lists never share the same columns.
type MappableField = "name" | "company" | "email" | "phone" | "value" | "stage" | "source" | "notes"

const VALID_STAGES = new Set(["new", "contacted", "qualified", "proposal", "won", "lost"])

// Recognized header spellings per field, matched case/space/punctuation-insensitively.
const HEADER_SYNONYMS: Record<MappableField, string[]> = {
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

function buildColumnMap(headerRow: string[]): Partial<Record<MappableField, number>> {
  const normalized = headerRow.map(normalizeHeader)
  const map: Partial<Record<MappableField, number>> = {}
  const fields = Object.keys(HEADER_SYNONYMS) as MappableField[]

  // Pass 1: exact match — safest, e.g. a column literally titled "Name".
  for (const field of fields) {
    const idx = normalized.findIndex(h => HEADER_SYNONYMS[field].includes(h))
    if (idx !== -1) map[field] = idx
  }
  // Pass 2: substring match for anything still unmapped — handles compound
  // real-world headers like "Company / Org" or "Source URL" that don't
  // exactly equal a synonym but clearly contain one. Run as a second pass
  // (not merged into pass 1) so a short/ambiguous token like "lead" can't
  // steal a column away from an exact match found elsewhere in the row.
  for (const field of fields) {
    if (map[field] !== undefined) continue
    const idx = normalized.findIndex(h => h && HEADER_SYNONYMS[field].some(syn => h.includes(syn)))
    if (idx !== -1) map[field] = idx
  }
  return map
}

// Real spreadsheets often have a title banner, a "Prepared for..." line, and
// blank spacer rows before the actual header row (exactly what tripped this
// up originally) — so the header can't be assumed to be row 1. Scan the
// first few rows and pick whichever one most looks like a header: several
// short, distinct cells that match known field synonyms. A title/banner row
// is typically one long merged cell (fails the min-cell-count gate below);
// data rows are long free text that rarely score well against short synonym
// tokens.
const MAX_HEADER_SCAN_ROWS = 15
const MIN_HEADER_CELLS = 3

function findHeaderRowIndex(rows: string[][]): number {
  let bestIdx = 0
  let bestScore = 0
  for (let i = 0; i < Math.min(rows.length, MAX_HEADER_SCAN_ROWS); i++) {
    const row = rows[i]
    const nonEmptyCells = row.filter(c => c && c.trim()).length
    if (nonEmptyCells < MIN_HEADER_CELLS) continue
    const score = Object.keys(buildColumnMap(row)).length
    if (score > bestScore) { bestScore = score; bestIdx = i }
  }
  return bestIdx
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

// ── Raw OOXML fallback reader ────────────────────────────────────────────
// exceljs's SAX-based parser can silently produce an unusable model for some
// real-world .xlsx exports (namespace variations from certain Excel/Google
// Sheets/LibreOffice versions). An .xlsx is just a zip of well-documented XML
// files, so when exceljs chokes, we read the raw OOXML directly with a
// generic, tolerant XML parser instead of exceljs's hand-rolled event matcher.

const rawXmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", removeNSPrefix: true, parseTagValue: false })

// Parsed XML nodes are inherently untyped (fast-xml-parser returns whatever
// shape the document happens to have), so this accepts `unknown` rather than
// forcing a cast at every call site.
function toArray<T>(v: unknown): T[] {
  if (v === undefined || v === null) return []
  return Array.isArray(v) ? (v as T[]) : [v as T]
}

function textOf(v: unknown): string {
  if (v === undefined || v === null) return ""
  if (typeof v === "object") return String((v as Record<string, unknown>)["#text"] ?? "")
  return String(v)
}

function colLetterToIndex(ref: string): number {
  const letters = ref.match(/^[A-Za-z]+/)?.[0] ?? ""
  let idx = 0
  for (const ch of letters.toUpperCase()) idx = idx * 26 + (ch.charCodeAt(0) - 64)
  return Math.max(0, idx - 1)
}

function parseSharedStrings(xml: string | undefined): string[] {
  if (!xml) return []
  const parsed = rawXmlParser.parse(xml)
  const siList = toArray<Record<string, unknown>>(parsed?.sst?.si)
  return siList.map(si => {
    if (si === undefined || si === null) return ""
    if (si.t !== undefined) return textOf(si.t)
    // Rich text runs: <si><r><t>Hello</t></r><r><t> World</t></r></si>
    return toArray<Record<string, unknown>>(si.r).map(r => textOf(r?.t)).join("")
  })
}

async function parseXlsxRaw(buffer: Buffer): Promise<string[][]> {
  const zip = await JSZip.loadAsync(buffer)

  const workbookXmlText = await zip.file("xl/workbook.xml")?.async("string")
  if (!workbookXmlText) throw new Error("Not a valid .xlsx file — missing workbook.xml")
  const workbookXml = rawXmlParser.parse(workbookXmlText)
  const sheets = toArray<Record<string, unknown>>(workbookXml?.workbook?.sheets?.sheet)
  if (sheets.length === 0) throw new Error("No sheets found in workbook")
  const relId = sheets[0]["@_id"] as string | undefined

  let sheetPath = "xl/worksheets/sheet1.xml" // reasonable default if rels lookup fails
  const relsXmlText = await zip.file("xl/_rels/workbook.xml.rels")?.async("string")
  if (relsXmlText && relId) {
    const relsXml = rawXmlParser.parse(relsXmlText)
    const rels = toArray<Record<string, unknown>>(relsXml?.Relationships?.Relationship)
    const match = rels.find(r => r["@_Id"] === relId)
    const target = match?.["@_Target"] as string | undefined
    if (target) sheetPath = target.startsWith("/") ? target.slice(1) : `xl/${target}`
  }

  const sheetXmlText = await zip.file(sheetPath)?.async("string")
  if (!sheetXmlText) throw new Error(`Couldn't find sheet data at ${sheetPath}`)
  const sheetXml = rawXmlParser.parse(sheetXmlText)

  const sharedStrings = parseSharedStrings(await zip.file("xl/sharedStrings.xml")?.async("string"))

  const rowEls = toArray<Record<string, unknown>>(sheetXml?.worksheet?.sheetData?.row)
  const rows: string[][] = []
  for (const rowEl of rowEls) {
    const row: string[] = []
    for (const cellEl of toArray<Record<string, unknown>>(rowEl?.c)) {
      const ref = String(cellEl?.["@_r"] ?? "")
      const idx = ref ? colLetterToIndex(ref) : row.length
      while (row.length < idx) row.push("")
      const type = cellEl?.["@_t"] as string | undefined
      let value = ""
      if (type === "s") {
        const si = parseInt(textOf(cellEl?.v), 10)
        value = Number.isFinite(si) ? (sharedStrings[si] ?? "") : ""
      } else if (type === "inlineStr") {
        value = textOf((cellEl?.is as Record<string, unknown> | undefined)?.t)
      } else if (type === "b") {
        value = textOf(cellEl?.v) === "1" ? "TRUE" : "FALSE"
      } else {
        value = textOf(cellEl?.v)
      }
      row[idx] = value
    }
    rows.push(row)
  }
  return rows
}

const MAX_ROWS = 500

export async function parseLeadsFile(buffer: Buffer, filename: string): Promise<{ rows: ParsedLeadRow[]; totalDataRows: number }> {
  const isCsv = filename.toLowerCase().endsWith(".csv")

  let rawRows: string[][]
  if (isCsv) {
    rawRows = parseCsv(buffer.toString("utf-8"))
  } else {
    try {
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
    } catch {
      try {
        rawRows = await parseXlsxRaw(buffer)
      } catch {
        throw new Error("Couldn't read this .xlsx file. Try re-saving it as a plain .xlsx from Excel, or exporting/saving as .csv instead (CSV always works).")
      }
    }
  }

  if (rawRows.length === 0) throw new Error("File is empty")
  const headerIdx = findHeaderRowIndex(rawRows)
  const headerRow = rawRows[headerIdx]
  const dataRows = rawRows.slice(headerIdx + 1)
  const colMap = buildColumnMap(headerRow)
  // No recognizable "Name" header (e.g. it's called "Lead", "Client", or the
  // sheet has no header row at all) — fall back to the first column. Every
  // lead list has SOME primary identifying column, and it's virtually always
  // the leftmost one, so this lets any layout import instead of failing.
  if (colMap.name === undefined) colMap.name = 0

  const totalDataRows = dataRows.filter(r => r.some(c => c && c.trim())).length

  // Any header column not claimed by a recognized field becomes a custom
  // field, keyed by its original (non-normalized) header text — so nothing
  // from the source spreadsheet is ever silently dropped.
  const claimedIndexes = new Set(Object.values(colMap))
  const extraColumns = headerRow
    .map((label, idx) => ({ label: label.trim(), idx }))
    .filter(c => c.label && !claimedIndexes.has(c.idx))

  const rows: ParsedLeadRow[] = []
  for (const r of dataRows) {
    if (rows.length >= MAX_ROWS) break
    const get = (field: MappableField): string => (colMap[field] !== undefined ? (r[colMap[field]!] ?? "").trim() : "")
    const name = get("name")
    if (!name) continue
    const stageRaw = get("stage").toLowerCase()

    const customFields: Record<string, string> = {}
    for (const col of extraColumns) {
      const v = (r[col.idx] ?? "").trim()
      if (v) customFields[col.label] = v
    }

    rows.push({
      name,
      company: get("company"),
      email: get("email"),
      phone: get("phone"),
      value: get("value") ? parseMoney(get("value")) : 0,
      stage: VALID_STAGES.has(stageRaw) ? stageRaw : "new",
      source: get("source"),
      notes: get("notes"),
      customFields,
    })
  }

  return { rows, totalDataRows }
}
