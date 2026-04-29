# TutorManage

An offline-first web app for tutors to manage batches, students, attendance, and fees. Built with React 19 + Vite 6, TypeScript, Tailwind CSS v4, and Firebase (Firestore + Auth).

## Project Structure

The application code lives inside the `tutor_manage/` directory.

- `tutor_manage/src/` — React source code (components, pages, contexts, services, models, utils)
- `tutor_manage/index.html` — Vite entry
- `tutor_manage/vite.config.ts` — Vite config (configured for Replit: host `0.0.0.0`, port `5000`, all hosts allowed)
- `tutor_manage/firebase-applet-config.json` — Firebase project config
- `tutor_manage/package.json` — Dependencies and scripts

## Replit Setup

- **Workflow:** `Start application` runs `cd tutor_manage && npm run dev` and serves on port 5000 (webview).
- **Frontend host:** `0.0.0.0:5000`, `allowedHosts: true` in Vite config so the Replit iframe proxy can reach it.
- **Deployment:** Configured as a static deployment. Build runs `npm install && npm run build` inside `tutor_manage/`, and the published output comes from `tutor_manage/dist`.

## Optional Environment Variables

- `GEMINI_API_KEY` — Used by the Google GenAI integration (`@google/genai`). Set as a Replit Secret if AI features are needed.

## Notes

- The original setup used port 3000 and Vercel deployment. It was adapted for Replit by switching to port 5000, allowing all hosts in Vite, and configuring static deployment.
