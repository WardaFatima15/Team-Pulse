import { queryAll } from "@/lib/db"
import { getAdminSession } from "@/lib/admin-auth"
import ApprovalsClient from "./ApprovalsClient"

type Employee = { id: string; name: string; avatar: string; role: string; department: string }
type LeaveRequest = { id: string; employeeId: string; type: string; startDate: string; endDate: string; days: number; reason: string; status: string; createdAt: string }
type Ticket = { id: string; employeeId: string; title: string; description: string; priority: string; status: string; createdAt: string }

export default async function ApprovalsPage() {
  const admin = await getAdminSession()
  const orgId = admin!.organizationId

  const [employees, pendingLeaves, openTickets] = await Promise.all([
    queryAll<Employee>(`SELECT id, name, avatar, role, department FROM "Employee" WHERE "organizationId" = $1 ORDER BY name`, [orgId]),
    queryAll<LeaveRequest>(`SELECT l.* FROM "LeaveRequest" l JOIN "Employee" e ON e.id = l."employeeId" WHERE e."organizationId" = $1 AND l.status = 'pending' ORDER BY l."createdAt" DESC`, [orgId]),
    queryAll<Ticket>(`SELECT t.* FROM "Ticket" t JOIN "Employee" e ON e.id = t."employeeId" WHERE e."organizationId" = $1 AND t.status != 'resolved' ORDER BY t."createdAt" DESC`, [orgId]),
  ])

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Approvals Inbox</h1>
          <p className="text-white/60 text-sm mt-0.5">All pending actions in one place</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {(pendingLeaves.length + openTickets.filter(t => t.status === "open").length) > 0 ? (
            <span className="bg-red-500/15 text-red-400 px-3 py-1 rounded-full font-medium text-xs border border-red-500/20">
              {pendingLeaves.length + openTickets.filter(t => t.status === "open").length} need attention
            </span>
          ) : (
            <span className="bg-green-500/15 text-green-400 px-3 py-1 rounded-full font-medium text-xs border border-green-500/20">All caught up!</span>
          )}
        </div>
      </div>
      <ApprovalsClient pendingLeaves={pendingLeaves} openTickets={openTickets} employees={employees} />
    </div>
  )
}
