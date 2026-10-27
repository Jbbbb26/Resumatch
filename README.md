# ResuMatch

AI-assisted job matching: candidates upload a resume and get per-requirement match scores;
recruiters post jobs, review applicants and move them through a hiring pipeline.

## Project layout

```
index.html                 App entry page
assets/                    App icon
src/
  App.jsx, main.jsx, index.css
  presentation/
    pages/                 Full pages: Login, Signup, CandidateDashboard, RecruiterDashboard,
                           JobDetailsPage, CompanyProfilePage, PipelinePage, LegalPage
    components/            Reusable UI: modals, TopHeader, NotificationBell, ShareButton,
                           GuestHeader, SignInPrompt, ...
      pipeline/            Pipeline board, columns, cards, drawer and dialogs
  hooks/                   Data hooks: useJobs, useApplyToJob, usePipeline,
                           useNotifications, ...
  data/                    Shared constants and data: jobOptions, pipelineStages,
                           applicationForm, jobAttachments
    services/              Supabase / API helpers and logic: authService, apiClient,
                           matchScoring, jobText, companyMedia, publicData, returnPath
supabaseClient.js          Supabase client for the browser
server.js                  Express API (deployed to Railway)
matchAnalysis.js           Per-requirement match scoring (Gemini embeddings)
loginLimiter.js            Sign-in attempt limits
resumeParser.js            Resume reading with Gemini
supabase/                  Migrations, Edge Functions and setup guide (supabase/README.md)
scripts/                   One-off maintenance scripts
tests/                     Node tests (npm test)
```

The server imports `src/data/jobOptions.js`, so the job options stay the same in the
browser and the API.

## Commands

| Command | What it does |
|---------|--------------|
| `npm run dev` | API on :3000 and Vite on :5173 (calls to `/api` are proxied) |
| `npm run build` | Production frontend build into `dist/` |
| `npm start` | Start the API (`node server.js`) |
| `npm test` | Run the tests |

Environment variables: copy `.env.example` to `.env` (one file at the repo root for both
the frontend and the API). Supabase setup: see `supabase/README.md`.
