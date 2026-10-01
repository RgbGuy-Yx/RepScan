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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-md bg-[#0f1011] border border-[#23252a] rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#23252a] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#5e6ad2]" />
            <h3 className="text-sm font-semibold text-[#f7f8f8]">Create New Workspace</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[#141516] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/40 text-rose-200 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[#d0d6e0] mb-1">
              Workspace Organization Name <span className="text-[#5e6ad2]">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Apex Hospitality Group"
              className="w-full bg-[#141516] border border-[#23252a] rounded-lg px-3 py-2 text-xs text-[#f7f8f8] focus:border-[#5e6ad2] focus:outline-none transition-colors"
            />
            <p className="text-[11px] text-[#62666d] mt-1.5">
              You will automatically be assigned the <span className="text-[#f7f8f8]">owner</span> role with full administrative permissions.
            </p>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-[#8a8f98] hover:text-[#f7f8f8] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#5e6ad2] hover:bg-[#828fff] text-white text-xs font-medium transition-all shadow-[0_2px_8px_rgba(94,106,210,0.3)] disabled:opacity-50 cursor-pointer"
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
