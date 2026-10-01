import React, { useState, useEffect } from 'react';
import {
  Key,
  Building,
  RefreshCw,
  Check,
  Plus,
  Loader2,
  Globe,
  MapPin,
  FileText,
  Shield,
} from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';
import { businessApi, type PlatformConnection } from '../api/businessApi';

export default function SettingsView() {
  const { activeBusiness, refreshBusinesses } = useBusiness();

  // Platform connections state
  const [platforms, setPlatforms] = useState<PlatformConnection[]>([]);
  const [isLoadingPlatforms, setIsLoadingPlatforms] = useState(false);
  const [isScraping, setIsScraping] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // Business profile form state
  const [bizName, setBizName] = useState(activeBusiness?.name || '');
  const [location, setLocation] = useState(activeBusiness?.location || '');
  const [website, setWebsite] = useState(activeBusiness?.website || '');
  const [description, setDescription] = useState(activeBusiness?.description || '');
  const [isSavingBiz, setIsSavingBiz] = useState(false);
  const [bizSaveSuccess, setBizSaveSuccess] = useState(false);

  // New connection form modal/input
  const [showAddPlatform, setShowAddPlatform] = useState(false);
  const [newPlatformType, setNewPlatformType] = useState<'google_maps' | 'instagram' | 'linkedin'>('google_maps');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [isConnectingPlatform, setIsConnectingPlatform] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  useEffect(() => {
    if (activeBusiness) {
      setBizName(activeBusiness.name);
      setLocation(activeBusiness.location || '');
      setWebsite(activeBusiness.website || '');
      setDescription(activeBusiness.description || '');
    }
  }, [activeBusiness]);

  const loadPlatforms = async () => {
    if (!activeBusiness?.id) return;
    setIsLoadingPlatforms(true);
    try {
      const data = await businessApi.listPlatforms(activeBusiness.id);
      setPlatforms(data);
    } catch (err) {
      console.warn('Failed to load platforms:', err);
    } finally {
      setIsLoadingPlatforms(false);
    }
  };

  useEffect(() => {
    loadPlatforms();
  }, [activeBusiness?.id]);

  const handleTriggerScrape = async (platformId: string) => {
    if (!activeBusiness?.id) return;
    setIsScraping(platformId);
    setSyncStatus(null);
    try {
      const res = await businessApi.triggerScrape(activeBusiness.id, platformId);
      setSyncStatus(`Scrape initiated successfully (Run ID: ${res.runId}). Ingesting review telemetry into PostgreSQL.`);
      await loadPlatforms();
    } catch (err: any) {
      setSyncStatus(`Scrape failed: ${err.message || 'Error triggering actor'}`);
    } finally {
      setIsScraping(null);
    }
  };

  const handleSaveBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness?.id || !bizName.trim()) return;
    setIsSavingBiz(true);
    setBizSaveSuccess(false);
    try {
      await businessApi.updateBusiness(activeBusiness.id, {
        name: bizName.trim(),
        location: location.trim() || undefined,
        website: website.trim() || undefined,
        description: description.trim() || undefined,
      });
      setBizSaveSuccess(true);
      await refreshBusinesses();
      setTimeout(() => setBizSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update business profile:', err);
    } finally {
      setIsSavingBiz(false);
    }
  };

  const handleConnectPlatform = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness?.id || !newSourceUrl.trim()) return;
    setIsConnectingPlatform(true);
    setConnectError(null);
    try {
      await businessApi.connectPlatform(activeBusiness.id, newPlatformType, {
        sourceUrl: newSourceUrl.trim(),
        placeName: activeBusiness.name,
      });
      setNewSourceUrl('');
      setShowAddPlatform(false);
      await loadPlatforms();
    } catch (err: any) {
      setConnectError(err.message || 'Failed to connect platform channel');
    } finally {
      setIsConnectingPlatform(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-7">
      {/* Top Section Header */}
      <div>
        <h2 className="text-xl font-semibold text-[#f7f8f8] tracking-tight">
          Platform Connections & Workspace Settings
        </h2>
        <p className="text-xs text-[#8a8f98] mt-1">
          Manage live review crawlers, multi-tenant workspace metadata, and business properties in PostgreSQL.
        </p>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 1: CONNECTED DATA SOURCES & SCRAPER PIPELINE
          ───────────────────────────────────────────────────────────── */}
      <div className="bg-[#0f1011] rounded-xl border border-[#23252a] p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] space-y-6">
        <div className="flex flex-wrap items-center justify-between pb-4 border-b border-[#23252a] gap-3">
          <div>
            <h3 className="text-sm font-semibold text-[#f7f8f8] flex items-center gap-2">
              <Key className="w-4 h-4 text-[#828fff]" />
              Active Review Sources for {activeBusiness?.name || 'Business'}
            </h3>
            <p className="text-xs text-[#8a8f98] mt-0.5">
              Live channels ingest raw customer feedback directly into PostgreSQL.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddPlatform(!showAddPlatform)}
            className="linear-btn-secondary text-xs h-8 px-3 flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Connect New Channel</span>
          </button>
        </div>

        {/* Add Platform Form Drawer */}
        {showAddPlatform && (
          <form
            onSubmit={handleConnectPlatform}
            className="p-4 rounded-xl bg-[#141516] border border-[#23252a] space-y-3"
          >
            <h4 className="text-xs font-semibold text-[#f7f8f8]">Add Channel Connection</h4>
            {connectError && (
              <p className="text-xs text-rose-400">{connectError}</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-[#8a8f98] mb-1">Platform Type</label>
                <select
                  value={newPlatformType}
                  onChange={(e: any) => setNewPlatformType(e.target.value)}
                  className="w-full bg-[#0f1011] border border-[#23252a] rounded-lg px-2.5 py-1.5 text-xs text-[#f7f8f8] focus:border-[#5e6ad2] focus:outline-none"
                >
                  <option value="google_maps">Google Maps Reviews</option>
                  <option value="instagram">Instagram Comments</option>
                  <option value="linkedin">LinkedIn Post Feedback</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] text-[#8a8f98] mb-1">
                  Listing URL or Place Identifier
                </label>
                <input
                  type="text"
                  required
                  value={newSourceUrl}
                  onChange={(e) => setNewSourceUrl(e.target.value)}
                  placeholder="https://maps.google.com/?cid=..."
                  className="w-full bg-[#0f1011] border border-[#23252a] rounded-lg px-3 py-1.5 text-xs text-[#f7f8f8] placeholder-[#62666d] focus:border-[#5e6ad2] focus:outline-none font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddPlatform(false)}
                className="px-3 py-1 text-xs text-[#8a8f98] hover:text-[#d0d6e0]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isConnectingPlatform || !newSourceUrl.trim()}
                className="linear-btn-primary text-xs h-7 px-3 flex items-center gap-1 cursor-pointer"
              >
                {isConnectingPlatform ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                <span>Connect Source</span>
              </button>
            </div>
          </form>
        )}

        {/* Sync Status Banner */}
        {syncStatus && (
          <div className="p-3 rounded-lg bg-[#141516] border border-[#23252a] text-xs text-[#d0d6e0] flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 text-[#5e6ad2] shrink-0" />
            <span>{syncStatus}</span>
          </div>
        )}

        {/* Platform Cards List */}
        {isLoadingPlatforms ? (
          <div className="p-6 flex items-center justify-center gap-2 text-xs text-[#8a8f98]">
            <Loader2 className="w-4 h-4 text-[#5e6ad2] animate-spin" />
            <span>Loading connected channels...</span>
          </div>
        ) : platforms.length === 0 ? (
          <div className="p-8 rounded-lg bg-[#141516]/60 border border-dashed border-[#23252a] text-center space-y-2">
            <p className="text-xs text-[#8a8f98]">
              No scraping channels connected yet for {activeBusiness?.name || 'this business'}.
            </p>
            <button
              type="button"
              onClick={() => setShowAddPlatform(true)}
              className="linear-btn-secondary text-xs h-7 px-3 inline-flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Connect First Channel</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {platforms.map((conn) => (
              <div
                key={conn.id}
                className="p-4 rounded-xl bg-[#141516] border border-[#23252a] flex flex-wrap items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-9 h-9 rounded-lg font-bold text-xs flex items-center justify-center border ${
                      conn.platform === 'google_maps'
                        ? 'bg-red-950/40 text-red-400 border-red-900/30'
                        : conn.platform === 'instagram'
                        ? 'bg-pink-950/40 text-pink-400 border-pink-900/30'
                        : 'bg-blue-950/40 text-blue-400 border-blue-900/30'
                    }`}
                  >
                    {conn.platform === 'google_maps' ? 'G' : conn.platform === 'instagram' ? 'IG' : 'in'}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#f7f8f8] capitalize">
                        {conn.platform.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded font-mono uppercase bg-emerald-950/50 text-emerald-400 border border-emerald-900/30">
                        {conn.status}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#62666d] font-mono truncate max-w-sm block">
                      {conn.source_url || conn.place_id || 'Configured via place ID'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleTriggerScrape(conn.id)}
                    disabled={isScraping === conn.id}
                    className="linear-btn-secondary text-xs h-8 px-3 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 text-[#5e6ad2] ${isScraping === conn.id ? 'animate-spin' : ''}`} />
                    <span>{isScraping === conn.id ? 'Crawling...' : 'Trigger Crawl'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 2: BUSINESS ENTITY PROFILE (EDITABLE IN POSTGRESQL)
          ───────────────────────────────────────────────────────────── */}
      <div className="bg-[#0f1011] rounded-xl border border-[#23252a] p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-[#23252a]">
          <div>
            <h3 className="text-sm font-semibold text-[#f7f8f8] flex items-center gap-2">
              <Building className="w-4 h-4 text-[#5e6ad2]" />
              Business Profile Metadata
            </h3>
            <p className="text-xs text-[#8a8f98] mt-0.5">
              Configured entity metadata used by the zero-hallucination AI grounding service.
            </p>
          </div>
          {bizSaveSuccess && (
            <span className="text-xs text-[#4ade80] flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              <span>Saved to database</span>
            </span>
          )}
        </div>

        <form onSubmit={handleSaveBusiness} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#d0d6e0] mb-1.5">
                Business Name <span className="text-[#5e6ad2]">*</span>
              </label>
              <input
                type="text"
                required
                value={bizName}
                onChange={(e) => setBizName(e.target.value)}
                placeholder="e.g. Luminary Kitchen"
                className="w-full bg-[#141516] border border-[#23252a] rounded-lg px-3 py-2 text-xs text-[#f7f8f8] focus:border-[#5e6ad2] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#d0d6e0] mb-1.5">
                Operating Location / Region
              </label>
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 text-[#62666d] absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Austin, TX"
                  className="w-full bg-[#141516] border border-[#23252a] rounded-lg pl-8 pr-3 py-2 text-xs text-[#f7f8f8] focus:border-[#5e6ad2] focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#d0d6e0] mb-1.5">
                Official Website
              </label>
              <div className="relative">
                <Globe className="w-3.5 h-3.5 text-[#62666d] absolute left-3 top-2.5" />
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://luminary.com"
                  className="w-full bg-[#141516] border border-[#23252a] rounded-lg pl-8 pr-3 py-2 text-xs text-[#f7f8f8] focus:border-[#5e6ad2] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#d0d6e0] mb-1.5">
                Description / Context
              </label>
              <div className="relative">
                <FileText className="w-3.5 h-3.5 text-[#62666d] absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Farm-to-table dining"
                  className="w-full bg-[#141516] border border-[#23252a] rounded-lg pl-8 pr-3 py-2 text-xs text-[#f7f8f8] focus:border-[#5e6ad2] focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSavingBiz || !bizName.trim()}
              className="linear-btn-primary text-xs h-8 px-4 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSavingBiz ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>Save Business Details</span>
            </button>
          </div>
        </form>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 3: ACCOUNT & DATA SECURITY
          ───────────────────────────────────────────────────────────── */}
      <div className="bg-[#0f1011] rounded-xl border border-[#23252a] p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-[#f7f8f8] flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            Account & Data Security
          </h3>
          <p className="text-xs text-[#8a8f98] mt-0.5">
            Real-time verified credentials and PostgreSQL data encryption.
          </p>
        </div>

        <div className="p-4 rounded-lg bg-[#141516] border border-[#23252a] flex items-center justify-between text-xs">
          <div>
            <span className="font-semibold text-[#f7f8f8] block">Live PostgreSQL Ingestion</span>
            <span className="text-[11px] text-[#8a8f98]">All feedback, metrics, and chat queries stream in real-time</span>
          </div>
          <span className="px-2.5 py-1 rounded font-mono uppercase bg-emerald-950/40 text-emerald-300 border border-emerald-800/40 font-semibold text-[10px]">
            Active ✓
          </span>
        </div>
      </div>
    </div>
  );
}
