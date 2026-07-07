"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Upload, X, Loader2, FileSpreadsheet, AlertCircle, CheckCircle2, Link2 } from "lucide-react"
import { bulkCreateLeads } from "@/lib/lead-actions"

type ParsedRow = {
  name: string; company: string; email: string; phone: string
  value: number; stage: string; source: string; notes: string
  customFields: Record<string, string>
}

export default function ImportLeadsModal({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const fileInput = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<"file" | "sheet">("file")
  const [parsing, setParsing] = useState(false)
  const [importing, startImport] = useTransition()
  const [error, setError] = useState("")
  const [fileName, setFileName] = useState("")
  const [sheetUrl, setSheetUrl] = useState("")
  const [rows, setRows] = useState<ParsedRow[] | null>(null)
  const [skipped, setSkipped] = useState(0)
  const [done, setDone] = useState(0)

  async function handleFile(file: File) {
    setError("")
    setRows(null)
    setFileName(file.name)
    setParsing(true)
    try {
      const form = new FormData()
      form.append("file", file)
      const res = await fetch("/api/pipeline/import", { method: "POST", body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Couldn't read that file")
      if (data.rows.length === 0) throw new Error("No usable rows found — make sure there's a Name column with values.")
      setRows(data.rows)
      setSkipped(data.skipped ?? 0)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setParsing(false)
    }
  }

  async function handleGoogleSheet() {
    if (!sheetUrl.trim()) return
    setError("")
    setRows(null)
    setFileName("Google Sheet")
    setParsing(true)
    try {
      const res = await fetch("/api/pipeline/import/google-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: sheetUrl.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Couldn't read that sheet")
      if (data.rows.length === 0) throw new Error("No usable rows found — make sure there's a Name column with values.")
      setRows(data.rows)
      setSkipped(data.skipped ?? 0)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setParsing(false)
    }
  }

  function handleImport() {
    if (!rows) return
    startImport(async () => {
      const res = await bulkCreateLeads(rows)
      setDone(res.imported)
      router.refresh()
    })
  }

  if (done > 0) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-[#131318] border border-white/10 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center" onClick={e => e.stopPropagation()}>
          <CheckCircle2 className="size-10 text-green-400 mx-auto mb-3" />
          <p className="text-white font-semibold">Imported {done} lead{done !== 1 ? "s" : ""}</p>
          <p className="text-white/50 text-sm mt-1">They&apos;re now on the pipeline board.</p>
          <Button onClick={onClose} className="mt-5 w-full bg-[#512feb] hover:bg-[#3f1fd4] text-white">Done</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#131318] border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <h2 className="font-semibold text-white">Import Leads</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X className="size-4" /></button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {!rows && (
            <>
              <div className="flex gap-1.5 bg-white/5 rounded-lg p-1">
                <button
                  onClick={() => { setMode("file"); setError("") }}
                  className={`flex-1 text-xs font-medium rounded-md py-1.5 transition-colors ${mode === "file" ? "bg-[#512feb] text-white" : "text-white/50 hover:text-white/80"}`}
                >
                  File
                </button>
                <button
                  onClick={() => { setMode("sheet"); setError("") }}
                  className={`flex-1 text-xs font-medium rounded-md py-1.5 transition-colors ${mode === "sheet" ? "bg-[#512feb] text-white" : "text-white/50 hover:text-white/80"}`}
                >
                  Google Sheet
                </button>
              </div>

              {mode === "file" && (
                <>
                  <input
                    ref={fileInput}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
                  />
                  <button
                    onClick={() => fileInput.current?.click()}
                    disabled={parsing}
                    className="w-full border-2 border-dashed border-white/15 rounded-xl py-10 flex flex-col items-center gap-2.5 hover:border-[#512feb]/50 hover:bg-[#512feb]/5 transition-colors disabled:opacity-50"
                  >
                    {parsing ? (
                      <Loader2 className="size-7 text-[#7c5af5] animate-spin" />
                    ) : (
                      <Upload className="size-7 text-white/30" />
                    )}
                    <div className="text-sm text-white/70 font-medium">{parsing ? `Reading ${fileName}…` : "Click to choose a file"}</div>
                    <p className="text-xs text-white/35">.xlsx or .csv — any column layout works</p>
                  </button>
                </>
              )}

              {mode === "sheet" && (
                <div className="border-2 border-dashed border-white/15 rounded-xl p-6 flex flex-col items-center gap-3">
                  <Link2 className="size-7 text-white/30" />
                  <input
                    type="url"
                    value={sheetUrl}
                    onChange={e => setSheetUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    disabled={parsing}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#512feb]/50 disabled:opacity-50"
                  />
                  <Button
                    size="sm"
                    onClick={handleGoogleSheet}
                    disabled={parsing || !sheetUrl.trim()}
                    className="w-full bg-[#512feb] hover:bg-[#3f1fd4] text-white"
                  >
                    {parsing ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : null}
                    {parsing ? "Fetching…" : "Fetch sheet"}
                  </Button>
                  <p className="text-xs text-white/35 text-center">
                    Set sharing to &ldquo;Anyone with the link can view&rdquo; first — this reads the sheet without asking you to sign in.
                  </p>
                </div>
              )}

              <p className="text-xs text-white/35">
                Recognizes Name, Company, Email, Phone, Value, Stage, Source, Notes columns in any order or spelling.
                Any other column is kept too — saved as extra details on each lead so nothing gets lost.
              </p>
            </>
          )}

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 flex items-start gap-1.5">
              <AlertCircle className="size-3.5 shrink-0 mt-0.5" /> {error}
            </p>
          )}

          {rows && (
            <>
              <div className="flex items-center gap-2 text-sm text-white/80">
                <FileSpreadsheet className="size-4 text-[#7c5af5]" />
                <span className="font-medium">{fileName}</span>
                <span className="text-white/40">— {rows.length} lead{rows.length !== 1 ? "s" : ""} ready to import{skipped > 0 ? `, ${skipped} row${skipped !== 1 ? "s" : ""} skipped` : ""}</span>
              </div>
              <div className="border border-white/10 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/10">
                      <th className="text-left font-medium text-white/50 px-3 py-2">Name</th>
                      <th className="text-left font-medium text-white/50 px-3 py-2">Company</th>
                      <th className="text-right font-medium text-white/50 px-3 py-2">Value</th>
                      <th className="text-left font-medium text-white/50 px-3 py-2">Stage</th>
                      <th className="text-left font-medium text-white/50 px-3 py-2">Other fields</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {rows.slice(0, 8).map((r, i) => {
                      const extraKeys = Object.keys(r.customFields)
                      return (
                        <tr key={i}>
                          <td className="px-3 py-1.5 text-white/80 truncate max-w-[140px]">{r.name}</td>
                          <td className="px-3 py-1.5 text-white/50 truncate max-w-[120px]">{r.company || "—"}</td>
                          <td className="px-3 py-1.5 text-white/70 text-right">{r.value ? `$${r.value}` : "—"}</td>
                          <td className="px-3 py-1.5 text-white/50 capitalize">{r.stage}</td>
                          <td className="px-3 py-1.5 text-white/40">
                            {extraKeys.length > 0 ? `${extraKeys.length} field${extraKeys.length !== 1 ? "s" : ""}` : "—"}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {rows.length > 8 && (
                  <p className="text-xs text-white/35 text-center py-1.5 border-t border-white/10">…and {rows.length - 8} more</p>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-3 px-5 py-4 border-t border-white/10 shrink-0">
          {rows && (
            <button onClick={() => { setRows(null); setError("") }} disabled={importing}
              className="text-xs text-white/50 hover:text-white/80 mr-auto">Choose a different file</button>
          )}
          <Button variant="outline" size="sm" onClick={onClose} disabled={importing} className="border-white/10 text-white/70 hover:bg-white/5">Cancel</Button>
          {rows && (
            <Button size="sm" onClick={handleImport} disabled={importing} className="bg-[#512feb] hover:bg-[#3f1fd4] text-white">
              {importing ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : null}
              Import {rows.length} lead{rows.length !== 1 ? "s" : ""}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
