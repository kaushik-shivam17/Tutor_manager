import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { GraduationCap, BookOpen, Users, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function Login() {
  const { user, signInWithGoogle } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/popup-closed-by-user') {
        toast.error("Sign-in cancelled.", {
          description: "Please keep the Google login popup open until it finishes. If the popup isn't working, try opening this app in a New Tab."
        });
      } else if (error.code === 'auth/popup-blocked') {
        toast.error("Sign-in blocked by browser.", {
          description: "Please allow popups and try again, or open this app in a New Tab."
        });
      } else {
        toast.error("Failed to sign in. Please try again.", {
          description: error.message || "Unknown error occurred"
        });
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-transparent relative overflow-hidden">
      {/* Decorative background for the left pane side */}
      <div className="absolute top-0 left-0 p-32 bg-white/10 rounded-full blur-[100px] mix-blend-overlay w-[50vh] h-[50vh]"></div>
      <div className="absolute bottom-0 left-20 p-32 bg-white/10 rounded-full blur-[100px] mix-blend-overlay w-[40vh] h-[40vh]"></div>
      
      {/* Left Pane - Content */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:flex-none lg:w-1/2 lg:px-20 xl:px-24 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto w-full max-w-sm lg:w-96 bg-white/10 p-8 rounded-3xl backdrop-blur-2xl border border-white/20 shadow-[-10px_-10px_30px_4px_rgba(0,0,0,0.1),_10px_10px_30px_4px_rgba(45,78,255,0.15)]"
        >
          <div className="flex items-center gap-4 mb-2">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center shadow-inner border border-white/30 backdrop-blur-md">
              <GraduationCap className="w-8 h-8 text-white drop-shadow-md" />
            </div>
            <span className="text-3xl font-extrabold text-white tracking-tight drop-shadow-md">TutorManage</span>
          </div>

          <h2 className="mt-8 text-4xl font-black text-white tracking-tight drop-shadow-md">
            Welcome back
          </h2>
          <p className="mt-3 text-base text-white/80 font-medium">
            Sign in to manage your batches, students, and fees with ease.
          </p>

          <div className="mt-10">
            <button
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="w-full flex justify-center items-center gap-3 py-4 px-4 border border-white/30 rounded-2xl shadow-lg bg-white/20 backdrop-blur-md text-base font-bold text-white hover:bg-white/30 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </button>
          </div>
        </motion.div>
      </div>

      {/* Right Pane - Feature Showcase */}
      <div className="hidden lg:block relative w-0 flex-1 bg-white/5 backdrop-blur-3xl border-l border-white/10">
        <div className="absolute inset-0 h-full w-full flex flex-col justify-center items-center p-12 overflow-hidden">
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative z-10 max-w-lg text-center"
          >
            <h2 className="text-4xl font-bold text-white mb-8 drop-shadow-md">
              Everything you need to run your classes smoothly.
            </h2>
            
            <div className="grid grid-cols-1 gap-6 text-left">
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-lg group hover:bg-white/20 transition-all cursor-default">
                <div className="flex items-center gap-4 mb-2">
                  <div className="bg-white/20 p-2 rounded-lg border border-white/30 group-hover:scale-110 transition-transform">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">Student Management</h3>
                </div>
                <p className="text-white/80 text-sm">Keep track of all your students, their details, and which batches they belong to in one place.</p>
              </div>

              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-lg group hover:bg-white/20 transition-all cursor-default">
                <div className="flex items-center gap-4 mb-2">
                  <div className="bg-white/20 p-2 rounded-lg border border-white/30 group-hover:scale-110 transition-transform">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">Attendance Tracking</h3>
                </div>
                <p className="text-white/80 text-sm">Quickly mark attendance for entire batches and view historical attendance records.</p>
              </div>

              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-lg group hover:bg-white/20 transition-all cursor-default">
                <div className="flex items-center gap-4 mb-2">
                  <div className="bg-white/20 p-2 rounded-lg border border-white/30 group-hover:scale-110 transition-transform">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">Fee Collection</h3>
                </div>
                <p className="text-white/80 text-sm">Automate fee generation, track paid and unpaid dues, and never miss a payment.</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
