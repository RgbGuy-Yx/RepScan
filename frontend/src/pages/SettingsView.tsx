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
  Trash2,
} from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';
import { businessApi, type PlatformConnection } from '../api/businessApi';
import googleIcon from '../assets/Google-modern-3D-icon-on-Premium-vector-PNG.avif';
import { Select } from '../components/ui/Dropdown';

export default function SettingsView() {
  const { activeBusiness, refreshBusinesses } = useBusiness();

  // Platform connections state
  const [platforms, setPlatforms] = useState<PlatformConnection[]>([]);
  const [isLoadingPlatforms, setIsLoadingPlatforms] = useState(false);
  const [isScraping, setIsScraping] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeletingPlatform, setIsDeletingPlatform] = useState<string | null>(null);

  // Business profile form state
  const [bizName, setBizName] = useState(activeBusiness?.name || '');
  const [location, setLocation] = useState(activeBusiness?.location || '');
  const [website, setWebsite] = useState(activeBusiness?.website || '');
  const [description, setDescription] = useState(activeBusiness?.description || '');
  const [isSavingBiz, setIsSavingBiz] = useState(false);
  const [bizSaveSuccess, setBizSaveSuccess] = useState(false);

  // New connection form modal/input
  const [showAddPlatform, setShowAddPlatform] = useState(false);
  const [newPlatformType, setNewPlatformType] = useState<'google' | 'instagram' | 'linkedin'>('google');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [isConnectingPlatform, setIsConnectingPlatform] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  const handleDeletePlatform = async (platformId: string) => {
    if (!activeBusiness?.id) return;
    setIsDeletingPlatform(platformId);
    setSyncStatus(null);
    try {
      await businessApi.deletePlatform(activeBusiness.id, platformId);
      setConfirmDeleteId(null);
      setSyncStatus('Platform connection deleted successfully.');
      await loadPlatforms();
    } catch (err: any) {
      setSyncStatus(`Failed to delete platform: ${err.message || 'Error occurred'}`);
    } finally {
      setIsDeletingPlatform(null);
    }
  };

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
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Top Section Header */}
      <div className="border-b border-zinc-800/80 pb-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] uppercase font-mono font-medium tracking-wider text-zinc-500">
            Telemetry Configuration
          </span>
        </div>
        <h2 className="text-lg font-semibold text-zinc-100 tracking-tight">
          Platform Connections & Workspace Settings
        </h2>
        <p className="text-xs text-zinc-400 mt-1">
          Manage live review crawlers, multi-tenant workspace metadata, and business properties in PostgreSQL.
        </p>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 1: CONNECTED DATA SOURCES & SCRAPER PIPELINE
          ───────────────────────────────────────────────────────────── */}
      <div className="bg-zinc-900/60 rounded-lg border border-zinc-800/80 p-5 lg:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between pb-4 border-b border-zinc-800/80 gap-3">
          <div>
            <h3 className="text-xs font-semibold text-zinc-100 flex items-center gap-2">
              <Key className="w-3.5 h-3.5 text-zinc-400" />
              Active Review Sources for {activeBusiness?.name || 'Business'}
            </h3>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Live channels ingest raw customer feedback directly into PostgreSQL.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddPlatform(!showAddPlatform)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-100 hover:bg-white text-zinc-950 transition-colors active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Connect Channel</span>
          </button>
        </div>

        {/* Add Platform Form Drawer */}
        {showAddPlatform && (
          <form
            onSubmit={handleConnectPlatform}
            className="p-4 rounded-md bg-zinc-950 border border-zinc-800/80 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-medium text-zinc-200">Connect Ingestion Channel</h4>
              <span className="text-[10px] font-mono text-zinc-500">POSTGRESQL SYNC</span>
            </div>

            {connectError && (
              <p className="text-xs text-rose-400 font-mono">{connectError}</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Channel Platform</label>
                <Select<'google' | 'instagram' | 'linkedin'>
                  value={newPlatformType}
                  onChange={(val) => setNewPlatformType(val)}
                  options={[
                    {
                      value: 'google',
                      label: 'Google Reviews',
                      icon: <img src={googleIcon} alt="Google" className="w-3.5 h-3.5 object-contain shrink-0" />,
                    },
                    {
                      value: 'instagram',
                      label: 'Instagram Comments',
                      icon: <Globe className="w-3.5 h-3.5 text-zinc-400 shrink-0" />,
                    },
                    {
                      value: 'linkedin',
                      label: 'LinkedIn Feedback',
                      icon: <Globe className="w-3.5 h-3.5 text-zinc-400 shrink-0" />,
                    },
                  ]}
                  size="sm"
                  className="w-full"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] text-zinc-400 mb-1">
                  Listing URL or Place Identifier
                </label>
                <input
                  type="text"
                  required
                  value={newSourceUrl}
                  onChange={(e) => setNewSourceUrl(e.target.value)}
                  placeholder="https://maps.google.com/?cid=..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:border-zinc-500 focus:outline-none font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddPlatform(false)}
                className="px-3 py-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isConnectingPlatform || !newSourceUrl.trim()}
                className="px-3.5 py-1.5 rounded-md text-xs font-medium bg-zinc-100 hover:bg-white text-zinc-950 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-[0.98]"
              >
                {isConnectingPlatform ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                <span>Connect Source</span>
              </button>
            </div>
          </form>
        )}

        {/* Sync Status Banner */}
        {syncStatus && (
          <div className="p-3 rounded-md bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span className="font-mono text-[11px]">{syncStatus}</span>
          </div>
        )}

        {/* Platform Cards List */}
        {isLoadingPlatforms ? (
          <div className="p-8 flex items-center justify-center gap-2 text-xs text-zinc-500">
            <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" />
            <span className="font-mono">Loading connected channels...</span>
          </div>
        ) : platforms.length === 0 ? (
          <div className="p-8 rounded-md bg-zinc-950/50 border border-dashed border-zinc-800 text-center space-y-2">
            <p className="text-xs text-zinc-500 font-mono">
              No scraping channels connected yet for {activeBusiness?.name || 'this business'}.
            </p>
            <button
              type="button"
              onClick={() => setShowAddPlatform(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/80 transition-colors cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Connect First Channel</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/80 border border-zinc-800/80 rounded-md overflow-hidden bg-zinc-950/50">
            {platforms.map((conn) => (
              <div
                key={conn.id}
                className="p-3.5 lg:p-4 flex flex-wrap items-center justify-between gap-3 hover:bg-zinc-900/40 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`w-7 h-7 rounded font-mono font-semibold text-[11px] flex items-center justify-center border shrink-0 ${
                      conn.platform === 'google_maps'
                        ? 'bg-zinc-900 text-zinc-200 border-zinc-700'
                        : conn.platform === 'instagram'
                        ? 'bg-zinc-900 text-zinc-200 border-zinc-700'
                        : 'bg-zinc-900 text-zinc-200 border-zinc-700'
                    }`}
                  >
                    {conn.platform === 'google_maps' ? (
                      <img src={googleIcon} alt="Google" className="w-4 h-4 object-contain" />
                    ) : conn.platform === 'instagram' ? (
                      'IG'
                    ) : (
                      'IN'
                    )}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-zinc-100 capitalize">
                        {conn.platform.replace('_', ' ')}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-mono uppercase bg-emerald-950/40 text-emerald-400 border border-emerald-800/40">
                        {conn.status}
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-500 font-mono truncate max-w-md block mt-0.5">
                      {conn.source_url || conn.place_id || 'Configured via place ID'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleTriggerScrape(conn.id)}
                    disabled={isScraping === conn.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition-colors disabled:opacity-50 cursor-pointer active:scale-[0.98]"
                  >
                    <RefreshCw className={`w-3 h-3 text-zinc-400 ${isScraping === conn.id ? 'animate-spin' : ''}`} />
                    <span>{isScraping === conn.id ? 'Crawling...' : 'Trigger Crawl'}</span>
                  </button>

                  {confirmDeleteId === conn.id ? (
                    <div className="flex items-center gap-1 bg-zinc-950 border border-rose-900/60 rounded-md p-1">
                      <span className="text-[10px] font-mono text-rose-300 px-1">Delete?</span>
                      <button
                        type="button"
                        onClick={() => handleDeletePlatform(conn.id)}
                        disabled={isDeletingPlatform === conn.id}
                        className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-medium transition-colors disabled:opacity-50"
                      >
                        {isDeletingPlatform === conn.id ? '...' : 'Yes'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-1.5 py-0.5 rounded text-zinc-400 hover:text-zinc-200 text-[10px] transition-colors"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(conn.id)}
                      disabled={isDeletingPlatform === conn.id}
                      title="Disconnect channel"
                      className="w-7 h-7 rounded-md border border-zinc-800 bg-zinc-900 text-zinc-500 hover:text-rose-400 hover:border-rose-900/40 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 2: BUSINESS ENTITY PROFILE (EDITABLE IN POSTGRESQL)
          ───────────────────────────────────────────────────────────── */}
      <div className="bg-zinc-900/60 rounded-lg border border-zinc-800/80 p-5 lg:p-6 space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80">
          <div>
            <h3 className="text-xs font-semibold text-zinc-100 flex items-center gap-2">
              <Building className="w-3.5 h-3.5 text-zinc-400" />
              Business Profile Metadata
            </h3>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Configured entity metadata used by zero-hallucination AI grounding.
            </p>
          </div>
          {bizSaveSuccess && (
            <span className="text-xs text-emerald-400 flex items-center gap-1 font-mono text-[11px]">
              <Check className="w-3.5 h-3.5" />
              <span>Saved to database</span>
            </span>
          )}
        </div>

        <form onSubmit={handleSaveBusiness} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Business Name <span className="text-zinc-500">*</span>
              </label>
              <input
                type="text"
                required
                value={bizName}
                onChange={(e) => setBizName(e.target.value)}
                placeholder="e.g. Luminary Kitchen"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-xs text-zinc-100 focus:border-zinc-500 focus:outline-none font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Operating Location / Region
              </label>
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Austin, TX"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md pl-8 pr-3 py-2 text-xs text-zinc-100 focus:border-zinc-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Official Website
              </label>
              <div className="relative">
                <Globe className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://luminary.com"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md pl-8 pr-3 py-2 text-xs text-zinc-100 focus:border-zinc-500 focus:outline-none font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Description / Context
              </label>
              <div className="relative">
                <FileText className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Farm-to-table dining"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md pl-8 pr-3 py-2 text-xs text-zinc-100 focus:border-zinc-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={isSavingBiz || !bizName.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-medium bg-zinc-100 hover:bg-white text-zinc-950 transition-colors cursor-pointer disabled:opacity-50 active:scale-[0.98]"
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
      <div className="bg-zinc-900/60 rounded-lg border border-zinc-800/80 p-5 lg:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold text-zinc-100 flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-zinc-400" />
              Account & Data Security
            </h3>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Real-time verified credentials and PostgreSQL data encryption.
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-md bg-zinc-950 border border-zinc-800/80 flex items-center justify-between text-xs">
          <div>
            <span className="font-medium text-zinc-200 block">Live PostgreSQL Ingestion</span>
            <span className="text-[11px] text-zinc-500 font-mono">Feedback telemetry, sentiment vectors, and grounded rag queries stream in real-time</span>
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[9px] uppercase bg-emerald-950/40 text-emerald-400 border border-emerald-800/40 font-medium">
            <Check className="w-3 h-3 text-emerald-400" />
            <span>ACTIVE</span>
          </span>
        </div>
      </div>
    </div>
  );
}
