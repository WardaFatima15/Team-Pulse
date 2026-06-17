import { queryAll } from "@/lib/db"
import EmployeesClient from "./EmployeesClient"

export default async function EmployeesPage() {
  const employees = await queryAll<{
    id: string; name: string; email: string; role: string; department: string
    avatar: string; status: string; location: string; phone: string
  }>(`SELECT * FROM "Employee" ORDER BY name`)
  return <EmployeesClient employees={employees} />
}
