import { db, serialize } from "@/lib/db"
import LeavesClient from "./LeavesClient"

type Employee = { id: string; name: string; avatar: string; role: string; department: string }
type LeaveRequest = { id: string; employeeId: string; type: string; startDate: string; endDate: string; days: number; reason: string; status: string; appliedOn: string }

export default function LeavesPage() {
  const leaves = serialize(db.prepare("SELECT * FROM LeaveRequest ORDER BY createdAt DESC").all() as LeaveRequest[])
  const employees = serialize(db.prepare("SELECT id, name, avatar, role, department FROM Employee").all() as Employee[])
  return <LeavesClient leaves={leaves} employees={employees} />
}
