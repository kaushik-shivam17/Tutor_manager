# TutorManage

An offline-first web app for tutors to manage batches, students, attendance, and fees. Built with React 19 + Vite 6, TypeScript, Tailwind CSS v4, and Firebase (Firestore + Auth).

## Project Structure

The application code lives inside the `tutor_manage/` directory.

- `tutor_manage/src/`
  - `pages/` — `Dashboard`, `Analytics`, `Reports`, `Settings`, `BatchDetails`, `StudentDetails`, `Login`
  - `components/` — `Layout`, `CommandPalette`, `NotificationsBell`, `ShortcutsDialog`, `CalendarView`, `ErrorBoundary`
  - `contexts/` — `AuthContext`, `ThemeContext`
  - `services/` — `db.ts` (Firestore subscriptions and mutations)
  - `models/` — TypeScript types
  - `utils/` — `csv.ts`, `insights.ts` (smart-notification builder), `firestoreErrorHandler.ts`
- `tutor_manage/public/manifest.webmanifest`, `tutor_manage/public/icon.svg` — PWA assets
- `tutor_manage/index.html`, `vite.config.ts`, `tsconfig.json`
- `tutor_manage/firebase-applet-config.json` — Firebase project config
- `tutor_manage/vercel.json` — Vercel SPA config when deploying with `tutor_manage/` as the root
- `vercel.json` (repo root) — Vercel config for deploying the whole repo

## Features

- **Dashboard** — KPIs, batch list, smart search, pending-fees action center with WhatsApp reminders
- **Analytics** — Live charts for revenue (last 6 months), attendance trend (14 days), per-batch performance, top paying students
- **Reports** — Filterable CSV export for students, fees, attendance + printable summary
- **Settings** — Profile card, visual theme picker, keyboard shortcuts, app/version info
- **Smart Notifications** — Bell in nav surfaces overdue students, pending-fees per batch, low-attendance batches, new joiners, empty batches; unseen state persisted to localStorage
- **Command Palette** — Cmd/Ctrl + K to instantly search batches, students, and pages
- **Keyboard Shortcuts dialog** — Press `?` anywhere to view shortcuts
- **Theme switcher** — Cycle through Vibrant, Midnight, Sunset, Forest gradients (persisted in localStorage)
- **PWA** — Installable manifest + SVG icon, standalone display, theme color, Apple touch metadata
- **Mobile-friendly nav** with hamburger menu

## Replit Setup

- **Workflow:** `Start application` runs `cd tutor_manage && npm run dev` and serves on port 5000 (webview)
- **Frontend host:** `0.0.0.0:5000`, `allowedHosts: true` in Vite config so the Replit iframe proxy can reach it
- **Replit Deployment:** Configured as static — build runs `npm install && npm run build` inside `tutor_manage/`, output served from `tutor_manage/dist`

## Vercel Deployment

Two equally good options:

1. **Deploy the repo root.** The root `vercel.json` already builds `tutor_manage/` and serves `tutor_manage/dist` with SPA rewrites, immutable asset caching, and security headers.
2. **Deploy `tutor_manage/` as the project root.** The framework will be auto-detected as Vite; `tutor_manage/vercel.json` provides SPA rewrites and the same headers.

Production build is code-split into `react`, `firebase`, `router`, `motion`, `date`, `icons`, and `vendor` chunks for optimal caching.

## Authentication

Google sign-in via Firebase. The configured Firebase project must whitelist the deployed domain (e.g. `<project>.vercel.app`) under Firebase Auth → Settings → Authorized domains.
