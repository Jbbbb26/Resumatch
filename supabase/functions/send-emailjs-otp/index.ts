// Supabase "Send Email" auth hook: sends sign-up and password-reset codes
// through EmailJS instead of Supabase's built-in mailer.
//
// Required secrets (Supabase Dashboard > Edge Functions > Secrets, or `supabase secrets set`):
//   EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY, EMAILJS_PRIVATE_KEY
//   SEND_EMAIL_HOOK_SECRET  (generated when you create the hook in Authentication > Hooks)
//
// The EmailJS template receives: {{to_email}}, {{otp_code}}, {{email_type}}.

import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

interface AuthHookPayload {
  user: { email: string };
  email_data: {
    token: string;
    email_action_type: string;
  };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const SUBJECT_TYPES: Record<string, string> = {
  signup: "Confirm your ResuMatch account",
  recovery: "Reset your ResuMatch password",
};

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: { message: "Method not allowed" } }, 405);

  // 1. Only accept requests signed by Supabase Auth (stops strangers using your EmailJS quota).
  const hookSecret = (Deno.env.get("SEND_EMAIL_HOOK_SECRET") ?? "").replace("v1,whsec_", "");
  if (!hookSecret) {
    console.error("SEND_EMAIL_HOOK_SECRET is not set.");
    return json({ error: { message: "Email hook is not configured." } }, 500);
  }

  let payload: AuthHookPayload;
  try {
    const raw = await req.text();
    payload = new Webhook(hookSecret).verify(raw, Object.fromEntries(req.headers)) as AuthHookPayload;
  } catch (error) {
    console.error("Rejected unsigned/invalid hook request:", error?.message);
    return json({ error: { message: "Invalid signature" } }, 401);
  }

  const { user, email_data } = payload;

  // 2. This app only uses codes for sign-up and password reset.
  if (!SUBJECT_TYPES[email_data.email_action_type]) {
    console.warn(`Skipping "${email_data.email_action_type}" email for ${user.email} (not handled by this hook).`);
    return json({});
  }

  // 3. Send through EmailJS's REST API.
  const missing = ["EMAILJS_SERVICE_ID", "EMAILJS_TEMPLATE_ID", "EMAILJS_PUBLIC_KEY", "EMAILJS_PRIVATE_KEY"]
    .filter((name) => !Deno.env.get(name));
  if (missing.length) {
    console.error(`Missing EmailJS secrets: ${missing.join(", ")}`);
    return json({ error: { message: "Email service is not configured." } }, 500);
  }

  try {
    const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: Deno.env.get("EMAILJS_SERVICE_ID"),
        template_id: Deno.env.get("EMAILJS_TEMPLATE_ID"),
        user_id: Deno.env.get("EMAILJS_PUBLIC_KEY"),
        accessToken: Deno.env.get("EMAILJS_PRIVATE_KEY"),
        template_params: {
          to_email: user.email,
          otp_code: email_data.token, // the 6-digit code Supabase generated
          email_type: SUBJECT_TYPES[email_data.email_action_type],
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`EmailJS error ${response.status}:`, errorText);
      return json({ error: { message: "Failed to send email" } }, 500);
    }
    return json({});
  } catch (error) {
    console.error("EmailJS request failed:", error?.message);
    return json({ error: { message: "Failed to send email" } }, 500);
  }
});
