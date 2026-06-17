import { DatabaseSync } from "node:sqlite"
import path from "node:path"
import bcrypt from "bcryptjs"

const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), "dev.db")

declare global {
  // eslint-disable-next-line no-var
  var __db: DatabaseSync | undefined
}

function openDb(): DatabaseSync {
  const db = new DatabaseSync(DB_PATH)
  db.exec("PRAGMA journal_mode = WAL")
  db.exec("PRAGMA foreign_keys = ON")

  db.exec(`CREATE TABLE IF NOT EXISTS Admin (
    id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL,
    passwordHash TEXT NOT NULL, createdAt TEXT NOT NULL)`)

  db.exec(`CREATE TABLE IF NOT EXISTS Employee (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL, department TEXT NOT NULL, avatar TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'offline', phone TEXT NOT NULL DEFAULT '',
    location TEXT NOT NULL DEFAULT '', jiraAccountId TEXT NOT NULL DEFAULT '',
    joinDate TEXT NOT NULL, createdAt TEXT NOT NULL, passwordHash TEXT NOT NULL DEFAULT '')`)

  db.exec(`CREATE TABLE IF NOT EXISTS TimeRecord (
    id TEXT PRIMARY KEY, employeeId TEXT NOT NULL REFERENCES Employee(id) ON DELETE CASCADE,
    date TEXT NOT NULL, clockIn TEXT NOT NULL, clockOut TEXT,
    hours REAL NOT NULL DEFAULT 0, notes TEXT NOT NULL DEFAULT '', createdAt TEXT NOT NULL)`)

  db.exec(`CREATE TABLE IF NOT EXISTS LeaveRequest (
    id TEXT PRIMARY KEY, employeeId TEXT NOT NULL REFERENCES Employee(id) ON DELETE CASCADE,
    type TEXT NOT NULL, startDate TEXT NOT NULL, endDate TEXT NOT NULL,
    days INTEGER NOT NULL, reason TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'pending',
    appliedOn TEXT NOT NULL DEFAULT '', createdAt TEXT NOT NULL)`)

  db.exec(`CREATE TABLE IF NOT EXISTS Ticket (
    id TEXT PRIMARY KEY, employeeId TEXT NOT NULL REFERENCES Employee(id) ON DELETE CASCADE,
    title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'open', priority TEXT NOT NULL DEFAULT 'medium',
    createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL)`)

  db.exec(`CREATE TABLE IF NOT EXISTS TicketReply (
    id TEXT PRIMARY KEY, ticketId TEXT NOT NULL REFERENCES Ticket(id) ON DELETE CASCADE,
    authorId TEXT NOT NULL, authorName TEXT NOT NULL,
    isAdmin INTEGER NOT NULL DEFAULT 0, message TEXT NOT NULL, createdAt TEXT NOT NULL)`)

  db.exec(`CREATE TABLE IF NOT EXISTS Announcement (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, body TEXT NOT NULL,
    authorId TEXT NOT NULL, authorName TEXT NOT NULL,
    pinned INTEGER NOT NULL DEFAULT 0, createdAt TEXT NOT NULL)`)

  db.exec(`CREATE TABLE IF NOT EXISTS Settings (
    key TEXT PRIMARY KEY, value TEXT NOT NULL DEFAULT '')`)

  // Auto-seed admin on first run
  if (!db.prepare("SELECT id FROM Admin WHERE email = 'admin@company.com'").get()) {
    db.prepare("INSERT INTO Admin (id, email, passwordHash, createdAt) VALUES (?, ?, ?, ?)").run(
      "admin-1", "admin@company.com", bcrypt.hashSync("admin123", 10), new Date().toISOString()
    )
  }

  try { db.exec("ALTER TABLE Employee ADD COLUMN passwordHash TEXT NOT NULL DEFAULT ''") } catch {}
  const { n } = db.prepare("SELECT COUNT(*) as n FROM Employee WHERE passwordHash = ''").get() as { n: number }
  if (n > 0) {
    const hash = bcrypt.hashSync("employee123", 10)
    db.prepare("UPDATE Employee SET passwordHash = ? WHERE passwordHash = ''").run(hash)
  }

  return db
}

export const db: DatabaseSync = global.__db ?? openDb()

if (process.env.NODE_ENV !== "production") {
  global.__db = db
}

export function serialize<T>(rows: T): T {
  return JSON.parse(JSON.stringify(rows))
}
