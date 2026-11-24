import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SignIn, SignUp } from '@clerk/clerk-react';
import { dark } from '@clerk/themes';
import { ArrowLeft, ArrowRight, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';

interface AuthViewProps {
  initialMode?: 'sign-in' | 'sign-up';
  onNavigateHome?: () => void;
  onAuthSuccess?: () => void;
}

export default function AuthView({
  initialMode = 'sign-in',
  onNavigateHome,
  onAuthSuccess,
}: AuthViewProps) {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, isAuthLoaded } = useBusiness();

  const hasClerkKey = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

  // If already authenticated, redirect to /dashboard immediately
  useEffect(() => {
    if (isAuthLoaded && isAuthenticated) {
      if (onAuthSuccess) {
        onAuthSuccess();
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [isAuthLoaded, isAuthenticated, onAuthSuccess, navigate]);

  const handleModeChange = (newMode: 'sign-in' | 'sign-up') => {
    setMode(newMode);
  };

  const handleFallbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      if (onAuthSuccess) {
        onAuthSuccess();
      } else {
        navigate('/dashboard', { replace: true });
      }
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 flex flex-col justify-between selection:bg-[#4ade80]/30 selection:text-white relative overflow-hidden font-sans">
      {/* Subtle Warm Ambient Glow */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full opacity-15 blur-[140px]"
        style={{
          background: 'radial-gradient(circle, #4ade80 0%, rgba(74, 222, 128, 0) 70%)',
        }}
      />

      {/* Top Simple Bar */}
      <header className="h-16 px-6 sm:px-10 flex items-center justify-between z-10 border-b border-[#262626]/50">
        <button
          type="button"
          onClick={() => {
            if (onNavigateHome) {
              onNavigateHome();
            } else {
              navigate('/');
            }
          }}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#a3a3a3] hover:text-white transition-colors cursor-pointer group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>Home</span>
        </button>

        <Link to="/" className="flex items-center gap-2 group">
          <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[#0a0a0a] font-bold text-xs shadow-sm">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M4 6h16M4 12h10M4 18h14" strokeLinecap="round" />
            </svg>
          </span>
          <span className="font-serif font-light text-base tracking-tight text-white">
            Rep<span className="text-[#a3a3a3]">Scan</span>
          </span>
        </Link>

        <div className="w-12 sm:w-16" />
      </header>

      {/* Centered Minimal Authentication Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10">
        <div className="w-full max-w-[420px] space-y-6">
          {/* Header Typography */}
          <div className="text-center space-y-2">
            <h1 className="font-serif font-light text-3xl sm:text-4xl tracking-[-0.02em] text-white">
              {mode === 'sign-in' ? 'Welcome back' : 'Create an account'}
            </h1>
            <p className="text-xs text-[#a3a3a3]">
              {mode === 'sign-in'
                ? 'Sign in to access your reputation intelligence workspace'
                : 'Start monitoring customer reviews and competitive radar'}
            </p>
          </div>

          {/* Segmented Toggle */}
          <div className="p-1 bg-[#141414] border border-[#262626] rounded-full flex items-center">
            <button
              type="button"
              onClick={() => handleModeChange('sign-in')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-full transition-all cursor-pointer ${
                mode === 'sign-in'
                  ? 'bg-white text-[#0a0a0a] font-semibold shadow-sm'
                  : 'text-[#a3a3a3] hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('sign-up')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-full transition-all cursor-pointer ${
                mode === 'sign-up'
                  ? 'bg-white text-[#0a0a0a] font-semibold shadow-sm'
                  : 'text-[#a3a3a3] hover:text-white'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Main Form Container */}
          <div className="bg-[#171717] border border-[#262626] rounded-2xl p-6 sm:p-8 shadow-sm">
            {hasClerkKey ? (
              /* Production Clerk Authentication */
              <div className="clerk-container w-full flex justify-center">
                {mode === 'sign-in' ? (
                  <SignIn
                    routing="hash"
                    forceRedirectUrl="/dashboard"
                    fallbackRedirectUrl="/dashboard"
                    appearance={{
                      baseTheme: dark,
                      variables: {
                        colorPrimary: '#4ade80',
                        colorBackground: 'transparent',
                        colorInputBackground: '#1f1f1f',
                        colorInputText: '#ffffff',
                        colorText: '#ffffff',
                        colorTextSecondary: '#a3a3a3',
                        borderRadius: '9999px',
                      },
                      elements: {
                        card: 'bg-transparent shadow-none border-0 p-0',
                        headerTitle: 'hidden',
                        headerSubtitle: 'hidden',
                        socialButtonsBlockButton:
                          'border border-[#262626] bg-[#1f1f1f] hover:bg-[#262626] text-white text-xs h-9 rounded-full transition-colors',
                        formButtonPrimary:
                          'bg-white hover:bg-zinc-200 text-[#0a0a0a] text-xs font-semibold h-9 rounded-full shadow-sm transition-colors',
                        formFieldInput:
                          'bg-[#1f1f1f] border border-[#262626] focus:border-[#4ade80] text-xs h-9 text-white rounded-full',
                        footerActionLink: 'text-[#4ade80] hover:text-white transition-colors',
                      },
                    }}
                  />
                ) : (
                  <SignUp
                    routing="hash"
                    forceRedirectUrl="/dashboard"
                    fallbackRedirectUrl="/dashboard"
                    appearance={{
                      baseTheme: dark,
                      variables: {
                        colorPrimary: '#4ade80',
                        colorBackground: 'transparent',
                        colorInputBackground: '#1f1f1f',
                        colorInputText: '#ffffff',
                        colorText: '#ffffff',
                        colorTextSecondary: '#a3a3a3',
                        borderRadius: '9999px',
                      },
                      elements: {
                        card: 'bg-transparent shadow-none border-0 p-0',
                        headerTitle: 'hidden',
                        headerSubtitle: 'hidden',
                        socialButtonsBlockButton:
                          'border border-[#262626] bg-[#1f1f1f] hover:bg-[#262626] text-white text-xs h-9 rounded-full transition-colors',
                        formButtonPrimary:
                          'bg-white hover:bg-zinc-200 text-[#0a0a0a] text-xs font-semibold h-9 rounded-full shadow-sm transition-colors',
                        formFieldInput:
                          'bg-[#1f1f1f] border border-[#262626] focus:border-[#4ade80] text-xs h-9 text-white rounded-full',
                        footerActionLink: 'text-[#4ade80] hover:text-white transition-colors',
                      },
                    }}
                  />
                )}
              </div>
            ) : (
              /* Handcrafted Direct Form Fallback */
              <form onSubmit={handleFallbackSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="auth-email"
                    className="block text-xs font-medium text-zinc-300 font-mono"
                  >
                    Email address
                  </label>
                  <div className="relative">
                    <input
                      id="auth-email"
                      type="email"
                      required
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-10 pl-10 pr-4 rounded-full bg-[#1f1f1f] border border-[#262626] text-xs text-white placeholder-[#737373] focus:outline-none focus:border-[#4ade80] transition-all font-mono"
                    />
                    <Mail className="w-3.5 h-3.5 text-[#737373] absolute left-3.5 top-3" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="auth-password"
                      className="block text-xs font-medium text-zinc-300 font-mono"
                    >
                      Password
                    </label>
                    {mode === 'sign-in' && (
                      <span className="text-[11px] text-[#a3a3a3] hover:text-white transition-colors cursor-pointer">
                        Forgot password?
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      id="auth-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-10 pl-10 pr-10 rounded-full bg-[#1f1f1f] border border-[#262626] text-xs text-white placeholder-[#737373] focus:outline-none focus:border-[#4ade80] transition-all font-mono"
                    />
                    <Lock className="w-3.5 h-3.5 text-[#737373] absolute left-3.5 top-3" />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3.5 top-3 text-[#737373] hover:text-white transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-10 rounded-full bg-white hover:bg-zinc-200 text-[#0a0a0a] text-xs font-semibold transition-all shadow-sm flex items-center justify-center gap-1.5 mt-5 cursor-pointer disabled:opacity-50 active:scale-[0.98]"
                >
                  {isSubmitting ? (
                    <span>Signing in...</span>
                  ) : (
                    <>
                      <span>{mode === 'sign-in' ? 'Sign In' : 'Create Account'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Minimal Mode Switcher Prompt */}
          <div className="text-center text-xs text-[#a3a3a3]">
            <span>
              {mode === 'sign-in'
                ? "Don't have an account yet?"
                : 'Already have an account?'}
            </span>
            <button
              type="button"
              onClick={() => handleModeChange(mode === 'sign-in' ? 'sign-up' : 'sign-in')}
              className="ml-1.5 text-[#4ade80] hover:underline font-medium transition-colors cursor-pointer"
            >
              {mode === 'sign-in' ? 'Sign up' : 'Sign in'}
            </button>
          </div>
        </div>
      </main>

      {/* Bottom Footer Notice */}
      <footer className="py-6 text-center text-[11px] text-[#737373] z-10 font-mono">
        <span>Protected with secure authentication. RepScan © {new Date().getFullYear()}</span>
      </footer>
    </div>
  );
}
