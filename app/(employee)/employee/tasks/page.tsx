import { redirect } from "next/navigation"
import { getEmployeeSession } from "@/lib/employee-auth"
import TasksClient from "./TasksClient"

export default async function EmployeeTasksPage() {
  const emp = await getEmployeeSession()
  if (!emp) redirect("/login")
  return <TasksClient jiraAccountId={emp.jiraAccountId ?? ""} />
}
