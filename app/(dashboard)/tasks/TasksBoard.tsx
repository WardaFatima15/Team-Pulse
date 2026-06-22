"use client"

import { useState, useTransition } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Trash2, X, Loader2, FolderKanban } from "lucide-react"
import { createProject, deleteProject, createTask, updateTask, deleteTask, type Project, type Task } from "@/lib/task-actions"
import { useRouter } from "next/navigation"

type Employee = { id: string; name: string; avatar: string; department: string }

const STATUSES = [
  { key: "todo", label: "To Do", color: "bg-white/10 text-white/70" },
  { key: "in_progress", label: "In Progress", color: "bg-blue-500/15 text-blue-400" },
  { key: "in_review", label: "In Review", color: "bg-amber-500/15 text-amber-400" },
  { key: "done", label: "Done", color: "bg-green-500/15 text-green-400" },
] as const

const PRIORITIES = [
  { key: "low", label: "Low", dot: "bg-white/30" },
  { key: "medium", label: "Medium", dot: "bg-blue-400" },
  { key: "high", label: "High", dot: "bg-orange-400" },
  { key: "critical", label: "Critical", dot: "bg-red-500" },
] as const

const PROJECT_COLORS = ["#6366f1","#0ea5e9","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899","#14b8a6"]

function priorityDot(p: string) { return PRIORITIES.find(x => x.key === p)?.dot ?? "bg-white/30" }
function statusLabel(s: string) { return STATUSES.find(x => x.key === s)?.label ?? s }

function TaskAvatar({ name, avatar }: { name: string; avatar: string }) {
  if (avatar) return <img src={avatar} alt={name} className="size-5 rounded-full object-cover" />
  return (
    <span className="size-5 rounded-full bg-[#512feb]/15 flex items-center justify-center text-[10px] font-semibold text-[#7c5af5] shrink-0">
      {name.charAt(0).toUpperCase()}
    </span>
  )
}

function TaskModal({ task, employees, projects, onClose }: {
  task: Task | null; employees: Employee[]; projects: Project[]; onClose: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState({
    projectId: task?.projectId ?? (projects[0]?.id ?? ""),
    title: task?.title ?? "",
    description: task?.description ?? "",
    status: task?.status ?? "todo",
    priority: task?.priority ?? "medium",
    assigneeId: task?.assigneeId ?? "",
    dueDate: task?.dueDate ?? "",
  })

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  function handleSubmit() {
    if (!form.title.trim() || !form.projectId) return
    startTransition(async () => {
      if (task) {
        await updateTask(task.id, { title: form.title, description: form.description, status: form.status, priority: form.priority, assigneeId: form.assigneeId || null, dueDate: form.dueDate || null })
      } else {
        await createTask(form)
      }
      router.refresh(); onClose()
    })
  }

  function handleDelete() {
    if (!task) return
    startTransition(async () => { await deleteTask(task.id); router.refresh(); onClose() })
  }

  const selectCls = "w-full text-sm border border-white/10 rounded-lg px-3 py-2 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-[#512feb]/50"

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#131318] border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h2 className="font-semibold text-white">{task ? "Edit Task" : "New Task"}</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X className="size-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          {!task && (
            <div>
              <label className="text-xs font-medium text-white/60 mb-1 block">Project</label>
              <select value={form.projectId} onChange={e => set("projectId", e.target.value)} className={selectCls}>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name} ({p.key})</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-white/60 mb-1 block">Title *</label>
            <Input value={form.title} onChange={e => set("title", e.target.value)} placeholder="Task title" autoFocus className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
          </div>
          <div>
            <label className="text-xs font-medium text-white/60 mb-1 block">Description</label>
            <textarea value={form.description} onChange={e => set("description", e.target.value)}
              placeholder="Optional details..." className="w-full text-sm border border-white/10 rounded-lg px-3 py-2 resize-none h-20 focus:outline-none focus:ring-2 focus:ring-[#512feb]/50 bg-white/5 text-white placeholder:text-white/30" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-white/60 mb-1 block">Status</label>
              <select value={form.status} onChange={e => set("status", e.target.value)} className={selectCls}>
                {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-white/60 mb-1 block">Priority</label>
              <select value={form.priority} onChange={e => set("priority", e.target.value)} className={selectCls}>
                {PRIORITIES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-white/60 mb-1 block">Assignee</label>
              <select value={form.assigneeId} onChange={e => set("assigneeId", e.target.value)} className={selectCls}>
                <option value="">Unassigned</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-white/60 mb-1 block">Due Date</label>
              <Input type="date" value={form.dueDate} onChange={e => set("dueDate", e.target.value)} className="bg-white/5 border-white/10 text-white" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 px-5 py-4 border-t border-white/10">
          {task && (
            <button onClick={handleDelete} disabled={pending}
              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 mr-auto">
              <Trash2 className="size-3.5" /> Delete task
            </button>
          )}
          <Button variant="outline" size="sm" onClick={onClose} disabled={pending} className="border-white/10 text-white/70 hover:bg-white/5">Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={pending || !form.title.trim()} className="bg-[#512feb] hover:bg-[#3f1fd4] text-white">
            {pending ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : null}
            {task ? "Save changes" : "Create task"}
          </Button>
        </div>
      </div>
    </div>
  )
}

function ProjectModal({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [name, setName] = useState("")
  const [key, setKey] = useState("")
  const [color, setColor] = useState(PROJECT_COLORS[0])
  const [error, setError] = useState("")

  function handleNameChange(v: string) {
    setName(v)
    setKey(v.split(" ").map(w => w[0] ?? "").join("").toUpperCase().slice(0, 5))
  }

  function handleSubmit() {
    if (!name.trim() || !key.trim()) return
    setError("")
    startTransition(async () => {
      try {
        await createProject(name, key, color)
        router.refresh(); onClose()
      } catch (e: unknown) {
        setError(String(e).replace("Error: ", ""))
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#131318] border border-white/10 rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h2 className="font-semibold text-white">New Project</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X className="size-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-white/60 mb-1 block">Project Name *</label>
            <Input value={name} onChange={e => handleNameChange(e.target.value)} placeholder="e.g. Backend API" autoFocus className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
          </div>
          <div>
            <label className="text-xs font-medium text-white/60 mb-1 block">Key (short code)</label>
            <Input value={key} onChange={e => setKey(e.target.value.toUpperCase().slice(0, 6))} placeholder="e.g. API" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
            <p className="text-xs text-white/50 mt-1">Used as task prefix: {key || "KEY"}-1, {key || "KEY"}-2…</p>
          </div>
          <div>
            <label className="text-xs font-medium text-white/60 mb-1 block">Color</label>
            <div className="flex gap-2">
              {PROJECT_COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)}
                  className={`size-6 rounded-full transition-transform ${color === c ? "scale-125 ring-2 ring-offset-1 ring-white/40" : ""}`}
                  style={{ background: c }} />
              ))}
            </div>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-white/10">
          <Button variant="outline" size="sm" onClick={onClose} disabled={pending} className="border-white/10 text-white/70 hover:bg-white/5">Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={pending || !name.trim() || !key.trim()} className="bg-[#512feb] hover:bg-[#3f1fd4] text-white">
            {pending ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : null}
            Create project
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function TasksBoard({ projects, tasks, employees }: { projects: Project[]; tasks: Task[]; employees: Employee[] }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [selectedProject, setSelectedProject] = useState<string>("all")
  const [showNewTask, setShowNewTask] = useState(false)
  const [showNewProject, setShowNewProject] = useState(false)
  const [editTask, setEditTask] = useState<Task | null>(null)

  const filtered = selectedProject === "all" ? tasks : tasks.filter(t => t.projectId === selectedProject)

  function handleStatusChange(task: Task, status: string) {
    startTransition(async () => { await updateTask(task.id, { status }); router.refresh() })
  }

  async function handleDeleteProject(id: string) {
    if (!confirm("Delete this project and all its tasks?")) return
    startTransition(async () => {
      await deleteProject(id)
      if (selectedProject === id) setSelectedProject("all")
      router.refresh()
    })
  }

  if (projects.length === 0) {
    return (
      <>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
          <div className="size-14 rounded-full bg-[#512feb]/10 flex items-center justify-center">
            <FolderKanban className="size-6 text-[#7c5af5]" />
          </div>
          <div>
            <p className="font-semibold text-white text-lg">No projects yet</p>
            <p className="text-white/60 text-sm mt-1">Create a project to start tracking tasks.</p>
          </div>
          <Button onClick={() => setShowNewProject(true)} className="bg-[#512feb] hover:bg-[#3f1fd4] text-white">
            <Plus className="size-4 mr-1.5" /> New Project
          </Button>
        </div>
        {showNewProject && <ProjectModal onClose={() => setShowNewProject(false)} />}
      </>
    )
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex items-center gap-1 bg-white/8 rounded-xl p-1 flex-wrap">
          <button onClick={() => setSelectedProject("all")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${selectedProject === "all" ? "bg-[#131318] shadow-sm text-white" : "text-white/50 hover:text-white/80"}`}>
            All projects
            <span className="ml-1.5 text-white/30">{tasks.length}</span>
          </button>
          {projects.map(p => (
            <button key={p.id} onClick={() => setSelectedProject(p.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${selectedProject === p.id ? "bg-[#131318] shadow-sm text-white" : "text-white/50 hover:text-white/80"}`}>
              <span className="size-2 rounded-full shrink-0" style={{ background: p.color }} />
              {p.name}
              <span className="text-white/30">{p.taskCount ?? 0}</span>
            </button>
          ))}
        </div>

        <div className="ml-auto flex gap-2">
          {selectedProject !== "all" && (
            <button onClick={() => handleDeleteProject(selectedProject)}
              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-red-500/10">
              <Trash2 className="size-3.5" /> Delete project
            </button>
          )}
          <Button variant="outline" size="sm" onClick={() => setShowNewProject(true)} className="border-white/10 text-white/70 hover:bg-white/8">
            <Plus className="size-3.5 mr-1" /> Project
          </Button>
          <Button size="sm" onClick={() => setShowNewTask(true)} className="bg-[#512feb] hover:bg-[#3f1fd4] text-white" disabled={projects.length === 0}>
            <Plus className="size-3.5 mr-1" /> Task
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {STATUSES.map(col => {
          const colTasks = filtered.filter(t => t.status === col.key)
          return (
            <div key={col.key} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${col.color}`}>{col.label}</span>
                <span className="text-xs text-white/40 font-medium">{colTasks.length}</span>
              </div>

              {colTasks.map(task => (
                <Card key={task.id} className="cursor-pointer hover:ring-white/20 transition-all" onClick={() => setEditTask(task)}>
                  <CardContent className="pt-3.5 pb-3.5 px-3.5">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="size-2 rounded-full shrink-0" style={{ background: task.projectColor }} />
                      <span className="text-[10px] font-mono text-white/40">{task.projectKey}-{task.number}</span>
                    </div>
                    <p className="text-sm font-medium text-white mb-3 line-clamp-2 leading-snug">{task.title}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className={`size-2 rounded-full ${priorityDot(task.priority)}`} />
                        <span className="text-[10px] text-white/50 capitalize">{task.priority}</span>
                      </div>
                      {task.assigneeName ? (
                        <TaskAvatar name={task.assigneeName} avatar={task.assigneeAvatar ?? ""} />
                      ) : (
                        <span className="text-[10px] text-white/25">Unassigned</span>
                      )}
                    </div>
                    {task.dueDate && (
                      <p className="text-[10px] text-white/50 mt-2">
                        Due {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    )}
                    <div className="mt-2.5 pt-2.5 border-t border-white/10 flex gap-1 flex-wrap" onClick={e => e.stopPropagation()}>
                      {STATUSES.filter(s => s.key !== task.status).map(s => (
                        <button key={s.key} onClick={() => handleStatusChange(task, s.key)}
                          className="text-[10px] px-1.5 py-0.5 rounded border border-white/10 text-white/50 hover:border-[#512feb]/50 hover:text-[#7c5af5] transition-colors">
                          → {s.label}
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {colTasks.length === 0 && (
                <div className="border-2 border-dashed border-white/8 rounded-xl h-20 flex items-center justify-center">
                  <span className="text-xs text-white/25">No tasks</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {showNewTask && <TaskModal task={null} employees={employees} projects={projects} onClose={() => setShowNewTask(false)} />}
      {editTask && <TaskModal task={editTask} employees={employees} projects={projects} onClose={() => setEditTask(null)} />}
      {showNewProject && <ProjectModal onClose={() => setShowNewProject(false)} />}
    </>
  )
}
