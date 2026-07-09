import { Resend } from "resend"

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

const FROM = "Cadenz <onboarding@resend.dev>"
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
        <div style="color:rgba(255,255,255,0.4);font-size:11px;">Cadenz CRM</div>
      </div>
    </div>

    <div style="padding:32px;">
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">Welcome to Cadenz, ${employee.name}!</h1>
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
        Sign in to Cadenz →
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
    subject: `Welcome to Cadenz — your login details`,
    html,
  })
}

export async function sendAdminWelcomeEmail(admin: {
  email: string
  orgName: string
}) {
  if (!resend) return { error: "RESEND_API_KEY not set" }

  const loginUrl = `${APP_URL}/login`

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">

    <div style="background:#0d0d0d;padding:28px 32px;">
      <div style="display:flex;align-items:center;gap:12px;">
        <img src="https://framerusercontent.com/images/T6zMkBq8OVUH1pVvYSkogfSLY.png" width="36" height="36" style="border-radius:8px;" alt="Binary Next"/>
        <div>
          <div style="color:#fff;font-weight:700;font-size:15px;">Binary Next</div>
          <div style="color:rgba(255,255,255,0.4);font-size:11px;">Cadenz CRM</div>
        </div>
      </div>
    </div>

    <div style="padding:32px;">
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">Your workspace is ready 🎉</h1>
      <p style="margin:0 0 24px;color:#64748b;font-size:14px;line-height:1.6;">
        <strong style="color:#0f172a;">${admin.orgName}</strong> has been created on Cadenz. You can now add employees, manage leaves, track attendance, and more.
      </p>

      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:6px 0;color:#94a3b8;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;width:100px;">Workspace</td>
            <td style="padding:6px 0;color:#0f172a;font-size:13px;font-weight:600;">${admin.orgName}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#94a3b8;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Admin email</td>
            <td style="padding:6px 0;color:#0f172a;font-size:13px;font-family:monospace;">${admin.email}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#94a3b8;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Portal</td>
            <td style="padding:6px 0;font-size:13px;"><a href="${loginUrl}" style="color:#512feb;text-decoration:none;">${APP_URL}/login</a></td>
          </tr>
        </table>
      </div>

      <a href="${loginUrl}" style="display:block;text-align:center;background:#512feb;color:#fff;text-decoration:none;padding:13px 24px;border-radius:10px;font-weight:600;font-size:14px;margin-bottom:20px;">
        Go to your dashboard →
      </a>

      <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">
        Need help? Reply to this email or visit our support page.
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
    to: admin.email,
    subject: `Your Cadenz workspace "${admin.orgName}" is ready`,
    html,
  })
}

export async function sendAdminInviteEmail(admin: {
  name: string
  email: string
  password: string
  orgName: string
}) {
  if (!resend) return { error: "RESEND_API_KEY not set" }

  const loginUrl = `${APP_URL}/login`

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
        <div style="color:rgba(255,255,255,0.4);font-size:11px;">Cadenz CRM</div>
      </div>
    </div>
    <div style="padding:32px;">
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">You've been added as an admin</h1>
      <p style="margin:0 0 24px;color:#64748b;font-size:14px;line-height:1.6;">
        Hi ${admin.name}, you now have admin access to <strong style="color:#0f172a;">${admin.orgName}</strong> on Cadenz.
      </p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:6px 0;color:#94a3b8;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;width:100px;">Workspace</td>
              <td style="padding:6px 0;color:#0f172a;font-size:13px;font-weight:600;">${admin.orgName}</td></tr>
          <tr><td style="padding:6px 0;color:#94a3b8;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Email</td>
              <td style="padding:6px 0;color:#0f172a;font-size:13px;font-family:monospace;">${admin.email}</td></tr>
          <tr><td style="padding:6px 0;color:#94a3b8;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Password</td>
              <td style="padding:6px 0;color:#0f172a;font-size:13px;font-family:monospace;">${admin.password}</td></tr>
          <tr><td style="padding:6px 0;color:#94a3b8;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Role</td>
              <td style="padding:6px 0;color:#0f172a;font-size:13px;">Administrator</td></tr>
        </table>
      </div>
      <a href="${loginUrl}" style="display:block;text-align:center;background:#512feb;color:#fff;text-decoration:none;padding:13px 24px;border-radius:10px;font-weight:600;font-size:14px;margin-bottom:20px;">
        Sign in to Cadenz →
      </a>
      <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">
        Please change your password after your first login.
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
    to: admin.email,
    subject: `You've been added as admin on Cadenz — ${admin.orgName}`,
    html,
  })
}

export type WeeklyDigestRow = {
  name: string
  hours: number
  activeHours: number
  daysWorked: number
  ticketsOpened: number
  lastFocus: string
}

export async function sendWeeklyDigest(toEmails: string[], orgName: string, weekLabel: string, rows: WeeklyDigestRow[]) {
  if (!resend) return { error: "RESEND_API_KEY not set" }
  if (toEmails.length === 0) return { error: "No recipients" }

  const rowsHtml = rows
    .sort((a, b) => b.hours - a.hours)
    .map(r => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:13px;font-weight:600;">${r.name}</td>
        <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:13px;text-align:right;">${r.hours.toFixed(1)}h</td>
        <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:13px;text-align:right;">${r.activeHours.toFixed(1)}h</td>
        <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:13px;text-align:right;">${r.daysWorked}</td>
        <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:13px;text-align:right;">${r.ticketsOpened}</td>
      </tr>`)
    .join("")

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
    <div style="background:#0d0d0d;padding:28px 32px;">
      <div style="color:#fff;font-weight:700;font-size:15px;">Cadenz · Weekly Digest</div>
      <div style="color:rgba(255,255,255,0.4);font-size:11px;margin-top:2px;">${orgName} · ${weekLabel}</div>
    </div>
    <div style="padding:32px;">
      <h1 style="margin:0 0 20px;font-size:18px;font-weight:700;color:#0f172a;">Last week at a glance</h1>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr>
            <th style="padding:6px 0;border-bottom:2px solid #0f172a;text-align:left;color:#64748b;font-size:11px;text-transform:uppercase;">Employee</th>
            <th style="padding:6px 0;border-bottom:2px solid #0f172a;text-align:right;color:#64748b;font-size:11px;text-transform:uppercase;">Hours</th>
            <th style="padding:6px 0;border-bottom:2px solid #0f172a;text-align:right;color:#64748b;font-size:11px;text-transform:uppercase;">Active</th>
            <th style="padding:6px 0;border-bottom:2px solid #0f172a;text-align:right;color:#64748b;font-size:11px;text-transform:uppercase;">Days</th>
            <th style="padding:6px 0;border-bottom:2px solid #0f172a;text-align:right;color:#64748b;font-size:11px;text-transform:uppercase;">Tickets</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      <a href="${APP_URL}/dashboard" style="display:block;text-align:center;background:#512feb;color:#fff;text-decoration:none;padding:13px 24px;border-radius:10px;font-weight:600;font-size:14px;margin-top:24px;">
        Open Cadenz →
      </a>
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
    to: toEmails,
    subject: `Cadenz weekly digest — ${orgName} (${weekLabel})`,
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
      <div style="color:#fff;font-weight:700;font-size:15px;">Cadenz · Password Reset</div>
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
    subject: `Cadenz — your password has been reset`,
    html,
  })
}
