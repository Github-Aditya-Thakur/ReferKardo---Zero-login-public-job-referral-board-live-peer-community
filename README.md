# ReferKardo (`#OpentoRefer`)

A frictionless, zero-login peer referral board designed to connect job seekers directly with verified employees offering open referrals.

## Overview

Traditional job portals bury open referral opportunities behind multi-step sign-ups and cold-DM bottlenecks. **ReferKardo** removes authentication friction so employees can publish active referral openings in seconds and candidates can filter roles, inspect requirements, and copy direct application/referral links with a single click.

## Key Features

- **Zero-Login Referral Workflow:** Instant browsing and referral posting without mandatory account creation or OAuth walls.
- **Multi-Faceted Search & Filtering:** Real-time filtering across company names, job roles, locations, experience tiers, and status tags.
- **One-Click Link & Contact Sharing:** Native Clipboard API integration for instant copying of referral links and referrer details.
- **Database-Enforced Security (RLS):** Powered by PostgreSQL Row-Level Security policies allowing anonymous `SELECT` and `INSERT` operations while preventing unauthorized `UPDATE` or `DELETE` mutations.
- **Responsive SaaS Interface:** Clean, mobile-first card grid built with Tailwind CSS v4 and Lucide vector iconography.

## Tech Stack & Architecture

- **Frontend:** React (SPA with Hooks: `useState`, `useEffect`, `useMemo`)
- **Build Tool:** Vite (`@vitejs/plugin-react`)
- **Styling:** Tailwind CSS v4 (`@tailwindcss/vite`)
- **Icons:** Lucide React
- **Database & API:** Supabase PostgreSQL + PostgREST (`@supabase/supabase-js`)
- **Testing:** Vitest
- **Hosting & CI/CD:** GitHub + Vercel Edge Network

## Local Development Setup

1. **Clone the repository and install dependencies:**
   ```bash
   git clone [https://github.com/](https://github.com/)<Github-Aditya-Thakur>/<referkardo-repo>.git
   cd <referkardo-repo>
   npm install
