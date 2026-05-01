# TutorManage

An offline-first web app for tutors to manage batches and students, track attendance, and manage/monitor tuition fees.

## Tech Stack

- **Frontend:** React 19 + TypeScript
- **Build tool:** Vite 6
- **Styling:** Tailwind CSS v4 (via @tailwindcss/vite plugin)
- **Routing:** react-router-dom v7
- **UI:** framer-motion, lucide-react, sonner (toasts)
- **Backend/Data:** Firebase (Firestore + Google Auth)

## Project Structure

```
tutor_manage/
├── src/
│   ├── main.tsx               # App entry point
│   ├── App.tsx                # Routing + providers
│   ├── firebase.ts            # Firebase initialization
│   ├── contexts/
│   │   ├── AuthContext.tsx    # Firebase Auth (Google sign-in)
│   │   └── ThemeContext.tsx   # Theme handling
│   ├── pages/
│   │   ├── Login.tsx          # Login with Google
│   │   ├── Dashboard.tsx      # Main dashboard
│   │   ├── BatchDetails.tsx   # Batch detail view
│   │   ├── StudentDetails.tsx # Student detail view
│   │   ├── Analytics.tsx      # Analytics page
│   │   ├── Reports.tsx        # Reports page
│   │   └── Settings.tsx       # Settings page
│   ├── components/
│   │   ├── Layout.tsx         # Navigation + layout
│   │   ├── CommandPalette.tsx # Quick-command UI
│   │   ├── CalendarView.tsx   # Calendar component
│   │   ├── NotificationsBell.tsx
│   │   └── ShortcutsDialog.tsx
│   ├── services/
│   │   └── db.ts              # Firestore CRUD + realtime subscriptions
│   └── models/
│       └── types.ts           # TypeScript types (Batch, Student, Attendance, Fee)
├── firebase-applet-config.json  # Firebase client config (public, safe to commit)
├── firestore.rules              # Firestore security rules
├── vite.config.ts
└── package.json
```

## Authentication

Uses Firebase Auth with Google Sign-in via popup. Protected routes redirect unauthenticated users to `/login`. Firestore rules enforce per-user data isolation via `request.auth.uid`.

## Data Model

- **batches** — tutor's class batches
- **students** — students per batch
- **attendance** — per-student daily attendance (Present/Absent/Holiday)
- **fees** — fee records per student (Paid/Unpaid)

## Running the App

The workflow runs: `cd tutor_manage && npm run dev`
App is served at port 5000.

## Deployment

Static deployment via Vite build:
- Build command: `cd tutor_manage && npm install && npm run build`
- Public dir: `tutor_manage/dist`
