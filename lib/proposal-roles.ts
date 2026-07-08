export type RoleDef = { id: string; label: string; hourlyRate: number; monthlyRate: number }

export const ROLE_CATEGORIES: Record<string, RoleDef[]> = {
  "Customer Support": [
    { id: "csr", label: "Customer Support Representative (CSR)", hourlyRate: 10, monthlyRate: 1600 },
    { id: "csa", label: "Customer Success Associate", hourlyRate: 15, monthlyRate: 2400 },
    { id: "tsa", label: "Technical Support Associate", hourlyRate: 15, monthlyRate: 2400 },
    { id: "am", label: "Account Manager (Customer Success)", hourlyRate: 20, monthlyRate: 3200 },
  ],
  "Sales": [
    { id: "sdr", label: "Sales Development Representative (SDR)", hourlyRate: 15, monthlyRate: 2400 },
    { id: "ae", label: "Account Executive (AE)", hourlyRate: 20, monthlyRate: 3200 },
    { id: "bdr", label: "Business Development Representative (BDR)", hourlyRate: 15, monthlyRate: 2400 },
    { id: "sales", label: "Sales Manager", hourlyRate: 20, monthlyRate: 3200 },
    { id: "lead_gen", label: "Lead Generation Specialist", hourlyRate: 10, monthlyRate: 1600 },
    { id: "sales_ops", label: "Sales Operations Associate", hourlyRate: 15, monthlyRate: 2400 },
  ],
  "Engineering": [
    { id: "aws_de", label: "AWS Data Engineer", hourlyRate: 30, monthlyRate: 4800 },
    { id: "azure_de", label: "Azure Data Engineer", hourlyRate: 30, monthlyRate: 4800 },
    { id: "databricks_de", label: "DataBricks Data Engineer", hourlyRate: 25, monthlyRate: 4000 },
    { id: "pentaho_de", label: "Pentaho Data Engineer", hourlyRate: 20, monthlyRate: 3200 },
    { id: "talend_de", label: "Talend Data Engineer", hourlyRate: 20, monthlyRate: 3200 },
    { id: "ssis_de", label: "SSIS Data Engineer", hourlyRate: 20, monthlyRate: 3200 },
    { id: "pandas_de", label: "Pandas Data Engineer", hourlyRate: 15, monthlyRate: 2400 },
  ],
  "Machine Learning & AI": [
    { id: "ml_arch", label: "Machine Learning Architect", hourlyRate: 30, monthlyRate: 4800 },
    { id: "ml_eng", label: "Machine Learning Engineer", hourlyRate: 25, monthlyRate: 4000 },
  ],
  "Software Development": [
    { id: "python_dev", label: "Python Developer & Architect", hourlyRate: 30, monthlyRate: 4800 },
    { id: "react_dev", label: "React Developer", hourlyRate: 18, monthlyRate: 2880 },
    { id: "react_native_dev", label: "React Native Developer & Architect", hourlyRate: 25, monthlyRate: 4000 },
    { id: "django_dev", label: "Django Developer", hourlyRate: 20, monthlyRate: 3200 },
    { id: "ios_dev", label: "iOS Developer & Architect", hourlyRate: 25, monthlyRate: 4000 },
    { id: "android_dev", label: "Android Developer & Architect", hourlyRate: 25, monthlyRate: 4000 },
    { id: "ms_dynamics", label: "Microsoft Dynamics CRM Developer & Architect", hourlyRate: 30, monthlyRate: 4800 },
    { id: "edi", label: "EDI Integrator", hourlyRate: 25, monthlyRate: 4000 },
  ],
  "Data Science & Analytics": [
    { id: "tableau", label: "Tableau Expert", hourlyRate: 20, monthlyRate: 3200 },
    { id: "qlik", label: "Qlik Data Scientist", hourlyRate: 20, monthlyRate: 3200 },
    { id: "powerbi", label: "PowerBI Data Scientist", hourlyRate: 20, monthlyRate: 3200 },
    { id: "sigma", label: "Sigma Data Scientist", hourlyRate: 20, monthlyRate: 3200 },
  ],
  "Creative & Marketing": [
    { id: "figma", label: "Figma Designer", hourlyRate: 18, monthlyRate: 2880 },
    { id: "graphic", label: "Graphic Designer", hourlyRate: 20, monthlyRate: 3200 },
    { id: "social_media", label: "Social Media Manager", hourlyRate: 25, monthlyRate: 4000 },
    { id: "seo", label: "SEO Manager", hourlyRate: 30, monthlyRate: 4800 },
    { id: "digital_mkt", label: "Digital Marketing Specialist", hourlyRate: 15, monthlyRate: 2400 },
    { id: "content_sm", label: "Content & Social Media Manager", hourlyRate: 20, monthlyRate: 3200 },
    { id: "email_mkt", label: "Email Marketing Executive", hourlyRate: 15, monthlyRate: 2400 },
    { id: "video_edit", label: "Graphic / Video Editor", hourlyRate: 15, monthlyRate: 2400 },
    { id: "mkt_ops", label: "Marketing Operations Analyst", hourlyRate: 20, monthlyRate: 3200 },
  ],
}

export const ALL_ROLES: RoleDef[] = Object.values(ROLE_CATEGORIES).flat()

export const PROJECT_TYPES = [
  "Customer Support Scale-Up",
  "Outbound Sales / SDR Pod",
  "Account Executive Team",
  "Full-Stack Engineering Pod",
  "Data & Analytics Pod",
  "Machine Learning & AI Pod",
  "Creative & Marketing Pod",
  "GTM & Revenue Operations",
  "Back Office & Admin Support",
  "Hybrid Growth Pod",
  "Venture Execution Sprint (30-Day Pilot)",
]

// The generator itself lives in the separate internal "propsalgen" app/repo —
// this just calls its existing public endpoints (CORS-open) instead of
// re-implementing the prompt/model logic here.
export const PROPOSAL_API_URL = "https://propsalgen.vercel.app/api/generate"
export const PROPOSAL_FETCH_URL_API = "https://propsalgen.vercel.app/api/fetch-url"
export const PROPOSAL_AUDIT_API = "https://propsalgen.vercel.app/api/audit-website"

export type AuditRole = { roleId: string; roleLabel: string; count: number; hourlyRate: number; monthlyRate: number; rationale: string }
export type AuditResult = {
  businessType: string
  businessSummary: string
  identifiedGaps: { gap: string; impact: string }[]
  recommendedTeam: { podName: string; rationale: string; roles: AuditRole[] }[]
  auditSummary: string
  projectTypeSuggestion: string
}

// Saved-proposal lifecycle. Lives here (a plain module) rather than in the
// "use server" actions file, which may only export async functions — a const
// or type export there is a build error.
export type ProposalStatus =
  | "draft" | "sent" | "viewed" | "accepted" | "rejected" | "needs_revision"

export const PROPOSAL_STATUSES: ProposalStatus[] = [
  "draft", "sent", "viewed", "accepted", "rejected", "needs_revision",
]

export type SavedProposal = {
  id: string
  leadId: string | null
  clientName: string
  projectType: string
  totalHeadcount: number
  totalMonthly: number
  content: unknown
  status: ProposalStatus
  ownerName: string
  createdAt: string
  updatedAt: string
}
