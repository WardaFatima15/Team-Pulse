import { Resend } from "resend"

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

const FROM = "TeamPulse <onboarding@resend.dev>"
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://crm-app-blue-phi.vercel.app"

export async function sendWelcomeEmail(employee: {
  name: string
  email: string
  role: string
  department: string
  password: string
}) {
  if (!resend) return { error: "RESEND_API_KEY not set" }

  const loginUrl = `${APP_URL}/employee/login`

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">

    <div style="background:#0d0d0d;padding:28px 32px;display:flex;align-items:center;gap:12px;">
      <img src="https://framerusercontent.com/images/T6zMkBq8OVUH1pVvYSkogfSLY.png" width="36" height="36" style="border-radius:8px;" alt="Binary Next"/>
      <div>
        <div style="color:#fff;font-weight:700;font-size:15px;">Binary Next</div>
        <div style="color:rgba(255,255,255,0.4);font-size:11px;">TeamPulse CRM</div>
      </div>
    </div>

    <div style="padding:32px;">
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">Welcome to TeamPulse, ${employee.name}!</h1>
      <p style="margin:0 0 24px;color:#64748b;font-size:14px;line-height:1.6;">
        Your account has been created. Here are your login credentials:
      </p>

      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:6px 0;color:#94a3b8;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;width:100px;">Portal</td>
              <td style="padding:6px 0;color:#0f172a;font-size:13px;">Employee Portal</td></tr>
          <tr><td style="padding:6px 0;color:#94a3b8;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Email</td>
              <td style="padding:6px 0;color:#0f172a;font-size:13px;font-family:monospace;">${employee.email}</td></tr>
          <tr><td style="padding:6px 0;color:#94a3b8;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Password</td>
              <td style="padding:6px 0;color:#0f172a;font-size:13px;font-family:monospace;">${employee.password}</td></tr>
          <tr><td style="padding:6px 0;color:#94a3b8;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Role</td>
              <td style="padding:6px 0;color:#0f172a;font-size:13px;">${employee.role} · ${employee.department}</td></tr>
        </table>
      </div>

      <a href="${loginUrl}" style="display:block;text-align:center;background:#512feb;color:#fff;text-decoration:none;padding:13px 24px;border-radius:10px;font-weight:600;font-size:14px;margin-bottom:20px;">
        Sign in to TeamPulse →
      </a>

      <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">
        Please change your password after your first login. If you have any issues, contact your admin.
      </p>
    </div>

    <div style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;">
      <p style="margin:0;color:#cbd5e1;font-size:11px;text-align:center;">
        Powered by <a href="https://binarynext.io" style="color:#512feb;text-decoration:none;">Binary Next</a> · AI Automation Partner
      </p>
    </div>
  </div>
</body>
</html>`

  return resend.emails.send({
    from: FROM,
    to: employee.email,
    subject: `Welcome to TeamPulse — your login details`,
    html,
  })
}

export async function sendPasswordResetEmail(employee: {
  name: string
  email: string
  newPassword: string
}) {
  if (!resend) return { error: "RESEND_API_KEY not set" }

  const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
    <div style="background:#0d0d0d;padding:24px 32px;">
      <div style="color:#fff;font-weight:700;font-size:15px;">TeamPulse · Password Reset</div>
    </div>
    <div style="padding:32px;">
      <h2 style="margin:0 0 12px;color:#0f172a;">Hi ${employee.name},</h2>
      <p style="color:#64748b;font-size:14px;">Your password has been reset by your admin.</p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin:20px 0;">
        <div style="color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">New password</div>
        <div style="font-family:monospace;font-size:16px;color:#0f172a;font-weight:600;">${employee.newPassword}</div>
      </div>
      <a href="${APP_URL}/employee/login" style="display:block;text-align:center;background:#512feb;color:#fff;text-decoration:none;padding:12px;border-radius:10px;font-weight:600;font-size:14px;">Sign in now →</a>
    </div>
  </div>
</body>
</html>`

  return resend.emails.send({
    from: FROM,
    to: employee.email,
    subject: `TeamPulse — your password has been reset`,
    html,
  })
}
