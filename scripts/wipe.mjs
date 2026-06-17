import { DatabaseSync } from "node:sqlite"
import { join } from "node:path"

const db = new DatabaseSync(join(process.cwd(), "dev.db"))
db.exec("PRAGMA foreign_keys = OFF")
db.exec("DELETE FROM TicketReply")
db.exec("DELETE FROM Ticket")
db.exec("DELETE FROM LeaveRequest")
db.exec("DELETE FROM TimeRecord")
db.exec("DELETE FROM Announcement")
db.exec("DELETE FROM Employee")
db.exec("PRAGMA foreign_keys = ON")
console.log("All employee data wiped. Admin account preserved.")
db.close()
