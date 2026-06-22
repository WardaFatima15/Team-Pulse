import { redirect } from "next/navigation"
import { getEmployeeSession } from "@/lib/employee-auth"
import { getTasks } from "@/lib/task-actions"
import TasksClient from "./TasksClient"

export default async function EmployeeTasksPage() {
  const emp = await getEmployeeSession()
  if (!emp) redirect("/login")
  const tasks = await getTasks(undefined, emp.id)
  return <TasksClient tasks={tasks} />
}
