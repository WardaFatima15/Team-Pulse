import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-white/60 text-sm mt-1">App configuration and account info</p>
      </div>

      <Card>
        <CardHeader className="border-b border-white/10 pb-4">
          <CardTitle className="text-sm font-semibold text-white">Admin Account</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-2 text-sm">
          <div className="flex justify-between text-white/70">
            <span>Email</span>
            <span className="font-medium text-white">admin@company.com</span>
          </div>
          <div className="flex justify-between text-white/70">
            <span>Role</span>
            <span className="font-medium text-white">Administrator</span>
          </div>
          <div className="flex justify-between text-white/70">
            <span>App version</span>
            <span className="font-medium text-white">1.0.0</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-white/10 pb-4">
          <CardTitle className="text-sm font-semibold text-white">About TeamPulse</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-2 text-sm text-white/70">
          <p>TeamPulse is an internal employee management platform for tracking time, leaves, announcements, support tickets, and project tasks.</p>
          <p className="text-xs text-white/50 mt-2">All data is stored securely in your private database.</p>
        </CardContent>
      </Card>
    </div>
  )
}
