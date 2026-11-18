# ReferKardo (#OpentoRefer) — Zero-Login Job Referral & Peer Community Board

A zero-signup public referral platform where candidates share job referral requests (Company, Job ID, Standout Differentiator, and Google Drive Resume/Cover Letter links) alongside collapsible anonymous feedback threads and a real-time community lounge.

## Key Engineering Highlights
- **Frontend:** React, Vite, Tailwind CSS, Lucide Icons, custom SVG circular emblem
- **Backend & Database:** Supabase PostgreSQL REST API with Row-Level Security (RLS) policies and automatic 48-hour stale-post expiration
- **Automated QA:** Unit-tested input validation, HTTPS Google Drive link verification, chat/comment rules, and 48-hour expiry logic via **Vitest** (see `TEST_REPORT.md`)