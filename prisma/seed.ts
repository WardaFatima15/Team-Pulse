import { DatabaseSync } from "node:sqlite"
import path from "node:path"
import bcrypt from "bcryptjs"

const db = new DatabaseSync(path.join(process.cwd(), "dev.db"))
db.exec("PRAGMA foreign_keys = ON")
try { db.exec("ALTER TABLE Employee ADD COLUMN passwordHash TEXT NOT NULL DEFAULT ''") } catch {}
try { db.exec("CREATE TABLE IF NOT EXISTS Settings (key TEXT PRIMARY KEY, value TEXT NOT NULL DEFAULT '')") } catch {}

if (!db.prepare("SELECT id FROM Admin WHERE email = ?").get("admin@company.com")) {
  db.prepare("INSERT INTO Admin (id, email, passwordHash, createdAt) VALUES (?, ?, ?, ?)").run(
    "admin-1", "admin@company.com", bcrypt.hashSync("admin123", 10), new Date().toISOString()
  )
  console.log("Admin account created: admin@company.com / admin123")
} else {
  console.log("Admin already exists.")
}

console.log("Done.")
db.close()
