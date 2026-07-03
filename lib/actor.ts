import { getAdminSession } from "@/lib/admin-auth"
import { getEmployeeSession } from "@/lib/employee-auth"

export type Actor = { id: string; name: string; organizationId: string; isAdmin: boolean }

// Resolves whichever session type is logged in — used by shared features
// (like the sales pipeline) that both admins and employees can act on.
export async function getActor(): Promise<Actor | null> {
  const admin = await getAdminSession()
  if (admin) return { id: admin.id, name: admin.name, organizationId: admin.organizationId, isAdmin: true }
  const emp = await getEmployeeSession()
  if (emp) return { id: emp.id, name: emp.name, organizationId: emp.organizationId, isAdmin: false }
  return null
}
