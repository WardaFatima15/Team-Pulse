import { queryAll } from "@/lib/db"
import ReportsClient from "./ReportsClient"

export default async function ReportsPage() {
  const employees = await queryAll<{
    id: string; name: string; role: string; department: string; avatar: string; status: string
  }>(`SELECT id, name, role, department, avatar, status FROM "Employee" ORDER BY name`)

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Daily Reports</h1>
        <p className="text-slate-500 text-sm mt-1">AI-generated daily summaries based on each employee's activity</p>
      </div>
      <ReportsClient employees={employees} />
    </div>
  )
}
