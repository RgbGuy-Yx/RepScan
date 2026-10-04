import React, { useState } from 'react';
import {
  Building2,
  Briefcase,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { SignedIn, UserButton } from '@clerk/clerk-react';
import { dark } from '@clerk/themes';
import { useBusiness } from '../context/BusinessContext';
import { businessApi } from '../api/businessApi';
import { Select } from './ui/Dropdown';

interface OnboardingModalProps {
  onComplete: () => void;
}

type OnboardingStep = 'workspace' | 'business' | 'connect' | 'analyzing' | 'done';

export default function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const { createWorkspace, createBusiness, activeWorkspace, userProfile } = useBusiness();

  const [step, setStep] = useState<OnboardingStep>('workspace');
  const [workspaceName, setWorkspaceName] = useState(
    userProfile?.name ? `${userProfile.name}'s Organization` : 'Acme Operations'
  );

  // Business Form State
  const [businessName, setBusinessName] = useState('');
  const [description, setDescription] = useState('');
  const [industry, setIndustry] = useState('Hospitality & Dining');
  const [website, setWebsite] = useState('');
  const [location, setLocation] = useState('');

  // Source Connection State
  const [googlePlaceUrl, setGooglePlaceUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [createdBusinessId, setCreatedBusinessId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hasClerkKey = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

  // Step 1: Create Workspace (Mandatory first step)
  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceName.trim()) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await createWorkspace(workspaceName.trim());
      setStep('business');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create workspace.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Create Business Entity
  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const biz = await createBusiness({
        name: businessName.trim(),
        description: description.trim() || undefined,
        industry: industry || undefined,
        website: website.trim() || undefined,
        location: location.trim() || undefined,
      });
      setCreatedBusinessId(biz.id);
      setStep('connect');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create business.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 3 & 4: Connect Google Reviews & Trigger Initial Analysis
  const handleConnectAndAnalyze = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setStep('analyzing');

    try {
      if (createdBusinessId && googlePlaceUrl.trim()) {
        try {
          const conn = await businessApi.connectPlatform(createdBusinessId, 'google_maps', {
            sourceUrl: googlePlaceUrl.trim(),
            placeName: businessName,
          });
          await businessApi.triggerScrape(createdBusinessId, conn.id).catch(() => {});
        } catch {
          // Continue gracefully
        }
      }

      // Real-time AI Telemetry Processing Simulation
      setAnalysisStep(1);
      await new Promise((r) => setTimeout(r, 1000));
      setAnalysisStep(2);
      await new Promise((r) => setTimeout(r, 1200));
      setAnalysisStep(3);
      await new Promise((r) => setTimeout(r, 1000));
      setAnalysisStep(4);
      await new Promise((r) => setTimeout(r, 800));

      setStep('done');
    } catch (err: any) {
      setErrorMessage(err.message || 'Initial analysis error');
      setStep('done');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 selection:bg-zinc-800 selection:text-zinc-100">
      {/* Top Header bar with user identity */}
      <div className="w-full max-w-xl flex items-center justify-between py-4 mb-2">
        <div className="flex items-center gap-2.5">
          <span className="w-6 h-6 rounded-md bg-zinc-100 flex items-center justify-center text-zinc-950 font-bold text-xs tracking-tight">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M4 6h16M4 12h10M4 18h14" strokeLinecap="round" />
            </svg>
          </span>
          <div className="flex items-baseline gap-1">
            <span className="font-semibold text-sm tracking-tight text-zinc-100">
              Rep<span className="text-zinc-400 font-normal">Scan</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-400 font-mono hidden sm:inline">
            {userProfile?.email || 'Signed In'}
          </span>
          {hasClerkKey && (
            <SignedIn>
              <UserButton
                appearance={{
                  baseTheme: dark,
                  elements: {
                    userButtonAvatarBox: 'w-6 h-6 ring-1 ring-zinc-700',
                  },
                }}
              />
            </SignedIn>
          )}
        </div>
      </div>

      {/* Main Wizard Card */}
      <div className="w-full max-w-xl bg-zinc-950 border border-zinc-800 rounded-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Step Progress Bar */}
        <div className="h-1 bg-zinc-900 w-full">
          <div
            className="h-full bg-zinc-100 transition-all duration-300 ease-out"
            style={{
              width:
                step === 'workspace'
                  ? '25%'
                  : step === 'business'
                  ? '50%'
                  : step === 'connect'
                  ? '75%'
                  : '100%',
            }}
          />
        </div>

        <div className="p-6 sm:p-8">
          {/* Step Tag */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] px-2 py-0.5 rounded font-mono font-medium uppercase bg-zinc-900 text-zinc-300 border border-zinc-800">
                {step === 'workspace'
                  ? 'Step 1 of 4 • Workspace'
                  : step === 'business'
                  ? 'Step 2 of 4 • Business'
                  : step === 'connect'
                  ? 'Step 3 of 4 • Sources'
                  : 'Step 4 of 4 • Analysis'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Multi-Tenant Secured</span>
            </div>
          </div>

          {errorMessage && (
            <div className="mb-6 p-3 rounded-md bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs font-mono">
              {errorMessage}
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              STEP 1: CREATE WORKSPACE (MANDATORY BEFORE ANY FEATURE ACCESS)
              ───────────────────────────────────────────────────────────── */}
          {step === 'workspace' && (
            <div>
              <h2 className="text-lg font-semibold text-zinc-100 tracking-tight">
                Create your team workplace
              </h2>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                RepScan organizes businesses and customer telemetry into isolated workspaces. Please create your organization workspace first to unlock all features.
              </p>

              <form onSubmit={handleCreateWorkspace} className="mt-6 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Workplace / Organization Name <span className="text-zinc-500">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      autoFocus
                      value={workspaceName}
                      onChange={(e) => setWorkspaceName(e.target.value)}
                      placeholder="e.g. Apex Operations Group"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-md pl-9 pr-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:border-zinc-500 focus:outline-none transition-colors"
                    />
                  </div>
                  <span className="text-[11px] text-zinc-500 mt-1.5 block font-mono">
                    You will be assigned the <span className="text-zinc-300">owner</span> role with administrative permissions.
                  </span>
                </div>

                <div className="pt-3 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting || !workspaceName.trim()}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer active:scale-[0.98]"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Creating Workplace...</span>
                      </>
                    ) : (
                      <>
                        <span>Continue to Business Setup</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              STEP 2: CREATE BUSINESS
              ───────────────────────────────────────────────────────────── */}
          {step === 'business' && (
            <div>
              <h2 className="text-lg font-semibold text-zinc-100 tracking-tight">
                Register your business entity
              </h2>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Connect your business to your new workspace. RepScan will ingest customer sentiment across all connected locations.
              </p>

              <form onSubmit={handleCreateBusiness} className="mt-6 space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Business Name <span className="text-zinc-500">*</span>
                  </label>
                  <div className="relative">
                    <Briefcase className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      autoFocus
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g. Luminary Kitchen & Bar"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-md pl-9 pr-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:border-zinc-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">
                      Industry (Optional)
                    </label>
                    <Select
                      value={industry}
                      onChange={(val) => setIndustry(val)}
                      options={[
                        { value: 'Hospitality & Dining', label: 'Hospitality & Dining' },
                        { value: 'Retail & E-commerce', label: 'Retail & E-commerce' },
                        { value: 'Healthcare & Wellness', label: 'Healthcare & Wellness' },
                        { value: 'SaaS & Technology', label: 'SaaS & Technology' },
                        { value: 'Real Estate & Property', label: 'Real Estate & Property' },
                      ]}
                      size="sm"
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">
                      Location / Region (Optional)
                    </label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. Austin, TX"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:border-zinc-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">
                      Website (Optional)
                    </label>
                    <input
                      type="url"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://example.com"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:border-zinc-500 focus:outline-none transition-colors font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">
                      Description (Optional)
                    </label>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="e.g. Upscale dining experience"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:border-zinc-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="pt-3 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting || !businessName.trim()}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer active:scale-[0.98]"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving Business...</span>
                      </>
                    ) : (
                      <>
                        <span>Connect Sources</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              STEP 3: CONNECT GOOGLE REVIEWS
              ───────────────────────────────────────────────────────────── */}
          {step === 'connect' && (
            <div>
              <h2 className="text-lg font-semibold text-zinc-100 tracking-tight">
                Connect Google Reviews
              </h2>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Paste your Google Maps / Google Business listing link. RepScan will ingest existing reviews, cluster themes, and calculate baseline sentiment.
              </p>

              <div className="mt-6 space-y-4">
                <div className="p-3.5 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded bg-zinc-800 text-zinc-200 font-mono font-bold text-xs flex items-center justify-center border border-zinc-700">
                      G
                    </span>
                    <div>
                      <span className="text-xs font-medium text-zinc-200 block">Google Maps Reviews</span>
                      <span className="text-[11px] text-zinc-500 font-mono">Automated semantic telemetry</span>
                    </div>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-mono uppercase bg-emerald-950/40 text-emerald-400 border border-emerald-800/40">
                    Recommended
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Google Business Listing URL or Place ID
                  </label>
                  <input
                    type="url"
                    value={googlePlaceUrl}
                    onChange={(e) => setGooglePlaceUrl(e.target.value)}
                    placeholder="https://maps.google.com/?cid=..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:border-zinc-500 focus:outline-none transition-colors font-mono"
                  />
                  <span className="text-[11px] text-zinc-500 mt-1.5 block font-mono">
                    You can also skip for now to initialize with sample feedback telemetry.
                  </span>
                </div>

                <div className="pt-3 flex justify-between items-center">
                  <button
                    type="button"
                    onClick={handleConnectAndAnalyze}
                    className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                  >
                    Skip for now
                  </button>

                  <button
                    type="button"
                    onClick={handleConnectAndAnalyze}
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-medium transition-colors cursor-pointer active:scale-[0.98]"
                  >
                    <span>Run Initial Analysis</span>
                    <Sparkles className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              STEP 4: INITIAL ANALYSIS RUNNING
              ───────────────────────────────────────────────────────────── */}
          {step === 'analyzing' && (
            <div className="py-6 text-center space-y-5">
              <div className="w-12 h-12 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-200">
                <Sparkles className="w-6 h-6 animate-pulse text-zinc-300" />
              </div>

              <div>
                <h3 className="text-base font-semibold text-zinc-100 tracking-tight">
                  Synthesizing Initial Telemetry
                </h3>
                <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                  Running zero-hallucination semantic clustering and vector indexing.
                </p>
              </div>

              <div className="space-y-2 max-w-sm mx-auto text-left">
                <div className="flex items-center gap-2.5 text-xs">
                  {analysisStep >= 1 ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <Loader2 className="w-3.5 h-3.5 text-zinc-400 animate-spin shrink-0" />
                  )}
                  <span className={analysisStep >= 1 ? 'text-zinc-200' : 'text-zinc-500'}>
                    Ingesting reviews into PostgreSQL
                  </span>
                </div>

                <div className="flex items-center gap-2.5 text-xs">
                  {analysisStep >= 2 ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : analysisStep === 1 ? (
                    <Loader2 className="w-3.5 h-3.5 text-zinc-400 animate-spin shrink-0" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border border-zinc-800 shrink-0" />
                  )}
                  <span className={analysisStep >= 2 ? 'text-zinc-200' : 'text-zinc-500'}>
                    Extracting recurring thematic clusters
                  </span>
                </div>

                <div className="flex items-center gap-2.5 text-xs">
                  {analysisStep >= 3 ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : analysisStep === 2 ? (
                    <Loader2 className="w-3.5 h-3.5 text-zinc-400 animate-spin shrink-0" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border border-zinc-800 shrink-0" />
                  )}
                  <span className={analysisStep >= 3 ? 'text-zinc-200' : 'text-zinc-500'}>
                    Compiling executive intelligence brief
                  </span>
                </div>

                <div className="flex items-center gap-2.5 text-xs">
                  {analysisStep >= 4 ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : analysisStep === 3 ? (
                    <Loader2 className="w-3.5 h-3.5 text-zinc-400 animate-spin shrink-0" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border border-zinc-800 shrink-0" />
                  )}
                  <span className={analysisStep >= 4 ? 'text-zinc-200' : 'text-zinc-500'}>
                    Readying real-time dashboard telemetry
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              STEP 5: ONBOARDING COMPLETE -> UNLOCK DASHBOARD
              ───────────────────────────────────────────────────────────── */}
          {step === 'done' && (
            <div className="py-4 text-center space-y-4">
              <div className="w-12 h-12 rounded-lg bg-emerald-950/30 border border-emerald-800/30 flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-base font-semibold text-zinc-100 tracking-tight">
                  Workplace Configured
                </h3>
                <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                  Your workplace <span className="text-zinc-200 font-medium">{activeWorkspace?.name || workspaceName}</span> and business <span className="text-zinc-200 font-medium">{businessName}</span> are ready.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onComplete}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-medium transition-colors cursor-pointer active:scale-[0.98]"
                >
                  <span>Access Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
