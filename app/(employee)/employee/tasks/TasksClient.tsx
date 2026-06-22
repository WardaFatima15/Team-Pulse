"use client"

import { useState, useTransition } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { updateTask, type Task } from "@/lib/task-actions"
import { useRouter } from "next/navigation"
import { CheckCircle2, Clock, Eye, Circle } from "lucide-react"

const STATUSES = [
  { key: "todo", label: "To Do", color: "bg-white/10 text-white/70" },
  { key: "in_progress", label: "In Progress", color: "bg-blue-500/15 text-blue-400" },
  { key: "in_review", label: "In Review", color: "bg-amber-500/15 text-amber-400" },
  { key: "done", label: "Done", color: "bg-green-500/15 text-green-400" },
] as const

const PRIORITY_DOT: Record<string, string> = {
  low: "bg-white/30", medium: "bg-blue-400", high: "bg-orange-400", critical: "bg-red-500",
}

function statusStyle(s: string) {
  return STATUSES.find(x => x.key === s)?.color ?? "bg-white/10 text-white/60"
}
function statusLabel(s: string) {
  return STATUSES.find(x => x.key === s)?.label ?? s
}

export default function TasksClient({ tasks }: { tasks: Task[] }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [filter, setFilter] = useState("all")

  const filtered = filter === "all" ? tasks : tasks.filter(t => t.status === filter)
  const counts = Object.fromEntries(STATUSES.map(s => [s.key, tasks.filter(t => t.status === s.key).length]))

  function moveStatus(task: Task, status: string) {
    startTransition(async () => { await updateTask(task.id, { status }); router.refresh() })
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-3">
        <div className="size-14 rounded-full bg-white/8 flex items-center justify-center">
          <CheckCircle2 className="size-6 text-white/30" />
        </div>
        <div>
          <p className="font-semibold text-white">No tasks assigned</p>
          <p className="text-white/60 text-sm mt-1">Tasks assigned to you will appear here.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">My Tasks</h1>
          <p className="text-white/60 text-sm mt-0.5">{tasks.length} task{tasks.length !== 1 ? "s" : ""} assigned to you</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <button onClick={() => setFilter("all")}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${filter === "all" ? "border-[#512feb]/50 bg-[#512feb]/15 text-[#7c5af5]" : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"}`}>
          All <span className="ml-1 font-normal">{tasks.length}</span>
        </button>
        {STATUSES.map(s => (
          <button key={s.key} onClick={() => setFilter(s.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${filter === s.key ? "border-[#512feb]/50 bg-[#512feb]/15 text-[#7c5af5]" : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"}`}>
            {s.label} <span className="ml-1 font-normal">{counts[s.key]}</span>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map(task => (
          <Card key={task.id}>
            <CardContent className="py-4 px-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">
                  {task.status === "done" ? (
                    <CheckCircle2 className="size-4 text-green-400" />
                  ) : task.status === "in_progress" ? (
                    <Clock className="size-4 text-blue-400" />
                  ) : task.status === "in_review" ? (
                    <Eye className="size-4 text-amber-400" />
                  ) : (
                    <Circle className="size-4 text-white/25" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-mono" style={{ color: task.projectColor }}>
                      {task.projectKey}-{task.number}
                    </span>
                    <span className="text-[10px] text-white/40">{task.projectName}</span>
                  </div>
                  <p className={`text-sm font-medium ${task.status === "done" ? "line-through text-white/40" : "text-white"}`}>
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="text-xs text-white/50 mt-0.5 line-clamp-1">{task.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${statusStyle(task.status)}`}>
                      {statusLabel(task.status)}
                    </span>
                    <div className="flex items-center gap-1">
                      <span className={`size-1.5 rounded-full ${PRIORITY_DOT[task.priority] ?? "bg-white/30"}`} />
                      <span className="text-[10px] text-white/50 capitalize">{task.priority}</span>
                    </div>
                    {task.dueDate && (
                      <span className="text-[10px] text-white/50">
                        Due {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-1 flex-wrap justify-end shrink-0">
                  {task.status !== "in_progress" && task.status !== "done" && (
                    <button onClick={() => moveStatus(task, "in_progress")}
                      className="text-[10px] px-2 py-1 rounded border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 transition-colors whitespace-nowrap">
                      Start
                    </button>
                  )}
                  {task.status === "in_progress" && (
                    <button onClick={() => moveStatus(task, "in_review")}
                      className="text-[10px] px-2 py-1 rounded border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-colors whitespace-nowrap">
                      Submit review
                    </button>
                  )}
                  {task.status !== "done" && (
                    <button onClick={() => moveStatus(task, "done")}
                      className="text-[10px] px-2 py-1 rounded border border-green-500/30 text-green-400 hover:bg-green-500/10 transition-colors whitespace-nowrap">
                      Mark done
                    </button>
                  )}
                  {task.status === "done" && (
                    <button onClick={() => moveStatus(task, "todo")}
                      className="text-[10px] px-2 py-1 rounded border border-white/10 text-white/50 hover:bg-white/8 transition-colors whitespace-nowrap">
                      Reopen
                    </button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
