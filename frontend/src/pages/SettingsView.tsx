import { useState } from 'react';
import {
  Key,
  Clock,
  Building,
  RefreshCw,
  Check,
  Plus,
} from 'lucide-react';
import { MOCK_BUSINESS } from '../mock/dashboardData';

export default function SettingsView() {
  const [apifyToken, setApifyToken] = useState('apify_api_99b78x42910fa89c018274');
  const [isTokenSaved, setIsTokenSaved] = useState(true);
  const [isTestingSync, setIsTestingSync] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const [googleActive, setGoogleActive] = useState(true);
  const [instaActive, setInstaActive] = useState(true);
  const [linkedinActive, setLinkedinActive] = useState(true);

  const [scrapeInterval, setScrapeInterval] = useState('60');
  const [autoActionCreation, setAutoActionCreation] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);

  const handleTestScrape = () => {
    setIsTestingSync(true);
    setSyncStatus(null);
    setTimeout(() => {
      setIsTestingSync(false);
      setSyncStatus('Successfully crawled 14 new reviews across Google & Instagram.');
    }, 1200);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-7">
      {/* Top Section Header */}
      <div>
        <h2 className="text-xl font-semibold text-[#f7f8f8] tracking-tight">Platform Connections & System Settings</h2>
        <p className="text-xs text-[#8a8f98] mt-1">
          Configure ingestion connectors, crawler schedules, RAG grounding parameters, and business profile metadata.
        </p>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 1: CONNECTED DATA SOURCES & APIFY PIPELINE
          ───────────────────────────────────────────────────────────── */}
      <div className="bg-[#0f1011] rounded-xl border border-[#23252a] p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-[#23252a]">
          <div>
            <h3 className="text-sm font-semibold text-[#f7f8f8] flex items-center gap-2">
              <Key className="w-4 h-4 text-[#828fff]" />
              Connected Scraping Channels & Credentials
            </h3>
            <p className="text-xs text-[#8a8f98] mt-0.5">
              Multi-platform connectors crawl live public reviews into PostgreSQL with deterministic deduplication.
            </p>
          </div>
          <button
            type="button"
            onClick={handleTestScrape}
            disabled={isTestingSync}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#23252a] bg-[#141516] hover:border-[#34343a] text-xs font-medium text-[#d0d6e0] hover:text-[#f7f8f8] transition-colors shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTestingSync ? 'animate-spin text-[#828fff]' : 'text-[#8a8f98]'}`} />
            <span>{isTestingSync ? 'Crawling…' : 'Trigger Crawl Now'}</span>
          </button>
        </div>

        {syncStatus && (
          <div className="p-3 rounded-lg bg-[#27a644]/10 border border-[#27a644]/25 text-xs text-[#4ade80] flex items-center gap-2">
            <Check className="w-4 h-4 text-[#27a644] shrink-0" />
            <span>{syncStatus}</span>
          </div>
        )}

        {/* Channels List */}
        <div className="space-y-3.5">
          {/* Google Places / Google Reviews */}
          <div className="p-4 rounded-xl border border-[#23252a] bg-[#141516] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)]">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-md bg-red-950/40 text-red-400 border border-red-900/30 flex items-center justify-center font-bold text-sm shrink-0">
                G
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-semibold text-[#f7f8f8]">Google Places Reviews</h4>
                  <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-[#27a644]/15 text-[#4ade80] border border-[#27a644]/30">
                    Active (1,246 reviews)
                  </span>
                </div>
                <p className="text-[11px] text-[#8a8f98] mt-0.5">
                  Actor: <code className="font-mono text-[10px] text-[#d0d6e0]">compass/crawler-google-places</code> • Last scrape: 14 mins ago
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setGoogleActive(!googleActive)}
                className={`text-xs px-3 py-1 rounded-md font-medium transition-colors border ${
                  googleActive
                    ? 'bg-[#5e6ad2] text-white border-[#5e6ad2] shadow-xs'
                    : 'bg-[#18191a] text-[#8a8f98] border-[#23252a]'
                }`}
              >
                {googleActive ? 'Enabled' : 'Disabled'}
              </button>
            </div>
          </div>

          {/* Instagram Connector */}
          <div className="p-4 rounded-xl border border-[#23252a] bg-[#141516] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)]">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-md bg-pink-950/40 text-pink-400 border border-pink-900/30 flex items-center justify-center font-bold text-xs shrink-0">
                IG
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-semibold text-[#f7f8f8]">Instagram Comments & Mentions</h4>
                  <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-[#27a644]/15 text-[#4ade80] border border-[#27a644]/30">
                    Active (432 reviews)
                  </span>
                </div>
                <p className="text-[11px] text-[#8a8f98] mt-0.5">
                  Account: <code className="font-mono text-[10px] text-[#d0d6e0]">@theurbantable.mumbai</code> • Last scrape: 42 mins ago
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setInstaActive(!instaActive)}
                className={`text-xs px-3 py-1 rounded-md font-medium transition-colors border ${
                  instaActive
                    ? 'bg-[#5e6ad2] text-white border-[#5e6ad2] shadow-xs'
                    : 'bg-[#18191a] text-[#8a8f98] border-[#23252a]'
                }`}
              >
                {instaActive ? 'Enabled' : 'Disabled'}
              </button>
            </div>
          </div>

          {/* LinkedIn Connector */}
          <div className="p-4 rounded-xl border border-[#23252a] bg-[#141516] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)]">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-md bg-blue-950/40 text-blue-400 border border-blue-900/30 flex items-center justify-center font-bold text-xs shrink-0">
                in
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-semibold text-[#f7f8f8]">LinkedIn Company Page Feedback</h4>
                  <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-[#27a644]/15 text-[#4ade80] border border-[#27a644]/30">
                    Active (87 reviews)
                  </span>
                </div>
                <p className="text-[11px] text-[#8a8f98] mt-0.5">
                  Page: <code className="font-mono text-[10px] text-[#d0d6e0]">The Urban Table Hospitality</code> • Last scrape: 2 hours ago
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setLinkedinActive(!linkedinActive)}
                className={`text-xs px-3 py-1 rounded-md font-medium transition-colors border ${
                  linkedinActive
                    ? 'bg-[#5e6ad2] text-white border-[#5e6ad2] shadow-xs'
                    : 'bg-[#18191a] text-[#8a8f98] border-[#23252a]'
                }`}
              >
                {linkedinActive ? 'Enabled' : 'Disabled'}
              </button>
            </div>
          </div>

          {/* Connect Another Channel CTA */}
          <button
            type="button"
            onClick={() => alert('New platform integration wizard: TripAdvisor, Trustpilot, and Zomato connectors ready for API keys.')}
            className="w-full py-2.5 rounded-xl border border-dashed border-[#23252a] text-[#8a8f98] hover:text-[#f7f8f8] hover:border-[#3e3e44] text-xs font-medium flex items-center justify-center gap-2 transition-colors bg-[#0f1011]"
          >
            <Plus className="w-4 h-4" />
            <span>Connect Additional Platform (TripAdvisor, Zomato, Trustpilot)</span>
          </button>
        </div>

        {/* API Credentials */}
        <div className="pt-4 border-t border-[#23252a] space-y-3">
          <label className="text-xs font-semibold text-[#f7f8f8] block">
            Apify API Token (Scraper Pipeline)
          </label>
          <div className="flex gap-2">
            <input
              type="password"
              value={apifyToken}
              onChange={(e) => {
                setApifyToken(e.target.value);
                setIsTokenSaved(false);
              }}
              className="flex-1 h-9 px-3 text-xs rounded-md border border-[#23252a] font-mono bg-[#141516] text-[#f7f8f8] focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2]"
            />
            <button
              type="button"
              onClick={() => setIsTokenSaved(true)}
              className="linear-btn-primary text-xs px-4 h-9"
            >
              {isTokenSaved ? 'Saved' : 'Save Key'}
            </button>
          </div>
          <span className="text-[11px] text-[#62666d] block">
            Used by backend scheduler (<code className="font-mono text-[10px] text-[#8a8f98]">schedulerService.ts</code>) to invoke actors and sync feedback every {scrapeInterval} minutes.
          </span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 2: PIPELINE CADENCE & RAG GROUNDING RULES
          ───────────────────────────────────────────────────────────── */}
      <div className="bg-[#0f1011] rounded-xl border border-[#23252a] p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] space-y-6">
        <div className="pb-4 border-b border-[#23252a]">
          <h3 className="text-sm font-semibold text-[#f7f8f8] flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#8a8f98]" />
            Crawling Cadence & AI Processing Engine
          </h3>
          <p className="text-xs text-[#8a8f98] mt-0.5">
            Configure how frequently reviews are scraped and processed through the Mistral-7B / Local Ollama RAG pipeline.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Scrape Interval */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#d0d6e0] block">Scrape Interval Cadence</label>
            <select
              value={scrapeInterval}
              onChange={(e) => setScrapeInterval(e.target.value)}
              className="w-full h-9 px-3 text-xs rounded-md border border-[#23252a] bg-[#141516] text-[#f7f8f8] focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2]"
            >
              <option value="15">Every 15 minutes (High-frequency)</option>
              <option value="60">Every 60 minutes (Standard - Recommended)</option>
              <option value="360">Every 6 hours</option>
              <option value="1440">Once daily (24 hours)</option>
            </select>
            <span className="text-[11px] text-[#62666d]">Controls Apify webhook execution and cron schedules.</span>
          </div>

          {/* Model Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#d0d6e0] block">AI Reasoning Engine</label>
            <select
              defaultValue="mistral"
              className="w-full h-9 px-3 text-xs rounded-md border border-[#23252a] bg-[#141516] text-[#f7f8f8] focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2]"
            >
              <option value="mistral">Mistral-7B Instruct (Grounded RAG with pgvector)</option>
              <option value="ollama-llama3">Local Ollama Llama-3 (Zero Data Egress)</option>
              <option value="gpt4o">OpenAI GPT-4o Mini (High Throughput)</option>
            </select>
            <span className="text-[11px] text-[#62666d]">All prompt outputs enforce source review ID citations.</span>
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-3 pt-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={autoActionCreation}
              onChange={(e) => setAutoActionCreation(e.target.checked)}
              className="w-4 h-4 rounded border-[#23252a] bg-[#141516] text-[#5e6ad2] focus:ring-[#5e6ad2] accent-[#5e6ad2]"
            />
            <div>
              <span className="text-xs font-medium text-[#f7f8f8] block">Auto-generate Action Board Tasks</span>
              <span className="text-[11px] text-[#8a8f98] block">
                Automatically create a draft task in the Action Board when negative sentiment on a theme spikes by &gt;50%.
              </span>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={emailAlerts}
              onChange={(e) => setEmailAlerts(e.target.checked)}
              className="w-4 h-4 rounded border-[#23252a] bg-[#141516] text-[#5e6ad2] focus:ring-[#5e6ad2] accent-[#5e6ad2]"
            />
            <div>
              <span className="text-xs font-medium text-[#f7f8f8] block">Weekly Executive PDF Email Brief</span>
              <span className="text-[11px] text-[#8a8f98] block">
                Email the consolidated Monday morning intelligence brief directly to {MOCK_BUSINESS.user.name}.
              </span>
            </div>
          </label>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 3: BUSINESS PROFILE METADATA
          ───────────────────────────────────────────────────────────── */}
      <div className="bg-[#0f1011] rounded-xl border border-[#23252a] p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] space-y-6">
        <div className="pb-4 border-b border-[#23252a]">
          <h3 className="text-sm font-semibold text-[#f7f8f8] flex items-center gap-2">
            <Building className="w-4 h-4 text-[#8a8f98]" />
            Business Profile & Location Details
          </h3>
          <p className="text-xs text-[#8a8f98] mt-0.5">
            Metadata used for localized sentiment normalization and multi-lingual language detection.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-[#d0d6e0] block mb-1">Business Name</label>
            <input
              type="text"
              defaultValue={MOCK_BUSINESS.name}
              className="w-full h-9 px-3 text-xs rounded-md border border-[#23252a] bg-[#141516] text-[#f7f8f8] focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2]"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[#d0d6e0] block mb-1">Industry Sector</label>
            <input
              type="text"
              defaultValue="Hospitality & Fine Dining"
              className="w-full h-9 px-3 text-xs rounded-md border border-[#23252a] bg-[#141516] text-[#f7f8f8] focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2]"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[#d0d6e0] block mb-1">Primary Operating City</label>
            <input
              type="text"
              defaultValue="Mumbai, Maharashtra, India"
              className="w-full h-9 px-3 text-xs rounded-md border border-[#23252a] bg-[#141516] text-[#f7f8f8] focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2]"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[#d0d6e0] block mb-1">Timezone</label>
            <input
              type="text"
              defaultValue="Asia/Kolkata (IST, UTC+05:30)"
              disabled
              className="w-full h-9 px-3 text-xs rounded-md border border-[#23252a] bg-[#18191a] text-[#62666d] font-mono text-[11px]"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={() => alert('Profile configuration saved.')}
            className="linear-btn-primary text-xs px-5 h-9"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
