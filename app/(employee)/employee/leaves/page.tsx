import { redirect } from "next/navigation"
import { getEmployeeSession } from "@/lib/employee-auth"
import { queryAll } from "@/lib/db"
import LeavesClient from "./LeavesClient"

type LeaveRequest = {
  id: string; type: string; startDate: string; endDate: string
  days: number; reason: string; status: string; appliedOn: string
}

export default async function EmployeeLeavesPage() {
  const emp = await getEmployeeSession()
  if (!emp) redirect("/login")

  const leaves = await queryAll<LeaveRequest>(
    `SELECT * FROM "LeaveRequest" WHERE "employeeId" = $1 ORDER BY "createdAt" DESC`,
    [emp.id]
  )

  return <LeavesClient leaves={leaves} />
}
