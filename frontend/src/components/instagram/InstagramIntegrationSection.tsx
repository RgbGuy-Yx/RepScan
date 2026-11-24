import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  RefreshCw,
  Loader2,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import {
  instagramApi,
  type InstagramAccount,
} from '../../api/instagramApi';

interface InstagramIntegrationSectionProps {
  businessId: string;
  businessName?: string;
  competitorId?: string | null;
}

export default function InstagramIntegrationSection({
  businessId,
  businessName = 'Your Business',
  competitorId,
}: InstagramIntegrationSectionProps) {
  const [accounts, setAccounts] = useState<InstagramAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add account modal / drawer form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [urlOrHandle, setUrlOrHandle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Active sync tracking
  const [syncingAccountIds, setSyncingAccountIds] = useState<Set<string>>(new Set());
  const [syncStatusBanner, setSyncStatusBanner] = useState<string | null>(null);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Polling ref
  const pollingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadAccounts();
    return () => {
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
    };
  }, [businessId, competitorId]);

  const loadAccounts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await instagramApi.listAccounts(businessId, competitorId);
      setAccounts(data);

      // Check if any accounts have active running syncs
      const currentlyRunning = new Set<string>();
      data.forEach((acc) => {
        if (acc.latest_sync && (acc.latest_sync.status === 'running' || acc.latest_sync.status === 'pending')) {
          currentlyRunning.add(acc.id);
        }
      });
      setSyncingAccountIds(currentlyRunning);

      if (currentlyRunning.size > 0 && !pollingTimerRef.current) {
        startPolling();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load Instagram accounts');
    } finally {
      setIsLoading(false);
    }
  };

  const startPolling = () => {
    if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
    pollingTimerRef.current = setInterval(async () => {
      try {
        const fresh = await instagramApi.listAccounts(businessId, competitorId);
        setAccounts(fresh);

        const stillRunning = new Set<string>();
        fresh.forEach((acc) => {
          if (acc.latest_sync && (acc.latest_sync.status === 'running' || acc.latest_sync.status === 'pending')) {
            stillRunning.add(acc.id);
          }
        });

        setSyncingAccountIds(stillRunning);

        if (stillRunning.size === 0 && pollingTimerRef.current) {
          clearInterval(pollingTimerRef.current);
          pollingTimerRef.current = null;
        }
      } catch (err) {
        console.warn('Instagram polling error:', err);
      }
    }, 4000);
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlOrHandle.trim()) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await instagramApi.addAccount(businessId, urlOrHandle.trim(), competitorId);
      setUrlOrHandle('');
      setShowAddModal(false);
      await loadAccounts();
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to add Instagram account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTriggerSync = async (accountId: string) => {
    setSyncStatusBanner(null);
    setSyncingAccountIds((prev) => new Set(prev).add(accountId));
    try {
      const syncRun = await instagramApi.triggerSync(businessId, accountId);
      setSyncStatusBanner(`Sync started in background for account (Run ID: ${syncRun.id}). Polling status...`);
      startPolling();
    } catch (err: any) {
      setSyncStatusBanner(`Sync trigger failed: ${err.message || 'Error occurred'}`);
      setSyncingAccountIds((prev) => {
        const next = new Set(prev);
        next.delete(accountId);
        return next;
      });
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    setIsDeleting(accountId);
    try {
      await instagramApi.deleteAccount(businessId, accountId);
      setConfirmDeleteId(null);
      await loadAccounts();
    } catch (err: any) {
      alert(`Failed to delete account: ${err.message || 'Error occurred'}`);
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="bg-[#171717] rounded-2xl border border-[#262626] p-5 lg:p-6 space-y-5 text-zinc-100 shadow-sm">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between pb-4 border-b border-[#262626] gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center p-[1px]">
              <div className="w-full h-full bg-[#0a0a0a] rounded-[5px] flex items-center justify-center">
                <span className="text-[10px] font-bold text-white">IG</span>
              </div>
            </div>
            <h3 className="text-xs font-semibold text-white">
              Instagram Social Telemetry & Scraper Ingestion
            </h3>
          </div>
          <p className="text-[11px] text-[#a3a3a3] mt-1">
            Track public Instagram business & competitor profiles, posts, public comments, and grounded sentiment via Apify.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(!showAddModal)}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold bg-white hover:bg-zinc-200 text-[#0a0a0a] transition-all active:scale-[0.98] cursor-pointer shadow-sm"
        >
          <Plus className="w-3.5 h-3.5 text-[#0a0a0a]" />
          <span>Track Instagram Profile</span>
        </button>
      </div>

      {/* Sync Banner if active */}
      {syncStatusBanner && (
        <div className="p-3.5 rounded-xl bg-[#141414] border border-[#262626] text-xs text-zinc-300 flex items-center gap-2 font-mono">
          <RefreshCw className="w-3.5 h-3.5 text-[#4ade80] shrink-0" />
          <span className="text-[11px]">{syncStatusBanner}</span>
        </div>
      )}

      {/* Add Account Drawer / Form */}
      {showAddModal && (
        <form
          onSubmit={handleAddAccount}
          className="p-5 rounded-2xl bg-[#141414] border border-[#262626] space-y-3.5 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between">
            <h4 className="font-serif font-light text-sm text-white">
              Add Public Instagram Profile for {businessName}
            </h4>
            <span className="text-[10px] font-mono text-[#737373]">APIFY INSTAGRAM ACTOR</span>
          </div>

          {submitError && (
            <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-900/40 text-xs text-rose-300 flex items-center gap-2 font-mono">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
              <span>{submitError}</span>
            </div>
          )}

          <div>
            <label className="block text-[11px] text-[#a3a3a3] mb-1.5 font-mono">
              Public Profile URL or Instagram Handle
            </label>
            <input
              type="text"
              required
              value={urlOrHandle}
              onChange={(e) => setUrlOrHandle(e.target.value)}
              placeholder="e.g. https://instagram.com/luminarykitchen or @luminarykitchen"
              className="w-full bg-[#1f1f1f] border border-[#262626] rounded-full px-4 py-2 text-xs text-white placeholder-[#737373] focus:border-[#4ade80] focus:outline-none font-mono"
            />
            <p className="text-[10px] text-[#737373] mt-1.5">
              Supports public profiles only. Ingests up to 50 latest posts & reels with public comments.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-3.5 py-1.5 text-xs text-[#a3a3a3] hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !urlOrHandle.trim()}
              className="px-4 py-1.5 rounded-full text-xs font-semibold bg-white hover:bg-zinc-200 text-[#0a0a0a] transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-[0.98] shadow-sm"
            >
              {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin text-[#0a0a0a]" /> : null}
              <span>Save & Connect Profile</span>
            </button>
          </div>
        </form>
      )}

      {/* Account List */}
      {isLoading ? (
        <div className="p-8 flex items-center justify-center gap-2 text-xs text-[#a3a3a3]">
          <Loader2 className="w-4 h-4 text-[#4ade80] animate-spin" />
          <span className="font-mono">Loading connected Instagram profiles...</span>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl border border-rose-900/40 bg-rose-950/20 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400" />
          <span>{error}</span>
        </div>
      ) : accounts.length === 0 ? (
        <div className="p-8 rounded-2xl bg-[#141414] border border-dashed border-[#262626] text-center space-y-3">
          <p className="text-xs text-[#737373] font-mono">
            No Instagram accounts connected yet for {businessName}.
          </p>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold bg-[#1f1f1f] hover:bg-[#262626] text-white border border-[#333333] transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3 text-[#4ade80]" />
            <span>Connect First Instagram Profile</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((acc) => {
            const isSyncing = syncingAccountIds.has(acc.id);
            const status = isSyncing ? 'running' : acc.latest_sync?.status || 'pending';

            return (
              <div
                key={acc.id}
                className="p-4 rounded-2xl border border-[#262626] bg-[#141414] hover:bg-[#1f1f1f]/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Account Details */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 p-[2px] shrink-0">
                    <div className="w-full h-full rounded-full bg-[#0a0a0a] flex items-center justify-center overflow-hidden">
                      {acc.profile_pic_url ? (
                        <img
                          src={acc.profile_pic_url}
                          alt={acc.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="font-bold text-xs uppercase text-zinc-300">
                          {acc.username.slice(0, 2)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-white truncate">
                        @{acc.username}
                      </h4>
                      {acc.is_verified && (
                        <span className="text-[9px] px-2 py-0.5 rounded-full font-mono uppercase bg-indigo-950/40 text-indigo-400 border border-indigo-800/40">
                          VERIFIED
                        </span>
                      )}
                      <span
                        className={`text-[9px] px-2.5 py-0.5 rounded-full font-mono uppercase border font-semibold ${
                          status === 'running'
                            ? 'bg-amber-950/40 text-amber-400 border-amber-800/40 animate-pulse'
                            : status === 'completed'
                            ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40'
                            : status === 'failed'
                            ? 'bg-rose-950/40 text-rose-400 border-rose-800/40'
                            : 'bg-[#1f1f1f] text-[#a3a3a3] border-[#262626]'
                        }`}
                      >
                        {status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#a3a3a3] font-mono">
                      {acc.followers_count != null && (
                        <span>{acc.followers_count.toLocaleString()} followers</span>
                      )}
                      {acc.posts_count != null && (
                        <>
                          <span className="text-[#404040]">•</span>
                          <span>{acc.posts_count.toLocaleString()} posts</span>
                        </>
                      )}
                      {acc.last_synced_at && (
                        <>
                          <span className="text-[#404040]">•</span>
                          <span className="text-[#737373]">
                            Synced {new Date(acc.last_synced_at).toLocaleDateString()}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {/* Sync Now Action */}
                  <button
                    type="button"
                    onClick={() => handleTriggerSync(acc.id)}
                    disabled={isSyncing}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#1f1f1f] hover:bg-[#262626] text-white border border-[#262626] transition-colors disabled:opacity-50 cursor-pointer active:scale-[0.98]"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-[#4ade80] ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
                  </button>

                  {/* Delete / Unlink */}
                  {confirmDeleteId === acc.id ? (
                    <div className="flex items-center gap-1 bg-[#1f1f1f] border border-rose-900/60 rounded-full p-1">
                      <span className="text-[10px] font-mono text-rose-300 px-2">Delete?</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteAccount(acc.id)}
                        disabled={isDeleting === acc.id}
                        className="px-2.5 py-0.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-medium transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {isDeleting === acc.id ? '...' : 'Yes'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2 py-0.5 rounded-full text-[#a3a3a3] hover:text-white text-[10px] transition-colors cursor-pointer"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(acc.id)}
                      title="Disconnect Instagram account"
                      className="w-8 h-8 rounded-full border border-[#262626] bg-[#1f1f1f] text-[#737373] hover:text-rose-400 hover:border-rose-900/40 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
