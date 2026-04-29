import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Keyboard, X } from 'lucide-react';

const SHORTCUTS = [
  { keys: ['⌘ / Ctrl', 'K'], label: 'Open command palette' },
  { keys: ['?'],              label: 'Toggle this help' },
  { keys: ['↑', '↓'],         label: 'Navigate results' },
  { keys: ['↵'],              label: 'Open selected' },
  { keys: ['Esc'],            label: 'Close any dialog' },
];

export default function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="relative w-full max-w-md bg-slate-900/85 backdrop-blur-2xl border border-white/15 rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div className="flex items-center gap-2 text-white">
                <Keyboard className="w-5 h-5" />
                <h3 className="font-extrabold tracking-tight">Keyboard Shortcuts</h3>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <ul className="p-3">
              {SHORTCUTS.map(s => (
                <li
                  key={s.label}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/5"
                >
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
            <div className="px-6 py-3 border-t border-white/10 bg-white/5 text-[11px] font-bold text-white/50">
              Tip: shortcuts work anywhere except when typing in a text field.
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
