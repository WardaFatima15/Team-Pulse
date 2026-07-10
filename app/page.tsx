import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowRight, CheckCircle2 } from "lucide-react"
import { getAdminSession } from "@/lib/admin-auth"
import { getEmployeeSession } from "@/lib/employee-auth"
import TypeCycle from "@/components/landing/TypeCycle"
import LiveFeed from "@/components/landing/LiveFeed"
import Reveal from "@/components/landing/Reveal"
import WorldClocks from "@/components/landing/WorldClocks"
import ModuleTree from "@/components/landing/ModuleTree"

const BOOT_LINES = [
  { text: "$ cadenz boot", delay: 0 },
  { text: "> loading modules ......... ok (6/6)", delay: 400 },
  { text: "> syncing timezones ....... ok (5)", delay: 800 },
  { text: "> team visibility ......... ONLINE", delay: 1200, accent: true },
]

const TICKER = [
  "CLOCK-IN 09:02", "LEAD → PITCHED", "PROPOSAL SENT", "AUDIT COMPLETE", "REPORT GENERATED",
  "TASK APPROVED", "BLOCKER FLAGGED", "DEAL CLOSED WON", "CHECK-IN SUBMITTED", "RESOURCE ASSIGNED",
]

export default async function LandingPage() {
  const [admin, employee] = await Promise.all([getAdminSession(), getEmployeeSession()])
  if (admin) redirect("/dashboard")
  if (employee) redirect("/employee/dashboard")

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#060608] text-white">
      {/* Nav */}
      <nav className="sticky top-0 z-30 border-b border-white/8 bg-[#060608]/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <img
              src="https://framerusercontent.com/images/T6zMkBq8OVUH1pVvYSkogfSLY.png"
              alt="Cadenz"
              className="size-7 rounded-lg object-contain"
            />
            <span className="text-lg font-bold tracking-tight">Cadenz</span>
            <span className="mt-1 hidden font-mono text-[10px] uppercase tracking-[0.2em] text-white/30 sm:inline">
              command center
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="px-3 py-1.5 text-sm text-white/60 transition-colors hover:text-white">
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-white/85"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* World clocks strip */}
      <div className="border-b border-white/8 bg-[#08080b]">
        <div className="mx-auto max-w-6xl overflow-x-auto px-6 py-2.5">
          <WorldClocks />
        </div>
      </div>

      {/* Hero */}
      <section className="relative">
        <div className="bg-ops-grid grid-fade pointer-events-none absolute inset-0" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 pb-24 pt-16 lg:grid-cols-[1.1fr_1fr] lg:pt-20">
          <div>
            {/* boot sequence */}
            <div className="mb-8 font-mono text-[13px] leading-relaxed">
              {BOOT_LINES.map(l => (
                <p
                  key={l.text}
                  className={`feed-line ${l.accent ? "text-green-400" : "text-white/40"}`}
                  style={{ animationDelay: `${l.delay}ms` }}
                >
                  {l.text}
                </p>
              ))}
            </div>

            <h1
              className="feed-line text-4xl font-bold leading-[1.12] tracking-tight sm:text-5xl md:text-[3.4rem]"
              style={{ animationDelay: "1600ms" }}
            >
              Run{" "}
              <span className="font-mono font-semibold text-[#9d85f7]">
                <TypeCycle />
              </span>
              <br />
              from one command center.
            </h1>

            <p
              className="feed-line mt-6 max-w-lg text-lg leading-relaxed text-white/55"
              style={{ animationDelay: "1900ms" }}
            >
              Cadenz is the operating system for offshore teams — leads, proposals,
              daily work, and reporting, visible in real time. No chasing updates over Slack.
            </p>

            <div className="feed-line mt-9 flex flex-wrap items-center gap-3" style={{ animationDelay: "2100ms" }}>
              <Link
                href="/signup"
                className="group inline-flex items-center gap-2 rounded-lg bg-[#512feb] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#3f1fd4]"
              >
                Create your workspace
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/login"
                className="rounded-lg border border-white/15 px-6 py-3 font-mono text-sm text-white/70 transition-colors hover:border-white/30 hover:text-white"
              >
                $ sign-in
              </Link>
            </div>

            <p className="feed-line mt-5 font-mono text-xs text-white/30" style={{ animationDelay: "2300ms" }}>
              free to start — no credit card required
            </p>
          </div>

          <Reveal delay={200}>
            <LiveFeed />
          </Reveal>
        </div>
      </section>

      {/* Ticker */}
      <div className="overflow-hidden border-y border-white/8 bg-[#0a0a0e] py-3">
        <div className="animate-marquee flex whitespace-nowrap">
          {[...TICKER, ...TICKER].map((t, i) => (
            <span key={i} className="mx-5 font-mono text-xs tracking-[0.15em] text-white/30">
              <span className="mr-5 text-[#512feb]">▮</span>
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Modules as directory tree */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <Reveal>
          <div className="mb-12">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-white/35">// system modules</p>
            <h2 className="max-w-lg text-3xl font-bold leading-tight sm:text-4xl">
              Everything an offshore operation actually needs
            </h2>
          </div>
        </Reveal>
        <Reveal delay={100}>
          <ModuleTree />
        </Reveal>
      </section>

      {/* Visibility section */}
      <section className="border-t border-white/8 bg-[#08080b]">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-24 lg:grid-cols-2">
          <Reveal>
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-white/35">// the trust problem</p>
            <h3 className="mb-5 text-3xl font-bold leading-tight sm:text-4xl">
              Clients stop asking<br />&ldquo;what is my team doing?&rdquo;
            </h3>
            <p className="max-w-md leading-relaxed text-white/50">
              Daily updates, weekly reports, blockers, deliverables, and performance —
              tracked automatically and visible to the people paying for the work.
            </p>
          </Reveal>
          <Reveal delay={120}>
            <div className="space-y-px overflow-hidden rounded-xl border border-white/10 bg-white/10">
              {[
                "What their resource is working on right now",
                "What was completed today, and what's blocked",
                "AI-generated weekly reports with real data",
                "Full sales pipeline, proposals, and audits",
              ].map((item, i) => (
                <div key={item} className="flex items-center gap-3 bg-[#0a0a0e] px-5 py-4">
                  <span className="font-mono text-xs text-white/25">0{i + 1}</span>
                  <p className="text-sm text-white/75">{item}</p>
                  <CheckCircle2 className="ml-auto size-4 shrink-0 text-green-400/80" />
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-white/8">
        <div className="mx-auto max-w-3xl px-6 py-28 text-center">
          <Reveal>
            <p className="mb-6 font-mono text-sm text-white/40">
              <span className="text-green-400">$</span> cadenz init --workspace{" "}
              <span className="caret-blink inline-block h-4 w-2 translate-y-0.5 bg-white/60" />
            </p>
            <h2 className="mb-4 text-3xl font-bold sm:text-4xl">Ready to run your team with confidence?</h2>
            <p className="mb-9 text-white/50">Set up your workspace in under a minute.</p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-lg bg-[#512feb] px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#3f1fd4]"
            >
              Get started free
              <ArrowRight className="size-4" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <div className="flex items-center gap-2 opacity-60">
            <img
              src="https://framerusercontent.com/images/T6zMkBq8OVUH1pVvYSkogfSLY.png"
              alt="Binary Next"
              className="size-5 rounded object-contain"
            />
            <span className="text-sm text-white/50">Cadenz by Binary Next</span>
          </div>
          <p className="font-mono text-xs text-white/25">© 2026 Binary Next</p>
        </div>
      </footer>
    </div>
  )
}
