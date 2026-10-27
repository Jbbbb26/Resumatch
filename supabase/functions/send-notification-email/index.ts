// Emails a user when an in-app notification is created (e.g. their application
// status changed). Called by a Supabase Database Webhook on INSERT into
// public.notifications, and sends through EmailJS.
//
// Secrets (Edge Functions > Secrets):
//   EMAILJS_SERVICE_ID, EMAILJS_PUBLIC_KEY, EMAILJS_PRIVATE_KEY   (already set for OTP emails)
//   EMAILJS_NOTIFICATION_TEMPLATE_ID   the template for these update emails
//   NOTIFICATION_WEBHOOK_SECRET        any long random string; also set as the webhook's
//                                      "x-webhook-secret" header
//   APP_URL                            e.g. https://your-app.vercel.app (links in the email)
// Optional:
//   EMAIL_TIMEZONE=Asia/Manila         time zone for interview times
//   EMAIL_RECRUITER_NOTIFICATIONS=true also email recruiters about new applicants etc.

import { createClient } from "npm:@supabase/supabase-js@2";
import { buildNotificationEmail, CANDIDATE_EMAIL_TYPES, RECRUITER_EMAIL_TYPES } from "./buildEmail.js";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const env = (name: string) => Deno.env.get(name) ?? "";

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // Only the database webhook knows this secret.
  const secret = env("NOTIFICATION_WEBHOOK_SECRET");
  if (!secret || req.headers.get("x-webhook-secret") !== secret) {
    console.error("Rejected request: missing or wrong x-webhook-secret.");
    return json({ error: "Unauthorized" }, 401);
  }

  let notification: Record<string, any>;
  try {
    const body = await req.json();
    if (body?.table !== "notifications" || body?.type !== "INSERT" || !body?.record) {
      return json({ skipped: "not a new notification" });
    }
    notification = body.record;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const allowed = [...CANDIDATE_EMAIL_TYPES, ...(env("EMAIL_RECRUITER_NOTIFICATIONS") === "true" ? RECRUITER_EMAIL_TYPES : [])];
  if (!allowed.includes(notification.type)) return json({ skipped: `type ${notification.type} is not emailed` });

  const missing = ["EMAILJS_SERVICE_ID", "EMAILJS_PUBLIC_KEY", "EMAILJS_PRIVATE_KEY", "EMAILJS_NOTIFICATION_TEMPLATE_ID", "APP_URL"]
    .filter((name) => !env(name));
  if (missing.length) {
    console.error(`Missing secrets: ${missing.join(", ")}`);
    return json({ error: "Email is not configured" }, 500);
  }

  const supabase = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(notification.user_id);
    const email = userData?.user?.email;
    if (userError || !email) throw new Error(`No email for user ${notification.user_id}: ${userError?.message ?? "not found"}`);
    const meta = userData.user.user_metadata ?? {};
    const recipientName = String(meta.full_name || meta.name || "").trim().split(/\s+/)[0] || "";

    let application = null;
    let companyName = "";
    if (notification.application_id) {
      const { data } = await supabase
        .from("applications")
        .select("status, interview_at, interview_mode, interview_location, interview_notes, candidate_feedback, job_postings(recruiter_id)")
        .eq("id", notification.application_id)
        .maybeSingle();
      application = data;
      const recruiterId = (data as any)?.job_postings?.recruiter_id;
      if (recruiterId) {
        const { data: employer } = await supabase.from("employers").select("companyName").eq("id", recruiterId).maybeSingle();
        companyName = employer?.companyName ?? "";
      }
    }

    const content = buildNotificationEmail({
      notification, application, companyName, recipientName,
      appUrl: env("APP_URL"), timeZone: env("EMAIL_TIMEZONE") || "Asia/Manila",
    });

    const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: env("EMAILJS_SERVICE_ID"),
        template_id: env("EMAILJS_NOTIFICATION_TEMPLATE_ID"),
        user_id: env("EMAILJS_PUBLIC_KEY"),
        accessToken: env("EMAILJS_PRIVATE_KEY"),
        template_params: {
          to_email: email,
          subject: content.subject,
          heading: content.heading,
          message: content.message,
          details_html: content.detailsHtml,
          details_text: content.detailsText,
          action_url: content.actionUrl,
          action_label: content.actionLabel,
        },
      }),
    });
    if (!response.ok) throw new Error(`EmailJS ${response.status}: ${await response.text()}`);

    console.log(`Emailed "${notification.type}" notification to ${email}`);
    return json({ sent: true });
  } catch (error) {
    console.error("Notification email failed:", (error as Error).message);
    return json({ error: "Failed to send email" }, 500);
  }
});
