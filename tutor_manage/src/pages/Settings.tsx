import React from 'react';
import { motion } from 'framer-motion';
import {
  Settings as SettingsIcon, Palette, User, LogOut, Keyboard, Github, Heart, Check,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const APP_VERSION = '1.1.0';

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ['⌘ / Ctrl', 'K'], label: 'Open command palette' },
  { keys: ['?'], label: 'Show keyboard shortcuts' },
  { keys: ['↑', '↓'], label: 'Navigate command palette results' },
  { keys: ['↵'], label: 'Open selected result' },
  { keys: ['Esc'], label: 'Close any open dialog' },
];

const THEME_PREVIEW: Record<string, string> = {
  vibrant:  'linear-gradient(135deg, #4f46e5, #9333ea, #3b82f6, #ec4899)',
  midnight: 'linear-gradient(135deg, #0f172a, #1e1b4b, #0c0a1f, #1e293b)',
  sunset:   'linear-gradient(135deg, #f97316, #ec4899, #db2777, #f59e0b)',
  forest:   'linear-gradient(135deg, #064e3b, #047857, #0f766e, #134e4a)',
};

export default function Settings() {
  const { user, logout } = useAuth();
  const { theme, setTheme, themes } = useTheme();

  return (
    <div className="space-y-8 max-w-4xl mx-auto relative z-10">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight drop-shadow-sm flex items-center gap-3">
          <SettingsIcon className="w-8 h-8" />
          Settings
        </h1>
        <p className="text-base text-white/80 mt-2 font-medium">
          Personalize your workspace and review keyboard shortcuts.
        </p>
      </div>

      {/* Profile */}
      <Card title="Profile" icon={<User className="w-5 h-5" />}>
        <div className="flex items-center gap-5">
          {user?.photoURL ? (
            <img src={user.photoURL} alt="" referrerPolicy="no-referrer"
                 className="w-16 h-16 rounded-2xl border-2 border-white/30 shadow-lg" />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-white/10 border-2 border-white/30 flex items-center justify-center text-white font-black text-2xl shadow-lg">
              {user?.email?.charAt(0).toUpperCase() || '?'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-white font-extrabold text-lg truncate">{user?.displayName || 'User'}</p>
            <p className="text-white/70 font-semibold text-sm truncate">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-white border border-rose-400/40 rounded-xl text-sm font-bold transition-all"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </Card>

      {/* Theme */}
      <Card title="Appearance" icon={<Palette className="w-5 h-5" />}>
        <p className="text-sm text-white/70 font-semibold mb-4">
          Pick a gradient theme. Your choice is saved on this device.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {themes.map(t => {
            const active = t.id === theme;
            return (
              <motion.button
                key={t.id}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setTheme(t.id)}
                className={`relative h-28 rounded-2xl overflow-hidden border-2 transition-all shadow-lg ${
                  active ? 'border-white' : 'border-white/15 hover:border-white/40'
                }`}
                style={{ background: THEME_PREVIEW[t.id] }}
                aria-pressed={active}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between">
                  <span className="text-white font-extrabold text-sm drop-shadow-md">{t.label}</span>
                  {active && (
                    <span className="w-6 h-6 rounded-full bg-white text-slate-900 flex items-center justify-center shadow-md">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      </Card>

      {/* Shortcuts */}
      <Card title="Keyboard Shortcuts" icon={<Keyboard className="w-5 h-5" />}>
        <ul className="divide-y divide-white/10">
          {SHORTCUTS.map(s => (
            <li key={s.label} className="flex items-center justify-between py-3">
              <span className="text-white/90 font-semibold text-sm">{s.label}</span>
              <span className="flex items-center gap-1.5">
                {s.keys.map((k, i) => (
                  <React.Fragment key={k}>
                    <kbd className="text-[11px] font-bold text-white bg-white/10 border border-white/20 rounded-md px-2 py-1 shadow-sm">
                      {k}
                    </kbd>
                    {i < s.keys.length - 1 && <span className="text-white/40 text-xs font-bold">+</span>}
                  </React.Fragment>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      {/* About */}
      <Card title="About" icon={<Heart className="w-5 h-5" />}>
        <div className="space-y-3 text-sm">
          <Row label="App" value="TutorManage" />
          <Row label="Version" value={APP_VERSION} />
          <Row label="Stack" value="React 19 · Vite 6 · Firebase · Tailwind" />
          <Row
            label="Source"
            value={
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-indigo-200 hover:text-white font-bold"
              >
                <Github className="w-3.5 h-3.5" /> View on GitHub
              </a>
            }
          />
        </div>
      </Card>
    </div>
  );
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-lg">
      <div className="flex items-center gap-2 mb-5 text-white">
        {icon}
        <h3 className="text-lg font-extrabold tracking-tight">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-white/10 pb-3 last:border-0 last:pb-0">
      <span className="text-white/60 font-semibold">{label}</span>
      <span className="text-white font-bold">{value}</span>
    </div>
  );
}
