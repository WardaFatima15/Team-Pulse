import { getProjects, getTasks } from "@/lib/task-actions"
import { queryAll } from "@/lib/db"
import { getAdminSession } from "@/lib/admin-auth"
import TasksBoard from "./TasksBoard"

export default async function TasksPage() {
  const admin = await getAdminSession()
  const orgId = admin!.organizationId

  const [projects, tasks, employees] = await Promise.all([
    getProjects(),
    getTasks(),
    queryAll<{ id: string; name: string; avatar: string; department: string }>(
      `SELECT id, name, avatar, department FROM "Employee" WHERE "organizationId" = $1 ORDER BY name`, [orgId]
    ),
  ])

  return (
    <div className="max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Tasks</h1>
        <p className="text-white/50 text-sm mt-1">Manage projects and track team tasks</p>
      </div>
      <TasksBoard projects={projects} tasks={tasks} employees={employees} />
    </div>
  )
}
