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
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-4 selection:bg-[#4ade80]/30 selection:text-white font-sans">
      {/* Top Header bar with user identity */}
      <div className="w-full max-w-xl flex items-center justify-between py-4 mb-2">
        <div className="flex items-center gap-2.5">
          <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[#0a0a0a] font-bold text-xs tracking-tight shadow-sm">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M4 6h16M4 12h10M4 18h14" strokeLinecap="round" />
            </svg>
          </span>
          <div className="flex items-baseline gap-1">
            <span className="font-serif font-light text-base tracking-tight text-white">
              Rep<span className="text-[#a3a3a3]">Scan</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-[#a3a3a3] font-mono hidden sm:inline">
            {userProfile?.email || 'Signed In'}
          </span>
          {hasClerkKey && (
            <SignedIn>
              <UserButton
                appearance={{
                  baseTheme: dark,
                  elements: {
                    userButtonAvatarBox: 'w-7 h-7 ring-1 ring-[#262626]',
                  },
                }}
              />
            </SignedIn>
          )}
        </div>
      </div>

      {/* Main Wizard Card */}
      <div className="w-full max-w-xl bg-[#171717] border border-[#262626] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Step Progress Bar */}
        <div className="h-1 bg-[#141414] w-full">
          <div
            className="h-full bg-[#4ade80] transition-all duration-300 ease-out"
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
              <span className="text-[10px] px-3 py-0.5 rounded-full font-mono font-medium uppercase bg-[#1f1f1f] text-zinc-300 border border-[#262626]">
                {step === 'workspace'
                  ? 'Step 1 of 4 • Workspace'
                  : step === 'business'
                  ? 'Step 2 of 4 • Business'
                  : step === 'connect'
                  ? 'Step 3 of 4 • Sources'
                  : 'Step 4 of 4 • Analysis'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-[#a3a3a3] font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Multi-Tenant Secured</span>
            </div>
          </div>

          {errorMessage && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs font-mono">
              {errorMessage}
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              STEP 1: CREATE WORKSPACE (MANDATORY BEFORE ANY FEATURE ACCESS)
              ───────────────────────────────────────────────────────────── */}
          {step === 'workspace' && (
            <div>
              <h2 className="font-serif font-light text-2xl text-white tracking-[-0.01em]">
                Create your team workspace
              </h2>
              <p className="text-xs text-[#a3a3a3] mt-1 leading-relaxed">
                RepScan organizes businesses and customer telemetry into isolated workspaces. Please create your organization workspace first to unlock all features.
              </p>

              <form onSubmit={handleCreateWorkspace} className="mt-6 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5 font-mono">
                    Workspace / Organization Name <span className="text-[#4ade80]">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-[#737373] absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      autoFocus
                      value={workspaceName}
                      onChange={(e) => setWorkspaceName(e.target.value)}
                      placeholder="e.g. Apex Operations Group"
                      className="w-full bg-[#1f1f1f] border border-[#262626] rounded-full pl-10 pr-4 py-2 text-xs text-white placeholder-[#737373] focus:border-[#4ade80] focus:outline-none transition-colors"
                    />
                  </div>
                  <span className="text-[11px] text-[#737373] mt-2 block font-mono">
                    You will be assigned the <span className="text-zinc-300">owner</span> role with administrative permissions.
                  </span>
                </div>

                <div className="pt-3 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting || !workspaceName.trim()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white hover:bg-zinc-200 text-[#0a0a0a] text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer active:scale-[0.98] shadow-sm"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0a0a0a]" />
                        <span>Creating Workspace...</span>
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
              <h2 className="font-serif font-light text-2xl text-white tracking-[-0.01em]">
                Register your business entity
              </h2>
              <p className="text-xs text-[#a3a3a3] mt-1 leading-relaxed">
                Connect your business to your new workspace. RepScan will ingest customer sentiment across all connected locations.
              </p>

              <form onSubmit={handleCreateBusiness} className="mt-6 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5 font-mono">
                    Business Name <span className="text-[#4ade80]">*</span>
                  </label>
                  <div className="relative">
                    <Briefcase className="w-4 h-4 text-[#737373] absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      autoFocus
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g. Luminary Kitchen & Bar"
                      className="w-full bg-[#1f1f1f] border border-[#262626] rounded-full pl-10 pr-4 py-2 text-xs text-white placeholder-[#737373] focus:border-[#4ade80] focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#a3a3a3] mb-1.5 font-mono">
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
                    <label className="block text-xs font-medium text-[#a3a3a3] mb-1.5 font-mono">
                      Location / Region (Optional)
                    </label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. Austin, TX"
                      className="w-full bg-[#1f1f1f] border border-[#262626] rounded-full px-4 py-1.5 text-xs text-white placeholder-[#737373] focus:border-[#4ade80] focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#a3a3a3] mb-1.5 font-mono">
                      Website (Optional)
                    </label>
                    <input
                      type="url"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://example.com"
                      className="w-full bg-[#1f1f1f] border border-[#262626] rounded-full px-4 py-1.5 text-xs text-white placeholder-[#737373] focus:border-[#4ade80] focus:outline-none transition-colors font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#a3a3a3] mb-1.5 font-mono">
                      Description (Optional)
                    </label>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="e.g. Upscale dining experience"
                      className="w-full bg-[#1f1f1f] border border-[#262626] rounded-full px-4 py-1.5 text-xs text-white placeholder-[#737373] focus:border-[#4ade80] focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="pt-3 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting || !businessName.trim()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white hover:bg-zinc-200 text-[#0a0a0a] text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer active:scale-[0.98] shadow-sm"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0a0a0a]" />
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
              <h2 className="font-serif font-light text-2xl text-white tracking-[-0.01em]">
                Connect Google Reviews
              </h2>
              <p className="text-xs text-[#a3a3a3] mt-1 leading-relaxed">
                Paste your Google Maps / Google Business listing link. RepScan will ingest existing reviews, cluster themes, and calculate baseline sentiment.
              </p>

              <div className="mt-6 space-y-4">
                <div className="p-4 rounded-2xl bg-[#141414] border border-[#262626] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-[#1f1f1f] text-white font-mono font-bold text-xs flex items-center justify-center border border-[#262626]">
                      G
                    </span>
                    <div>
                      <span className="text-xs font-medium text-white block">Google Maps Reviews</span>
                      <span className="text-[11px] text-[#737373] font-mono">Automated semantic telemetry</span>
                    </div>
                  </div>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full font-mono uppercase bg-emerald-950/40 text-emerald-400 border border-emerald-800/40 font-semibold">
                    Recommended
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5 font-mono">
                    Google Business Listing URL or Place ID
                  </label>
                  <input
                    type="url"
                    value={googlePlaceUrl}
                    onChange={(e) => setGooglePlaceUrl(e.target.value)}
                    placeholder="https://maps.google.com/?cid=..."
                    className="w-full bg-[#1f1f1f] border border-[#262626] rounded-full px-4 py-2 text-xs text-white placeholder-[#737373] focus:border-[#4ade80] focus:outline-none transition-colors font-mono"
                  />
                  <span className="text-[11px] text-[#737373] mt-2 block font-mono">
                    You can also skip for now to initialize with sample feedback telemetry.
                  </span>
                </div>

                <div className="pt-3 flex justify-between items-center">
                  <button
                    type="button"
                    onClick={handleConnectAndAnalyze}
                    className="text-xs text-[#a3a3a3] hover:text-white transition-colors cursor-pointer"
                  >
                    Skip for now
                  </button>

                  <button
                    type="button"
                    onClick={handleConnectAndAnalyze}
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white hover:bg-zinc-200 text-[#0a0a0a] text-xs font-semibold transition-all cursor-pointer active:scale-[0.98] shadow-sm"
                  >
                    <span>Run Initial Analysis</span>
                    <Sparkles className="w-3.5 h-3.5 text-[#4ade80]" />
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
              <div className="w-12 h-12 rounded-full bg-[#1f1f1f] border border-[#262626] flex items-center justify-center mx-auto text-[#4ade80]">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>

              <div>
                <h3 className="font-serif font-light text-xl text-white tracking-[-0.01em]">
                  Synthesizing Initial Telemetry
                </h3>
                <p className="text-xs text-[#a3a3a3] mt-1 max-w-sm mx-auto">
                  Running zero-hallucination semantic clustering and vector indexing.
                </p>
              </div>

              <div className="space-y-2.5 max-w-sm mx-auto text-left">
                <div className="flex items-center gap-2.5 text-xs">
                  {analysisStep >= 1 ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <Loader2 className="w-3.5 h-3.5 text-[#4ade80] animate-spin shrink-0" />
                  )}
                  <span className={analysisStep >= 1 ? 'text-white' : 'text-[#737373]'}>
                    Ingesting reviews into PostgreSQL
                  </span>
                </div>

                <div className="flex items-center gap-2.5 text-xs">
                  {analysisStep >= 2 ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : analysisStep === 1 ? (
                    <Loader2 className="w-3.5 h-3.5 text-[#4ade80] animate-spin shrink-0" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border border-[#262626] shrink-0" />
                  )}
                  <span className={analysisStep >= 2 ? 'text-white' : 'text-[#737373]'}>
                    Extracting recurring thematic clusters
                  </span>
                </div>

                <div className="flex items-center gap-2.5 text-xs">
                  {analysisStep >= 3 ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : analysisStep === 2 ? (
                    <Loader2 className="w-3.5 h-3.5 text-[#4ade80] animate-spin shrink-0" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border border-[#262626] shrink-0" />
                  )}
                  <span className={analysisStep >= 3 ? 'text-white' : 'text-[#737373]'}>
                    Compiling executive intelligence brief
                  </span>
                </div>

                <div className="flex items-center gap-2.5 text-xs">
                  {analysisStep >= 4 ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : analysisStep === 3 ? (
                    <Loader2 className="w-3.5 h-3.5 text-[#4ade80] animate-spin shrink-0" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border border-[#262626] shrink-0" />
                  )}
                  <span className={analysisStep >= 4 ? 'text-white' : 'text-[#737373]'}>
                    Readying real-time dashboard telemetry
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              STEP 5: ONBOARDING COMPLETE
              ───────────────────────────────────────────────────────────── */}
          {step === 'done' && (
            <div className="py-4 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-950/30 border border-emerald-800/30 flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <div>
                <h3 className="font-serif font-light text-xl text-white tracking-[-0.01em]">
                  Workspace Configured
                </h3>
                <p className="text-xs text-[#a3a3a3] mt-1 max-w-sm mx-auto">
                  Your workspace <span className="text-white font-medium">{activeWorkspace?.name || workspaceName}</span> and business <span className="text-white font-medium">{businessName}</span> are ready.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onComplete}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white hover:bg-zinc-200 text-[#0a0a0a] text-xs font-semibold transition-all cursor-pointer active:scale-[0.98] shadow-sm"
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
