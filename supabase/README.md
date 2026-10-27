# ResuMatch – Supabase setup

Everything the app needs in Supabase, in the order to set it up.
Project ref: `nfxfmnojongilmfbtmnl`

## 1. Database migrations (SQL Editor → New query → paste → Run)

Run each file in `supabase/migrations/` once, **in this order**. All of them are safe to run again.

| # | File | Adds |
|---|------|------|
| 1 | `20261009_fix_candidate_names_and_resume_delete.sql` | Candidate name fixes, resume delete |
| 2 | `20261009b_apply_once_and_reapply.sql` | One application per job, 30-day re-apply rule |
| 3 | `20261013_job_listing_archive_and_hiring_status.sql` | Open/closed and archived jobs |
| 4 | `20261013_job_listing_attachments.sql` | Job attachments |
| 5 | `20261013_recruiter_pipeline.sql` | Pipeline stages and history |
| 6 | `20261014_candidate_application_forms.sql` | Application details, `apply_to_job` |
| 7 | `20261024_job_match_analysis.sql` | Per-requirement match score cache |
| 8 | `20261025_employer_profile_fields.sql` | Company website, size, location, description |
| 9 | `20261025b_notifications.sql` | In-app notifications (bell) |
| 10 | `20261025c_job_salary_and_filters.sql` | Optional salary, experience level, category |
| 11 | `20261025d_application_interview_and_feedback.sql` | Interview scheduling, candidate feedback |
| 12 | `20261025e_withdraw_application.sql` | Candidates can withdraw applications |
| 13 | `20261025f_company_logo_and_gallery.sql` | Company logo and 5-photo gallery (`company-media` bucket) |
| 14 | `20261025g_login_attempt_limits.sql` | Sign-in attempt limits and cooldowns |
| 15 | `20261025h_messaging.sql` | Recruiter ↔ applicant messages |
| 16 | `20261025i_public_job_and_company.sql` | Public job and company pages for shared links (signed-out visitors) |

The `get_recommended_jobs` function and the base tables (`job_postings`, `candidate_profiles`,
`employers`, `applications`) were created in the dashboard before these files existed.

## 2. Edge Functions

Deploy from the project folder (PowerShell: use `npx.cmd` if `npx` is blocked):

```
npx supabase functions deploy send-emailjs-otp --project-ref nfxfmnojongilmfbtmnl --no-verify-jwt
npx supabase functions deploy send-notification-email --project-ref nfxfmnojongilmfbtmnl --no-verify-jwt
```

| Function | Triggered by | Purpose |
|----------|--------------|---------|
| `send-emailjs-otp` | Authentication → Hooks → **Send Email** hook (HTTPS) | Sign-up and password-reset codes |
| `send-notification-email` | Integrations → **Database Webhooks**: `notifications`, Insert, header `x-webhook-secret` | Emails for status changes and interview updates |

## 3. Edge Function secrets (Edge Functions → Secrets, or `supabase secrets set`)

| Secret | Used by |
|--------|---------|
| `EMAILJS_SERVICE_ID`, `EMAILJS_PUBLIC_KEY`, `EMAILJS_PRIVATE_KEY` | both email functions |
| `EMAILJS_TEMPLATE_ID` | OTP template |
| `SEND_EMAIL_HOOK_SECRET` | OTP hook signature (from the Send Email hook) |
| `EMAILJS_NOTIFICATION_TEMPLATE_ID` | update-email template |
| `NOTIFICATION_WEBHOOK_SECRET` | must equal the webhook's `x-webhook-secret` header |
| `APP_URL` | link in update emails (your Vercel URL) |
| `EMAIL_TIMEZONE` *(optional)* | interview time zone, default `Asia/Manila` |
| `EMAIL_RECRUITER_NOTIFICATIONS` *(optional)* | `true` to also email recruiters |

EmailJS: **Account → Security → Allow EmailJS API for non-browser applications** must be on,
and each template's **To Email** must be exactly `{{to_email}}`.

## 4. Server environment (`.env` locally, Railway → Variables in production)

See `.env.example`. Required: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `GEMINI_API_KEY`,
`SUPABASE_ANON_KEY`, and `CORS_ORIGINS` in production.

## 5. Free-plan reminders

- 500 MB database, 1 GB file storage, 2M realtime messages / month.
- The project pauses after 7 days without activity — restore it from the dashboard.
- Usage: Organization settings → Usage.
