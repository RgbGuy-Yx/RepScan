import React, { useState } from 'react';
import { Building2, X, Loader2 } from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateWorkspaceModal({ isOpen, onClose }: CreateWorkspaceModalProps) {
  const { createWorkspace } = useBusiness();
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await createWorkspace(name.trim());
      setName('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create workspace.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm font-sans">
      <div className="w-full max-w-md bg-[#171717] border border-[#262626] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
        <div className="px-6 py-4 border-b border-[#262626] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#4ade80]" />
            <h3 className="font-serif font-light text-xl text-white tracking-tight">Create Workspace</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-[#1f1f1f] border border-[#262626] flex items-center justify-center text-[#a3a3a3] hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[#a3a3a3] mb-1.5">
              Workspace Organization Name <span className="text-[#4ade80]">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Apex Hospitality Group"
              className="w-full bg-[#1f1f1f] border border-[#262626] rounded-full px-4 py-2 text-xs text-white focus:border-[#404040] focus:outline-none transition-colors"
            />
            <p className="text-[11px] text-[#737373] mt-1.5 font-mono">
              You will automatically be assigned the <span className="text-white">owner</span> role.
            </p>
          </div>

          <div className="pt-3 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="btn-pill-secondary text-xs py-2 px-4"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="btn-pill-primary text-xs py-2 px-5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <span>Create Workspace</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
