import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SignIn, SignUp } from '@clerk/clerk-react';
import { dark } from '@clerk/themes';
import { ArrowLeft, ArrowRight, Mail, Lock, Eye, EyeOff } from 'lucide-react';

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

  const hasClerkKey = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

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
        navigate('/dashboard');
      }
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#040405] text-[#f7f8f8] flex flex-col justify-between selection:bg-[#5e6ad2] selection:text-white relative overflow-hidden">
      {/* Subtle Ambient Glow */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full opacity-20 blur-[120px]"
        style={{
          background: 'radial-gradient(circle, #5e6ad2 0%, rgba(94, 106, 210, 0) 70%)',
        }}
      />

      {/* Top Simple Bar */}
      <header className="h-16 px-6 sm:px-10 flex items-center justify-between z-10">
        <button
          type="button"
          onClick={() => {
            if (onNavigateHome) {
              onNavigateHome();
            } else {
              navigate('/');
            }
          }}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#8a8f98] hover:text-[#f7f8f8] transition-colors cursor-pointer group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>Home</span>
        </button>

        <Link to="/" className="flex items-center gap-2 group">
          <span className="w-6 h-6 rounded-md bg-[#5e6ad2] flex items-center justify-center text-white font-bold text-xs shadow-[0_1px_4px_rgba(94,106,210,0.4)]">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M4 6h16M4 12h10M4 18h14" strokeLinecap="round" />
            </svg>
          </span>
          <span className="font-semibold text-sm tracking-tight text-[#f7f8f8]">
            Rep<span className="text-[#8a8f98] font-normal">Scan</span>
          </span>
        </Link>

        <div className="w-12 sm:w-16" />
      </header>

      {/* Centered Minimal Authentication Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10">
        <div className="w-full max-w-[420px] space-y-6">
          {/* Header Typography */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-[#f7f8f8]">
              {mode === 'sign-in' ? 'Welcome back' : 'Create an account'}
            </h1>
            <p className="text-xs text-[#8a8f98]">
              {mode === 'sign-in'
                ? 'Sign in to access your reputation dashboard'
                : 'Start monitoring and managing customer reviews'}
            </p>
          </div>

          {/* Segmented Toggle */}
          <div className="p-0.5 bg-[#0f1012] border border-[#1f2127] rounded-lg flex items-center">
            <button
              type="button"
              onClick={() => handleModeChange('sign-in')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                mode === 'sign-in'
                  ? 'bg-[#1b1c22] text-[#f7f8f8] shadow-sm'
                  : 'text-[#8a8f98] hover:text-[#d0d6e0]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('sign-up')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                mode === 'sign-up'
                  ? 'bg-[#1b1c22] text-[#f7f8f8] shadow-sm'
                  : 'text-[#8a8f98] hover:text-[#d0d6e0]'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Main Form Container */}
          <div className="bg-[#0b0c0e] border border-[#1e2025] rounded-xl p-6 sm:p-8 shadow-[0_12px_40px_rgba(0,0,0,0.6)]">
            {hasClerkKey ? (
              /* Production Clerk Authentication */
              <div className="clerk-container w-full flex justify-center">
                {mode === 'sign-in' ? (
                  <SignIn
                    routing="hash"
                    appearance={{
                      baseTheme: dark,
                      variables: {
                        colorPrimary: '#5e6ad2',
                        colorBackground: 'transparent',
                        colorInputBackground: '#131418',
                        colorInputText: '#f7f8f8',
                        colorText: '#f7f8f8',
                        colorTextSecondary: '#8a8f98',
                        borderRadius: '0.5rem',
                      },
                      elements: {
                        card: 'bg-transparent shadow-none border-0 p-0',
                        headerTitle: 'hidden',
                        headerSubtitle: 'hidden',
                        socialButtonsBlockButton:
                          'border border-[#23252a] bg-[#121316] hover:bg-[#18191e] text-[#f7f8f8] text-xs h-9 transition-colors',
                        formButtonPrimary:
                          'bg-[#5e6ad2] hover:bg-[#6875e5] text-white text-xs font-medium h-9 shadow-[0_1px_4px_rgba(94,106,210,0.3)] transition-colors',
                        formFieldInput:
                          'bg-[#131418] border border-[#23252a] focus:border-[#5e6ad2] text-xs h-9 text-[#f7f8f8]',
                        footerActionLink: 'text-[#828fff] hover:text-white transition-colors',
                      },
                    }}
                  />
                ) : (
                  <SignUp
                    routing="hash"
                    appearance={{
                      baseTheme: dark,
                      variables: {
                        colorPrimary: '#5e6ad2',
                        colorBackground: 'transparent',
                        colorInputBackground: '#131418',
                        colorInputText: '#f7f8f8',
                        colorText: '#f7f8f8',
                        colorTextSecondary: '#8a8f98',
                        borderRadius: '0.5rem',
                      },
                      elements: {
                        card: 'bg-transparent shadow-none border-0 p-0',
                        headerTitle: 'hidden',
                        headerSubtitle: 'hidden',
                        socialButtonsBlockButton:
                          'border border-[#23252a] bg-[#121316] hover:bg-[#18191e] text-[#f7f8f8] text-xs h-9 transition-colors',
                        formButtonPrimary:
                          'bg-[#5e6ad2] hover:bg-[#6875e5] text-white text-xs font-medium h-9 shadow-[0_1px_4px_rgba(94,106,210,0.3)] transition-colors',
                        formFieldInput:
                          'bg-[#131418] border border-[#23252a] focus:border-[#5e6ad2] text-xs h-9 text-[#f7f8f8]',
                        footerActionLink: 'text-[#828fff] hover:text-white transition-colors',
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
                    className="block text-xs font-medium text-[#d0d6e0]"
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
                      className="w-full h-9 pl-9 pr-3 rounded-lg bg-[#131418] border border-[#23252a] text-xs text-[#f7f8f8] placeholder-[#555861] focus:outline-none focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2]/30 transition-all"
                    />
                    <Mail className="w-3.5 h-3.5 text-[#62666d] absolute left-3 top-2.5" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="auth-password"
                      className="block text-xs font-medium text-[#d0d6e0]"
                    >
                      Password
                    </label>
                    {mode === 'sign-in' && (
                      <span className="text-[11px] text-[#8a8f98] hover:text-[#d0d6e0] transition-colors cursor-pointer">
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
                      className="w-full h-9 pl-9 pr-9 rounded-lg bg-[#131418] border border-[#23252a] text-xs text-[#f7f8f8] placeholder-[#555861] focus:outline-none focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2]/30 transition-all"
                    />
                    <Lock className="w-3.5 h-3.5 text-[#62666d] absolute left-3 top-2.5" />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-2.5 text-[#62666d] hover:text-[#d0d6e0] transition-colors"
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
                  className="w-full h-9 rounded-lg bg-[#5e6ad2] hover:bg-[#6875e5] text-white text-xs font-medium transition-colors shadow-[0_1px_4px_rgba(94,106,210,0.3)] flex items-center justify-center gap-1.5 mt-5 cursor-pointer disabled:opacity-50"
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
          <div className="text-center text-xs text-[#8a8f98]">
            <span>
              {mode === 'sign-in'
                ? "Don't have an account yet?"
                : 'Already have an account?'}
            </span>
            <button
              type="button"
              onClick={() => handleModeChange(mode === 'sign-in' ? 'sign-up' : 'sign-in')}
              className="ml-1.5 text-[#828fff] hover:text-white font-medium transition-colors cursor-pointer"
            >
              {mode === 'sign-in' ? 'Sign up' : 'Sign in'}
            </button>
          </div>
        </div>
      </main>

      {/* Bottom Footer Notice */}
      <footer className="py-6 text-center text-[11px] text-[#555861] z-10">
        <span>Protected with secure authentication. RepScan © {new Date().getFullYear()}</span>
      </footer>
    </div>
  );
}
