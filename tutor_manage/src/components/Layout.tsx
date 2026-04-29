import React from 'react';
import { useLocation, Link, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, LayoutDashboard, GraduationCap } from 'lucide-react';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

export default function Layout() {
  const { logout, user } = useAuth();
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  ];

  return (
    <div className="min-h-screen flex flex-col font-sans relative bg-transparent overflow-hidden">
      {/* Background Animated Orbs */}
      <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-white/10 blur-[120px] mix-blend-overlay animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-white/10 blur-[120px] mix-blend-overlay animate-pulse" style={{ animationDuration: '10s' }} />
        <div className="absolute bottom-[-10%] left-[20%] w-[50%] h-[50%] rounded-full bg-white/10 blur-[120px] mix-blend-overlay animate-pulse" style={{ animationDuration: '12s' }} />
      </div>

      <nav className="sticky top-0 z-30 bg-white/10 backdrop-blur-xl border-b border-white/20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <Link to="/dashboard" className="flex-shrink-0 flex items-center gap-3">
                <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-xl text-white tracking-tight drop-shadow-sm">TutorManage</span>
              </Link>
              <div className="hidden sm:ml-8 sm:flex sm:space-x-8">
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
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-3">
                <div className="flex flex-col items-end">
                  <span className="text-sm font-bold text-white leading-tight">{user?.displayName || 'User'}</span>
                  <span className="text-xs font-medium text-white/70">{user?.email}</span>
                </div>
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="w-9 h-9 rounded-full border-2 border-white/30 shadow-md" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-white/20 border-2 border-white/40 shadow-md flex items-center justify-center text-white font-bold text-sm">
                    {user?.email?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="w-px h-8 bg-white/20 hidden sm:block mx-2"></div>
              <button
                onClick={logout}
                className="p-2.5 bg-white/10 border border-white/20 text-white hover:bg-white/20 hover:border-white/30 transition-all shadow-sm group"
                title="Logout"
              >
                <LogOut className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                <span className="sm:hidden text-sm font-medium ml-2">Logout</span>
              </button>
            </div>
          </div>
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
    </div>
  );
}
