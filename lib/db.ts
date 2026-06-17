import { db as pgDb } from "@vercel/postgres"
import bcrypt from "bcryptjs"

export function serialize<T>(rows: T): T {
  return JSON.parse(JSON.stringify(rows))
}

let schemaReady: Promise<void> | null = null

async function setupSchema(): Promise<void> {
  const client = await pgDb.connect()
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
  const client = await pgDb.connect()
  try {
    const { rows } = await client.query(text, values)
    return rows[0] as T | undefined
  } finally {
    client.release()
  }
}

export async function queryAll<T>(text: string, values?: unknown[]): Promise<T[]> {
  await ensureDb()
  const client = await pgDb.connect()
  try {
    const { rows } = await client.query(text, values)
    return rows as T[]
  } finally {
    client.release()
  }
}

export async function execute(text: string, values?: unknown[]): Promise<void> {
  await ensureDb()
  const client = await pgDb.connect()
  try {
    await client.query(text, values)
  } finally {
    client.release()
  }
}
