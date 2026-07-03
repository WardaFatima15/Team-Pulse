import { Pool } from "@neondatabase/serverless"
import bcrypt from "bcryptjs"

const pool = new Pool({ connectionString: process.env.POSTGRES_URL })

export function serialize<T>(rows: T): T {
  return JSON.parse(JSON.stringify(rows))
}

let schemaReady: Promise<void> | null = null

async function setupSchema(): Promise<void> {
  const client = await pool.connect()
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Admin" (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        "passwordHash" TEXT NOT NULL,
        "createdAt" TEXT NOT NULL
      )
    `)
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Employee" (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        role TEXT NOT NULL,
        department TEXT NOT NULL,
        avatar TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'offline',
        phone TEXT NOT NULL DEFAULT '',
        location TEXT NOT NULL DEFAULT '',
        "jiraAccountId" TEXT NOT NULL DEFAULT '',
        "joinDate" TEXT NOT NULL DEFAULT '',
        "createdAt" TEXT NOT NULL,
        "passwordHash" TEXT NOT NULL DEFAULT ''
      )
    `)
    await client.query(`
      CREATE TABLE IF NOT EXISTS "TimeRecord" (
        id TEXT PRIMARY KEY,
        "employeeId" TEXT NOT NULL REFERENCES "Employee"(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        "clockIn" TEXT NOT NULL,
        "clockOut" TEXT,
        hours REAL NOT NULL DEFAULT 0,
        notes TEXT NOT NULL DEFAULT '',
        "createdAt" TEXT NOT NULL
      )
    `)
    await client.query(`
      CREATE TABLE IF NOT EXISTS "LeaveRequest" (
        id TEXT PRIMARY KEY,
        "employeeId" TEXT NOT NULL REFERENCES "Employee"(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        "startDate" TEXT NOT NULL,
        "endDate" TEXT NOT NULL,
        days INTEGER NOT NULL,
        reason TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'pending',
        "appliedOn" TEXT NOT NULL DEFAULT '',
        "createdAt" TEXT NOT NULL
      )
    `)
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Ticket" (
        id TEXT PRIMARY KEY,
        "employeeId" TEXT NOT NULL REFERENCES "Employee"(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'open',
        priority TEXT NOT NULL DEFAULT 'medium',
        "createdAt" TEXT NOT NULL,
        "updatedAt" TEXT NOT NULL
      )
    `)
    await client.query(`
      CREATE TABLE IF NOT EXISTS "TicketReply" (
        id TEXT PRIMARY KEY,
        "ticketId" TEXT NOT NULL REFERENCES "Ticket"(id) ON DELETE CASCADE,
        "authorId" TEXT NOT NULL,
        "authorName" TEXT NOT NULL,
        "isAdmin" INTEGER NOT NULL DEFAULT 0,
        message TEXT NOT NULL,
        "createdAt" TEXT NOT NULL
      )
    `)
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Announcement" (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        "authorId" TEXT NOT NULL,
        "authorName" TEXT NOT NULL,
        pinned INTEGER NOT NULL DEFAULT 0,
        "createdAt" TEXT NOT NULL
      )
    `)
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Settings" (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL DEFAULT ''
      )
    `)
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Project" (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        key TEXT UNIQUE NOT NULL,
        color TEXT NOT NULL DEFAULT '#6366f1',
        "createdAt" TEXT NOT NULL
      )
    `)
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Task" (
        id TEXT PRIMARY KEY,
        "projectId" TEXT NOT NULL REFERENCES "Project"(id) ON DELETE CASCADE,
        number INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'todo',
        priority TEXT NOT NULL DEFAULT 'medium',
        "assigneeId" TEXT REFERENCES "Employee"(id) ON DELETE SET NULL,
        "dueDate" TEXT,
        "createdAt" TEXT NOT NULL,
        "updatedAt" TEXT NOT NULL,
        UNIQUE("projectId", number)
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS "ChatMessage" (
        id TEXT PRIMARY KEY,
        "fromId" TEXT NOT NULL,
        "fromName" TEXT NOT NULL,
        "toId" TEXT NOT NULL,
        "toName" TEXT NOT NULL,
        content TEXT NOT NULL,
        "isRead" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TEXT NOT NULL
      )
    `)
    await client.query(`CREATE INDEX IF NOT EXISTS chat_to_idx ON "ChatMessage"("toId")`)
    await client.query(`CREATE INDEX IF NOT EXISTS chat_from_idx ON "ChatMessage"("fromId")`)

    await client.query(`
      CREATE TABLE IF NOT EXISTS "GroupChat" (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        "createdBy" TEXT NOT NULL,
        "createdAt" TEXT NOT NULL
      )
    `)
    await client.query(`
      CREATE TABLE IF NOT EXISTS "GroupMember" (
        id TEXT PRIMARY KEY,
        "groupId" TEXT NOT NULL REFERENCES "GroupChat"(id) ON DELETE CASCADE,
        "memberId" TEXT NOT NULL,
        "memberName" TEXT NOT NULL,
        "joinedAt" TEXT NOT NULL,
        UNIQUE("groupId", "memberId")
      )
    `)
    await client.query(`
      CREATE TABLE IF NOT EXISTS "GroupMessage" (
        id TEXT PRIMARY KEY,
        "groupId" TEXT NOT NULL REFERENCES "GroupChat"(id) ON DELETE CASCADE,
        "fromId" TEXT NOT NULL,
        "fromName" TEXT NOT NULL,
        content TEXT NOT NULL,
        "createdAt" TEXT NOT NULL
      )
    `)
    await client.query(`CREATE INDEX IF NOT EXISTS grp_msg_idx ON "GroupMessage"("groupId")`)
    await client.query(`
      CREATE TABLE IF NOT EXISTS "CallSession" (
        id TEXT PRIMARY KEY,
        "callerId" TEXT NOT NULL,
        "callerName" TEXT NOT NULL,
        "calleeId" TEXT NOT NULL,
        "calleeName" TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ringing',
        "sdpOffer" TEXT NOT NULL DEFAULT '',
        "sdpAnswer" TEXT NOT NULL DEFAULT '',
        "createdAt" TEXT NOT NULL,
        "updatedAt" TEXT NOT NULL
      )
    `)
    await client.query(`CREATE INDEX IF NOT EXISTS call_callee_idx ON "CallSession"("calleeId")`)

    await client.query(`
      CREATE TABLE IF NOT EXISTS "CallCandidate" (
        id TEXT PRIMARY KEY,
        "callId" TEXT NOT NULL,
        side TEXT NOT NULL,
        candidate TEXT NOT NULL,
        "createdAt" TEXT NOT NULL
      )
    `)
    await client.query(`CREATE INDEX IF NOT EXISTS cand_call_idx ON "CallCandidate"("callId", side, "createdAt")`)

    await client.query(`
      CREATE TABLE IF NOT EXISTS "Lead" (
        id TEXT PRIMARY KEY,
        "organizationId" TEXT NOT NULL,
        name TEXT NOT NULL,
        company TEXT NOT NULL DEFAULT '',
        email TEXT NOT NULL DEFAULT '',
        phone TEXT NOT NULL DEFAULT '',
        value REAL NOT NULL DEFAULT 0,
        stage TEXT NOT NULL DEFAULT 'new',
        source TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT '',
        "ownerId" TEXT NOT NULL,
        "ownerName" TEXT NOT NULL,
        "createdAt" TEXT NOT NULL,
        "updatedAt" TEXT NOT NULL
      )
    `)
    await client.query(`CREATE INDEX IF NOT EXISTS lead_org_idx ON "Lead"("organizationId")`)

    await client.query(`
      CREATE TABLE IF NOT EXISTS "ActivityLog" (
        id TEXT PRIMARY KEY,
        "employeeId" TEXT NOT NULL,
        "employeeName" TEXT NOT NULL,
        action TEXT NOT NULL,
        detail TEXT NOT NULL DEFAULT '',
        "createdAt" TEXT NOT NULL
      )
    `)
    await client.query(`CREATE INDEX IF NOT EXISTS activity_emp_idx ON "ActivityLog"("employeeId")`)
    await client.query(`CREATE INDEX IF NOT EXISTS activity_time_idx ON "ActivityLog"("createdAt" DESC)`)

    await client.query(`ALTER TABLE "Admin" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT 'Admin'`)
    await client.query(`ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "lastSeenAt" TEXT NOT NULL DEFAULT ''`)
    await client.query(`ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "shiftHours" REAL NOT NULL DEFAULT 0`)
    // "What I'm working on right now" — self-reported live focus shown to admins.
    await client.query(`ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "currentFocus" TEXT NOT NULL DEFAULT ''`)
    await client.query(`ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "focusSince" TEXT NOT NULL DEFAULT ''`)
    // Expected shift start (HH:MM, employee's local time) — enables "late" detection.
    await client.query(`ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "shiftStart" TEXT NOT NULL DEFAULT ''`)
    // Active-vs-idle tracking per session (Tier 2).
    await client.query(`ALTER TABLE "TimeRecord" ADD COLUMN IF NOT EXISTS "activeSeconds" INTEGER NOT NULL DEFAULT 0`)

    // Employee email is not unique — same person can exist across multiple orgs
    await client.query(`ALTER TABLE "Employee" DROP CONSTRAINT IF EXISTS "Employee_email_key"`)
    await client.query(`DROP INDEX IF EXISTS emp_email_org_idx`)

    // ── Multi-tenancy ─────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Organization" (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        "createdAt" TEXT NOT NULL
      )
    `)
    await client.query(`ALTER TABLE "Admin" ADD COLUMN IF NOT EXISTS "organizationId" TEXT NOT NULL DEFAULT 'default-org'`)
    await client.query(`ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "organizationId" TEXT NOT NULL DEFAULT 'default-org'`)
    await client.query(`ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "organizationId" TEXT NOT NULL DEFAULT 'default-org'`)
    // Seed default org
    await client.query(`
      INSERT INTO "Organization" (id, name, slug, "createdAt")
      VALUES ('default-org', 'My Organization', 'my-organization', $1)
      ON CONFLICT (id) DO NOTHING
    `, [new Date().toISOString()])

    // Auto-seed admin on first run
    const { rows } = await client.query(`SELECT id FROM "Admin" WHERE email = 'admin@company.com'`)
    if (rows.length === 0) {
      const hash = bcrypt.hashSync("admin123", 10)
      await client.query(
        `INSERT INTO "Admin" (id, email, "passwordHash", "createdAt") VALUES ($1, $2, $3, $4)`,
        ["admin-1", "admin@company.com", hash, new Date().toISOString()]
      )
    }
  } finally {
    client.release()
  }
}

export function ensureDb(): Promise<void> {
  if (!schemaReady) {
    schemaReady = setupSchema().catch(e => { schemaReady = null; throw e })
  }
  return schemaReady
}

export async function queryOne<T>(text: string, values?: unknown[]): Promise<T | undefined> {
  await ensureDb()
  const client = await pool.connect()
  try {
    const { rows } = await client.query(text, values)
    return rows[0] as T | undefined
  } finally {
    client.release()
  }
}

export async function queryAll<T>(text: string, values?: unknown[]): Promise<T[]> {
  await ensureDb()
  const client = await pool.connect()
  try {
    const { rows } = await client.query(text, values)
    return rows as T[]
  } finally {
    client.release()
  }
}

export async function execute(text: string, values?: unknown[]): Promise<void> {
  await ensureDb()
  const client = await pool.connect()
  try {
    await client.query(text, values)
  } finally {
    client.release()
  }
}

export async function logActivity(employeeId: string, employeeName: string, action: string, detail = "") {
  const { randomUUID } = await import("node:crypto")
  await execute(
    `INSERT INTO "ActivityLog" (id, "employeeId", "employeeName", action, detail, "createdAt") VALUES ($1, $2, $3, $4, $5, $6)`,
    [randomUUID(), employeeId, employeeName, action, detail, new Date().toISOString()]
  )
}
