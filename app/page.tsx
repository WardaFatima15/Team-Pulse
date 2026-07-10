import Link from "next/link"
import { redirect } from "next/navigation"
import {
  TrendingUp, FileSignature, ScanSearch, Clock, BarChart2, MessageSquare,
  ArrowRight, CheckCircle2, UserCog, ShieldCheck,
} from "lucide-react"
import { getAdminSession } from "@/lib/admin-auth"
import { getEmployeeSession } from "@/lib/employee-auth"
import RotatingWord from "@/components/landing/RotatingWord"

const FEATURES = [
  { icon: TrendingUp, title: "Sales Pipeline", desc: "11-stage lead pipeline with follow-up reminders, CSV/Sheets import, and deal tracking." },
  { icon: FileSignature, title: "AI Proposals", desc: "Generate client-ready proposals in minutes, export as PDF, track status to close." },
  { icon: ScanSearch, title: "PlugAI Audits", desc: "AI-powered business audits that surface gaps and recommend the right team." },
  { icon: Clock, title: "Time & Attendance", desc: "Clock in/out, live presence, daily check-ins, and automatic attendance logs." },
  { icon: BarChart2, title: "AI Reports", desc: "One-click daily and weekly reports, written from real activity, not guesswork." },
  { icon: MessageSquare, title: "Team Chat & Tasks", desc: "Kanban task boards, direct/group chat, tickets, and leave management, built in." },
]

const MARQUEE_WORDS = [
  "Visibility", "Accountability", "AI Reports", "Sales Pipeline", "Proposals",
  "PlugAI Audits", "Offshore Teams", "Client Trust", "Daily Updates", "Performance",
]

export default async function LandingPage() {
  const [admin, employee] = await Promise.all([getAdminSession(), getEmployeeSession()])
  if (admin) redirect("/dashboard")
  if (employee) redirect("/employee/dashboard")

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white overflow-x-hidden">
      {/* Nav */}
      <nav className="sticky top-0 z-30 border-b border-white/8 bg-[#0a0a0c]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src="https://framerusercontent.com/images/T6zMkBq8OVUH1pVvYSkogfSLY.png"
              alt="Cadenz"
              className="size-7 rounded-lg object-contain"
            />
            <span className="font-bold text-lg">Cadenz</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-white/60 hover:text-white transition-colors px-3 py-1.5">
              Sign in
            </Link>
            <Link
              href="/signup"
              className="text-sm font-semibold bg-[#512feb] hover:bg-[#3f1fd4] text-white px-4 py-2 rounded-lg transition-colors"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative max-w-5xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="absolute inset-x-0 top-0 -z-10 h-[500px] bg-[radial-gradient(ellipse_at_top,rgba(81,47,235,0.25),transparent_70%)]" />

        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/60 mb-8">
          <ShieldCheck className="size-3.5 text-[#7c5af5]" />
          Built by Binary Next for hiring and managing offshore teams
        </div>

        <h1 className="animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100 text-5xl sm:text-6xl md:text-7xl font-bold leading-[1.05] tracking-tight">
          One command center for
          <br />
          <RotatingWord words={["Sales Pipelines", "Client Proposals", "Offshore Teams", "Daily Reports", "PlugAI Audits"]} />
        </h1>

        <p className="animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200 text-white/50 text-lg sm:text-xl max-w-2xl mx-auto mt-7 leading-relaxed">
          Cadenz gives you full visibility into your remote team &mdash; leads, proposals, daily work,
          performance, and reporting &mdash; so you can hire and manage offshore resources with confidence.
        </p>

        <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300 flex items-center justify-center gap-3 mt-10">
          <Link
            href="/signup"
            className="group inline-flex items-center gap-2 text-sm font-semibold bg-[#512feb] hover:bg-[#3f1fd4] text-white px-6 py-3 rounded-xl transition-colors"
          >
            Create your workspace
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/login"
            className="text-sm font-semibold text-white/70 hover:text-white border border-white/15 hover:border-white/25 px-6 py-3 rounded-xl transition-colors"
          >
            Sign in
          </Link>
        </div>

        <p className="animate-in fade-in duration-700 delay-500 text-white/30 text-xs mt-6">
          Free to start &middot; no credit card required
        </p>
      </section>

      {/* Marquee */}
      <div className="border-y border-white/8 bg-white/[0.02] py-4 overflow-hidden">
        <div className="flex whitespace-nowrap animate-marquee">
          {[...MARQUEE_WORDS, ...MARQUEE_WORDS].map((w, i) => (
            <span key={i} className="mx-6 text-sm font-medium text-white/25 uppercase tracking-widest">
              {w} <span className="text-[#512feb]/50 ml-6">&bull;</span>
            </span>
          ))}
        </div>
      </div>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center max-w-xl mx-auto mb-16">
          <p className="text-[#7c5af5] text-xs font-semibold uppercase tracking-widest mb-3">Everything in one place</p>
          <h2 className="text-3xl sm:text-4xl font-bold leading-tight">
            Built to remove the fear<br className="hidden sm:block" /> of hiring offshore
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map(({ icon: Icon, title, desc }, i) => (
            <div
              key={title}
              className="group relative rounded-2xl border border-white/10 bg-[#111116] p-6 hover:border-[#512feb]/40 transition-colors animate-in fade-in slide-in-from-bottom-4 duration-700"
              style={{ animationDelay: `${i * 75}ms` }}
            >
              <div className="size-10 rounded-xl bg-[#512feb]/15 flex items-center justify-center mb-4 group-hover:bg-[#512feb]/25 transition-colors">
                <Icon className="size-5 text-[#7c5af5]" />
              </div>
              <h3 className="font-semibold text-white mb-1.5">{title}</h3>
              <p className="text-sm text-white/50 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trust strip */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#512feb]/10 via-transparent to-transparent p-10 sm:p-14">
          <div className="grid sm:grid-cols-2 gap-10 items-center">
            <div>
              <h3 className="text-2xl sm:text-3xl font-bold leading-tight mb-4">
                Every client gets visibility into their team&apos;s real work
              </h3>
              <p className="text-white/50 leading-relaxed">
                Daily updates, weekly reports, blockers, deliverables, and performance &mdash;
                all tracked automatically, not chased down over Slack.
              </p>
            </div>
            <div className="space-y-3">
              {[
                "What their resource is working on right now",
                "What was completed today, and what's blocked",
                "AI-generated weekly reports with real data",
                "Full sales pipeline, proposals, and audits",
              ].map(item => (
                <div key={item} className="flex items-start gap-2.5">
                  <CheckCircle2 className="size-4 text-[#7c5af5] shrink-0 mt-0.5" />
                  <p className="text-sm text-white/70">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-6 pb-28 text-center">
        <UserCog className="size-8 text-[#7c5af5] mx-auto mb-6" />
        <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to run your team with confidence?</h2>
        <p className="text-white/50 mb-8">Set up your workspace in under a minute.</p>
        <Link
          href="/signup"
          className="inline-flex items-center gap-2 text-sm font-semibold bg-[#512feb] hover:bg-[#3f1fd4] text-white px-6 py-3 rounded-xl transition-colors"
        >
          Get started free
          <ArrowRight className="size-4" />
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/8">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 opacity-60">
            <img
              src="https://framerusercontent.com/images/T6zMkBq8OVUH1pVvYSkogfSLY.png"
              alt="Binary Next"
              className="size-5 rounded object-contain"
            />
            <span className="text-sm text-white/50">Cadenz by Binary Next</span>
          </div>
          <p className="text-xs text-white/30">&copy; 2026 Binary Next. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
