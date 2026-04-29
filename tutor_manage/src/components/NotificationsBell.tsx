import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, AlertTriangle, AlertCircle, Info, ChevronRight, Sparkles } from 'lucide-react';
import {
  subscribeToBatches,
  subscribeToStudents,
  subscribeAllFees,
  subscribeAllAttendance,
} from '../services/db';
import { Batch, Student, Fee, Attendance } from '../models/types';
import { buildInsights, Insight, InsightSeverity } from '../utils/insights';

const SEVERITY_STYLES: Record<InsightSeverity, { dot: string; chip: string; icon: React.ReactNode }> = {
  critical: { dot: 'bg-rose-400',    chip: 'bg-rose-500/20 text-rose-200 border-rose-400/30',    icon: <AlertCircle className="w-4 h-4" /> },
  warn:     { dot: 'bg-amber-400',   chip: 'bg-amber-500/20 text-amber-200 border-amber-400/30', icon: <AlertTriangle className="w-4 h-4" /> },
  info:     { dot: 'bg-sky-400',     chip: 'bg-sky-500/20 text-sky-200 border-sky-400/30',       icon: <Info className="w-4 h-4" /> },
};

const STORAGE_KEY = 'tutor-manage-notifications-seen';

export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as string[];
      setSeenIds(new Set(stored));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const u1 = subscribeToBatches(setBatches);
    const u2 = subscribeToStudents(null, setStudents);
    const u3 = subscribeAllFees(setFees);
    const u4 = subscribeAllAttendance(setAttendance);
    return () => { u1(); u2(); u3(); u4(); };
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const insights: Insight[] = useMemo(
    () => buildInsights(batches, students, fees, attendance),
    [batches, students, fees, attendance],
  );

  const unseenCount = useMemo(
    () => insights.filter(i => !seenIds.has(i.id)).length,
    [insights, seenIds],
  );

  const markAllSeen = () => {
    const allIds = insights.map(i => i.id);
    setSeenIds(new Set(allIds));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allIds));
  };

  const handleClick = (insight: Insight) => {
    setSeenIds(prev => {
      const next = new Set(prev);
      next.add(insight.id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)));
      return next;
    });
    if (insight.href) {
      navigate(insight.href);
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2.5 bg-white/10 border border-white/20 text-white hover:bg-white/20 hover:border-white/30 rounded-xl transition-all shadow-sm group"
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4 group-hover:rotate-12 transition-transform" />
        {unseenCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center border-2 border-slate-900/30 shadow-md">
            {unseenCount > 9 ? '9+' : unseenCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="absolute right-0 mt-2 w-[380px] max-w-[92vw] bg-slate-900/85 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl overflow-hidden z-50"
          >
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-300" />
                <h3 className="text-sm font-extrabold text-white">Smart Notifications</h3>
              </div>
              {insights.length > 0 && (
                <button
                  onClick={markAllSeen}
                  className="text-[11px] font-bold text-white/60 hover:text-white"
                >
                  Mark all read
                </button>
              )}
            </div>

            <ul className="max-h-[420px] overflow-y-auto custom-scrollbar p-2">
              {insights.length === 0 ? (
                <li className="px-5 py-12 text-center text-white/60 text-sm font-bold">
                  <Bell className="w-8 h-8 mx-auto mb-3 opacity-40" />
                  You're all caught up.
                </li>
              ) : insights.slice(0, 25).map(i => {
                const style = SEVERITY_STYLES[i.severity];
                const isUnseen = !seenIds.has(i.id);
                return (
                  <li key={i.id}>
                    <button
                      onClick={() => handleClick(i)}
                      className="w-full text-left px-3 py-3 rounded-xl flex items-start gap-3 hover:bg-white/5 transition group"
                    >
                      <div className={`mt-0.5 w-8 h-8 rounded-lg border ${style.chip} flex items-center justify-center shrink-0`}>
                        {style.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {isUnseen && <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />}
                          <p className="text-white font-bold text-sm truncate">{i.title}</p>
                        </div>
                        <p className="text-white/60 text-xs font-semibold mt-0.5 line-clamp-2">{i.description}</p>
                      </div>
                      {i.href && (
                        <ChevronRight className="w-4 h-4 text-white/40 group-hover:translate-x-0.5 transition-transform mt-2" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
