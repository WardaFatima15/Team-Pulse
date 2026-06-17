import { queryAll } from "@/lib/db"
import LeavesClient from "./LeavesClient"

type Employee = { id: string; name: string; avatar: string; role: string; department: string }
type LeaveRequest = { id: string; employeeId: string; type: string; startDate: string; endDate: string; days: number; reason: string; status: string; appliedOn: string }

export default async function LeavesPage() {
  const [leaves, employees] = await Promise.all([
    queryAll<LeaveRequest>(`SELECT * FROM "LeaveRequest" ORDER BY "createdAt" DESC`),
    queryAll<Employee>(`SELECT id, name, avatar, role, department FROM "Employee"`),
  ])
  return <LeavesClient leaves={leaves} employees={employees} />
}
