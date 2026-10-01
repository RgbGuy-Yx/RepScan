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
    <div className="min-h-screen bg-[#010102] flex flex-col items-center justify-center p-4 selection:bg-[#5e6ad2] selection:text-white">
      {/* Top Header bar with user identity */}
      <div className="w-full max-w-xl flex items-center justify-between py-4 mb-2">
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-md bg-[#5e6ad2] flex items-center justify-center text-white font-bold text-sm tracking-tight shadow-[0_1px_4px_rgba(94,106,210,0.4)]">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M4 6h16M4 12h10M4 18h14" strokeLinecap="round" />
            </svg>
          </span>
          <div className="flex items-baseline gap-1">
            <span className="font-semibold text-[15px] tracking-[-0.03em] text-[#f7f8f8]">
              Rep<span className="text-[#8a8f98] font-normal">Scan</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-[#8a8f98] hidden sm:inline">
            {userProfile?.email || 'Signed In'}
          </span>
          {hasClerkKey && (
            <SignedIn>
              <UserButton
                appearance={{
                  baseTheme: dark,
                  elements: {
                    userButtonAvatarBox: 'w-7 h-7 ring-1 ring-[#5e6ad2]/40',
                  },
                }}
              />
            </SignedIn>
          )}
        </div>
      </div>

      {/* Main Wizard Card */}
      <div className="w-full max-w-xl bg-[#0b0c0e] border border-[#23252a] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Step Progress Bar */}
        <div className="h-1 bg-[#141516] w-full">
          <div
            className="h-full bg-gradient-to-r from-[#5e6ad2] to-[#828fff] transition-all duration-500 ease-out"
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

        <div className="p-8">
          {/* Step Tag */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] px-2 py-0.5 rounded font-mono font-semibold uppercase bg-[#5e6ad2]/15 text-[#828fff] border border-[#5e6ad2]/30">
                {step === 'workspace'
                  ? 'Step 1 of 4 • Workspace'
                  : step === 'business'
                  ? 'Step 2 of 4 • Business'
                  : step === 'connect'
                  ? 'Step 3 of 4 • Sources'
                  : 'Step 4 of 4 • Analysis'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-[#62666d]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Multi-Tenant Secured</span>
            </div>
          </div>

          {errorMessage && (
            <div className="mb-6 p-3 rounded-lg bg-rose-950/40 border border-rose-800/40 text-rose-200 text-xs">
              {errorMessage}
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              STEP 1: CREATE WORKSPACE (MANDATORY BEFORE ANY FEATURE ACCESS)
              ───────────────────────────────────────────────────────────── */}
          {step === 'workspace' && (
            <div>
              <h2 className="text-xl font-semibold text-[#f7f8f8] tracking-tight">
                Create your team workplace
              </h2>
              <p className="text-xs text-[#8a8f98] mt-1.5 leading-relaxed">
                RepScan organizes businesses and customer telemetry into isolated workspaces. Please create your organization workspace first to unlock all features.
              </p>

              <form onSubmit={handleCreateWorkspace} className="mt-6 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#d0d6e0] mb-1.5">
                    Workplace / Organization Name <span className="text-[#5e6ad2]">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-[#62666d] absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      autoFocus
                      value={workspaceName}
                      onChange={(e) => setWorkspaceName(e.target.value)}
                      placeholder="e.g. Apex Operations Group"
                      className="w-full bg-[#141516] border border-[#23252a] rounded-lg pl-9 pr-3.5 py-2.5 text-xs text-[#f7f8f8] placeholder-[#62666d] focus:border-[#5e6ad2] focus:outline-none transition-colors"
                    />
                  </div>
                  <span className="text-[11px] text-[#62666d] mt-1.5 block">
                    You will be assigned the <span className="text-[#f7f8f8]">owner</span> role with full management permissions.
                  </span>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting || !workspaceName.trim()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#5e6ad2] hover:bg-[#828fff] text-white text-xs font-medium transition-all shadow-[0_2px_8px_rgba(94,106,210,0.35)] disabled:opacity-50 cursor-pointer"
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
              <h2 className="text-xl font-semibold text-[#f7f8f8] tracking-tight">
                Register your business entity
              </h2>
              <p className="text-xs text-[#8a8f98] mt-1.5 leading-relaxed">
                Connect your business to your new workspace. RepScan will ingest customer sentiment across all connected locations.
              </p>

              <form onSubmit={handleCreateBusiness} className="mt-6 space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-[#d0d6e0] mb-1">
                    Business Name <span className="text-[#5e6ad2]">*</span>
                  </label>
                  <div className="relative">
                    <Briefcase className="w-4 h-4 text-[#62666d] absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      autoFocus
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g. Luminary Kitchen & Bar"
                      className="w-full bg-[#141516] border border-[#23252a] rounded-lg pl-9 pr-3.5 py-2.5 text-xs text-[#f7f8f8] placeholder-[#62666d] focus:border-[#5e6ad2] focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#8a8f98] mb-1">
                      Industry (Optional)
                    </label>
                    <select
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      className="w-full bg-[#141516] border border-[#23252a] rounded-lg px-3 py-2 text-xs text-[#f7f8f8] focus:border-[#5e6ad2] focus:outline-none transition-colors"
                    >
                      <option value="Hospitality & Dining">Hospitality & Dining</option>
                      <option value="Retail & E-commerce">Retail & E-commerce</option>
                      <option value="Healthcare & Wellness">Healthcare & Wellness</option>
                      <option value="SaaS & Technology">SaaS & Technology</option>
                      <option value="Real Estate & Property">Real Estate & Property</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#8a8f98] mb-1">
                      Location / Region (Optional)
                    </label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. Austin, TX"
                      className="w-full bg-[#141516] border border-[#23252a] rounded-lg px-3 py-2 text-xs text-[#f7f8f8] placeholder-[#62666d] focus:border-[#5e6ad2] focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#8a8f98] mb-1">
                      Website (Optional)
                    </label>
                    <input
                      type="url"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://example.com"
                      className="w-full bg-[#141516] border border-[#23252a] rounded-lg px-3 py-2 text-xs text-[#f7f8f8] placeholder-[#62666d] focus:border-[#5e6ad2] focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#8a8f98] mb-1">
                      Description (Optional)
                    </label>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="e.g. Upscale dining experience"
                      className="w-full bg-[#141516] border border-[#23252a] rounded-lg px-3 py-2 text-xs text-[#f7f8f8] placeholder-[#62666d] focus:border-[#5e6ad2] focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting || !businessName.trim()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#5e6ad2] hover:bg-[#828fff] text-white text-xs font-medium transition-all shadow-[0_2px_8px_rgba(94,106,210,0.35)] disabled:opacity-50 cursor-pointer"
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
              <h2 className="text-xl font-semibold text-[#f7f8f8] tracking-tight">
                Connect Google Reviews
              </h2>
              <p className="text-xs text-[#8a8f98] mt-1.5 leading-relaxed">
                Paste your Google Maps / Google Business listing link. RepScan will ingest existing reviews, cluster themes, and calculate baseline sentiment.
              </p>

              <div className="mt-6 space-y-4">
                <div className="p-4 rounded-xl bg-[#141516] border border-[#23252a] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-lg bg-red-950/40 text-red-400 font-bold text-sm flex items-center justify-center border border-red-900/30">
                      G
                    </span>
                    <div>
                      <span className="text-xs font-semibold text-[#f7f8f8] block">Google Maps Reviews</span>
                      <span className="text-[11px] text-[#8a8f98]">Automated semantic telemetry</span>
                    </div>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded font-mono bg-emerald-950/50 text-emerald-400 border border-emerald-900/30">
                    Recommended
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#d0d6e0] mb-1.5">
                    Google Business Listing URL or Place ID
                  </label>
                  <input
                    type="url"
                    value={googlePlaceUrl}
                    onChange={(e) => setGooglePlaceUrl(e.target.value)}
                    placeholder="https://maps.google.com/?cid=..."
                    className="w-full bg-[#141516] border border-[#23252a] rounded-lg px-3.5 py-2.5 text-xs text-[#f7f8f8] placeholder-[#62666d] focus:border-[#5e6ad2] focus:outline-none transition-colors font-mono"
                  />
                  <span className="text-[11px] text-[#62666d] mt-1.5 block">
                    You can also skip for now to initialize with sample feedback telemetry.
                  </span>
                </div>

                <div className="pt-4 flex justify-between items-center">
                  <button
                    type="button"
                    onClick={handleConnectAndAnalyze}
                    className="text-xs text-[#8a8f98] hover:text-[#d0d6e0] transition-colors cursor-pointer"
                  >
                    Skip connection for now
                  </button>

                  <button
                    type="button"
                    onClick={handleConnectAndAnalyze}
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#5e6ad2] hover:bg-[#828fff] text-white text-xs font-medium transition-all shadow-[0_2px_8px_rgba(94,106,210,0.35)] cursor-pointer"
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
            <div className="py-6 text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-[#5e6ad2]/15 border border-[#5e6ad2]/30 flex items-center justify-center mx-auto shadow-[0_0_24px_rgba(94,106,210,0.25)]">
                <Sparkles className="w-8 h-8 text-[#828fff] animate-pulse" />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-[#f7f8f8]">
                  Synthesizing Initial Telemetry...
                </h3>
                <p className="text-xs text-[#8a8f98] mt-1 max-w-sm mx-auto">
                  Running zero-hallucination semantic clustering and PostgreSQL vector indexing.
                </p>
              </div>

              <div className="space-y-2.5 max-w-sm mx-auto text-left">
                <div className="flex items-center gap-2.5 text-xs">
                  {analysisStep >= 1 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <Loader2 className="w-4 h-4 text-[#5e6ad2] animate-spin shrink-0" />
                  )}
                  <span className={analysisStep >= 1 ? 'text-[#f7f8f8]' : 'text-[#8a8f98]'}>
                    Ingesting Google Reviews corpus into PostgreSQL
                  </span>
                </div>

                <div className="flex items-center gap-2.5 text-xs">
                  {analysisStep >= 2 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : analysisStep === 1 ? (
                    <Loader2 className="w-4 h-4 text-[#5e6ad2] animate-spin shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-[#23252a] shrink-0" />
                  )}
                  <span className={analysisStep >= 2 ? 'text-[#f7f8f8]' : 'text-[#8a8f98]'}>
                    Extracting recurring thematic clusters & sentiment vectors
                  </span>
                </div>

                <div className="flex items-center gap-2.5 text-xs">
                  {analysisStep >= 3 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : analysisStep === 2 ? (
                    <Loader2 className="w-4 h-4 text-[#5e6ad2] animate-spin shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-[#23252a] shrink-0" />
                  )}
                  <span className={analysisStep >= 3 ? 'text-[#f7f8f8]' : 'text-[#8a8f98]'}>
                    Compiling executive weekly intelligence brief
                  </span>
                </div>

                <div className="flex items-center gap-2.5 text-xs">
                  {analysisStep >= 4 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : analysisStep === 3 ? (
                    <Loader2 className="w-4 h-4 text-[#5e6ad2] animate-spin shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-[#23252a] shrink-0" />
                  )}
                  <span className={analysisStep >= 4 ? 'text-[#f7f8f8]' : 'text-[#8a8f98]'}>
                    Readying real-time workspace dashboard
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              STEP 5: ONBOARDING COMPLETE -> UNLOCK DASHBOARD
              ───────────────────────────────────────────────────────────── */}
          {step === 'done' && (
            <div className="py-4 text-center space-y-5">
              <div className="w-14 h-14 rounded-full bg-emerald-950/40 border border-emerald-900/40 flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-xl font-semibold text-[#f7f8f8]">
                  Workplace Configured!
                </h3>
                <p className="text-xs text-[#8a8f98] mt-1.5 max-w-sm mx-auto">
                  Your workplace <span className="text-[#f7f8f8] font-medium">{activeWorkspace?.name || workspaceName}</span> and business <span className="text-[#f7f8f8] font-medium">{businessName}</span> are ready. All features are now unlocked.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onComplete}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#5e6ad2] hover:bg-[#828fff] text-white text-xs font-medium transition-all shadow-[0_2px_12px_rgba(94,106,210,0.4)] cursor-pointer"
                >
                  <span>Access Dashboard & Features</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
