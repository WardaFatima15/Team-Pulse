import { db, serialize } from "@/lib/db"
import EmployeesClient from "./EmployeesClient"

export default function EmployeesPage() {
  const employees = serialize(db.prepare("SELECT * FROM Employee ORDER BY name").all() as {
    id: string; name: string; email: string; role: string; department: string
    avatar: string; status: string; location: string; phone: string
  }[])
  return <EmployeesClient employees={employees} />
}
