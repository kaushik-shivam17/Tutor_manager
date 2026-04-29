import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, ArrowRight, Users, BookOpen, LayoutDashboard, Activity,
  FileText, Phone
} from 'lucide-react';
import { Batch, Student } from '../models/types';

interface Item {
  id: string;
  type: 'student' | 'batch' | 'page';
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  action: () => void;
}

interface Props {
  open: boolean;
  onClose: () => void;
  batches: Batch[];
  students: Student[];
}

export default function CommandPalette({ open, onClose, batches, students }: Props) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQ('');
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const items = useMemo<Item[]>(() => {
    const pages: Item[] = [
      { id: 'p-dashboard', type: 'page', title: 'Go to Dashboard', icon: <LayoutDashboard className="w-4 h-4" />, action: () => navigate('/dashboard') },
      { id: 'p-analytics', type: 'page', title: 'Open Analytics',  icon: <Activity className="w-4 h-4" />,        action: () => navigate('/analytics') },
      { id: 'p-reports',   type: 'page', title: 'Open Reports',    icon: <FileText className="w-4 h-4" />,        action: () => navigate('/reports') },
    ];
    const studentItems: Item[] = students.map(s => ({
      id: `s-${s.id}`,
      type: 'student',
      title: s.name,
      subtitle: `${batches.find(b => b.id === s.batchId)?.name || 'Student'} • ${s.mobileNumber}`,
      icon: <Users className="w-4 h-4" />,
      action: () => navigate(`/student/${s.id}`),
    }));
    const batchItems: Item[] = batches.map(b => ({
      id: `b-${b.id}`,
      type: 'batch',
      title: b.name,
      subtitle: b.schedule || 'Batch',
      icon: <BookOpen className="w-4 h-4" />,
      action: () => navigate(`/batch/${b.id}`),
    }));
    return [...pages, ...batchItems, ...studentItems];
  }, [students, batches, navigate]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return items.slice(0, 12);
    return items.filter(i =>
      i.title.toLowerCase().includes(query) ||
      i.subtitle?.toLowerCase().includes(query)
    ).slice(0, 20);
  }, [q, items]);

  useEffect(() => { setActive(0); }, [q]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, filtered.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
      else if (e.key === 'Enter') {
        const item = filtered[active];
        if (item) { e.preventDefault(); item.action(); onClose(); }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, filtered, active, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="relative w-full max-w-2xl bg-slate-900/80 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
              <Search className="w-5 h-5 text-white/60" />
              <input
                ref={inputRef}
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Search students, batches, pages..."
                className="flex-1 bg-transparent text-white placeholder-white/40 font-medium outline-none text-base"
              />
              <kbd className="hidden sm:inline-block text-[10px] font-bold text-white/50 bg-white/10 border border-white/20 rounded px-1.5 py-0.5">ESC</kbd>
            </div>
            <ul className="max-h-[55vh] overflow-y-auto custom-scrollbar p-2">
              {filtered.length === 0 ? (
                <li className="px-5 py-10 text-center text-white/50 font-bold text-sm">No results.</li>
              ) : filtered.map((item, idx) => (
                <li key={item.id}>
                  <button
                    onMouseEnter={() => setActive(idx)}
                    onClick={() => { item.action(); onClose(); }}
                    className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-colors group ${
                      idx === active ? 'bg-white/15' : 'hover:bg-white/10'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-white/80">
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold text-sm truncate">{item.title}</p>
                      {item.subtitle && (
                        <p className="text-white/50 text-xs font-semibold truncate flex items-center gap-1">
                          {item.type === 'student' && <Phone className="w-3 h-3" />}
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] uppercase tracking-widest font-extrabold text-white/40">
                      {item.type}
                    </span>
                    <ArrowRight className="w-4 h-4 text-white/40 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="px-5 py-3 border-t border-white/10 bg-white/5 flex items-center justify-between text-[11px] font-bold text-white/50">
              <div className="flex items-center gap-3">
                <span><kbd className="bg-white/10 border border-white/20 rounded px-1 py-0.5">↑</kbd> <kbd className="bg-white/10 border border-white/20 rounded px-1 py-0.5">↓</kbd> navigate</span>
                <span><kbd className="bg-white/10 border border-white/20 rounded px-1 py-0.5">↵</kbd> open</span>
              </div>
              <span><kbd className="bg-white/10 border border-white/20 rounded px-1 py-0.5">⌘K</kbd> to toggle</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
