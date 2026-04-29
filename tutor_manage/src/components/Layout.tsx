import React, { useEffect, useState } from 'react';
import { useLocation, Link, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  LogOut, LayoutDashboard, GraduationCap, Activity, FileText,
  Search, Palette, Menu, X
} from 'lucide-react';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import CommandPalette from './CommandPalette';
import {
  subscribeToBatches,
  subscribeToStudents,
} from '../services/db';
import { Batch, Student } from '../models/types';

export default function Layout() {
  const { logout, user } = useAuth();
  const { theme, cycleTheme, themes } = useTheme();
  const location = useLocation();

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  useEffect(() => {
    const u1 = subscribeToBatches(setBatches);
    const u2 = subscribeToStudents(null, setStudents);
    return () => { u1(); u2(); };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k';
      if (isCmdK) {
        e.preventDefault();
        setPaletteOpen(o => !o);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Analytics', path: '/analytics', icon: Activity },
    { name: 'Reports',   path: '/reports',   icon: FileText },
  ];

  const themeLabel = themes.find(t => t.id === theme)?.label || theme;

  return (
    <div className="min-h-screen flex flex-col font-sans relative bg-transparent overflow-hidden">
      {/* Background Animated Orbs */}
      <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-white/10 blur-[120px] mix-blend-overlay animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-white/10 blur-[120px] mix-blend-overlay animate-pulse" style={{ animationDuration: '10s' }} />
        <div className="absolute bottom-[-10%] left-[20%] w-[50%] h-[50%] rounded-full bg-white/10 blur-[120px] mix-blend-overlay animate-pulse" style={{ animationDuration: '12s' }} />
      </div>

      <nav className="no-print sticky top-0 z-30 bg-white/10 backdrop-blur-xl border-b border-white/20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/dashboard" className="flex-shrink-0 flex items-center gap-3">
                <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-xl text-white tracking-tight drop-shadow-sm">TutorManage</span>
              </Link>
              <div className="hidden md:ml-8 md:flex md:space-x-6">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname.startsWith(item.path);
                  return (
                    <Link
                      key={item.name}
                      to={item.path}
                      className={clsx(
                        'inline-flex items-center px-1 pt-1 border-b-2 text-sm font-semibold transition-all relative group',
                        isActive
                          ? 'border-white text-white'
                          : 'border-transparent text-white/60 hover:text-white'
                      )}
                    >
                      <Icon className={clsx("w-4 h-4 mr-2 transition-transform group-hover:scale-110", isActive ? "text-white" : "text-white/50")} />
                      {item.name}
                      {isActive && (
                        <motion.div
                          layoutId="navIndicator"
                          className="absolute bottom-[-2px] left-0 right-0 h-0.5 bg-white rounded-t-full shadow-[0_-2px_10px_rgba(255,255,255,0.5)]"
                          initial={false}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Search trigger */}
              <button
                onClick={() => setPaletteOpen(true)}
                className="hidden sm:inline-flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white/70 hover:text-white text-xs font-bold transition-all shadow-sm"
                title="Search (Cmd/Ctrl + K)"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Search…</span>
                <kbd className="hidden lg:inline ml-1 text-[10px] font-bold bg-white/15 border border-white/20 rounded px-1.5 py-0.5">⌘K</kbd>
              </button>

              {/* Theme cycle */}
              <button
                onClick={cycleTheme}
                className="p-2.5 bg-white/10 border border-white/20 text-white hover:bg-white/20 hover:border-white/30 rounded-xl transition-all shadow-sm group"
                title={`Theme: ${themeLabel} (click to change)`}
              >
                <Palette className="w-4 h-4 group-hover:rotate-12 transition-transform" />
              </button>

              {/* User chip */}
              <div className="hidden md:flex items-center gap-3 ml-1">
                <div className="flex flex-col items-end">
                  <span className="text-sm font-bold text-white leading-tight max-w-[140px] truncate">{user?.displayName || 'User'}</span>
                  <span className="text-[11px] font-medium text-white/70 max-w-[180px] truncate">{user?.email}</span>
                </div>
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="w-9 h-9 rounded-full border-2 border-white/30 shadow-md" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-white/20 border-2 border-white/40 shadow-md flex items-center justify-center text-white font-bold text-sm">
                    {user?.email?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <button
                onClick={logout}
                className="hidden md:inline-flex p-2.5 bg-white/10 border border-white/20 text-white hover:bg-white/20 hover:border-white/30 transition-all shadow-sm group rounded-xl"
                title="Logout"
              >
                <LogOut className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              </button>

              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileNavOpen(o => !o)}
                className="md:hidden p-2.5 bg-white/10 border border-white/20 text-white rounded-xl"
                aria-label="Toggle navigation"
              >
                {mobileNavOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Mobile nav */}
          <AnimatePresence>
            {mobileNavOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="md:hidden overflow-hidden"
              >
                <div className="py-4 space-y-2 border-t border-white/10">
                  {navItems.map(item => {
                    const Icon = item.icon;
                    const isActive = location.pathname.startsWith(item.path);
                    return (
                      <Link
                        key={item.name}
                        to={item.path}
                        className={clsx(
                          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold',
                          isActive ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10'
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        {item.name}
                      </Link>
                    );
                  })}
                  <button
                    onClick={() => { setPaletteOpen(true); setMobileNavOpen(false); }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-white/80 hover:bg-white/10 w-full"
                  >
                    <Search className="w-4 h-4" /> Search
                  </button>
                  <button
                    onClick={logout}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-white/80 hover:bg-white/10 w-full"
                  >
                    <LogOut className="w-4 h-4" /> Logout
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 15, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -15, filter: 'blur(8px)' }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        batches={batches}
        students={students}
      />
    </div>
  );
}
