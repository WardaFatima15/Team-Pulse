import { redirect } from "next/navigation"
import { getEmployeeSession } from "@/lib/employee-auth"
import { db, serialize } from "@/lib/db"
import LeavesClient from "./LeavesClient"

type LeaveRequest = {
  id: string; type: string; startDate: string; endDate: string
  days: number; reason: string; status: string; appliedOn: string
}

export default async function EmployeeLeavesPage() {
  const emp = await getEmployeeSession()
  if (!emp) redirect("/login")

  const leaves = serialize(
    db.prepare("SELECT * FROM LeaveRequest WHERE employeeId = ? ORDER BY createdAt DESC").all(emp.id) as LeaveRequest[]
  )

  return <LeavesClient leaves={leaves} />
}
