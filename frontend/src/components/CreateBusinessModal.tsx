import React, { useState } from 'react';
import { Briefcase, X, Loader2 } from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';
import { Select } from './ui/Dropdown';

interface CreateBusinessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateBusinessModal({ isOpen, onClose }: CreateBusinessModalProps) {
  const { createBusiness, activeWorkspace } = useBusiness();
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('Hospitality & Dining');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await createBusiness({
        name: name.trim(),
        industry: industry || undefined,
        location: location.trim() || undefined,
        website: website.trim() || undefined,
        description: description.trim() || undefined,
        workspace_id: activeWorkspace?.id,
      });
      setName('');
      setLocation('');
      setWebsite('');
      setDescription('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create business.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
        <div className="px-5 py-4 border-b border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-zinc-400" />
            <h3 className="text-xs font-semibold text-zinc-100 tracking-tight">Add Business Entity</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          {error && (
            <div className="p-2.5 rounded-md bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs font-mono">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Business Name <span className="text-zinc-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Luminary Downtown"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-zinc-100 focus:border-zinc-500 focus:outline-none transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Industry</label>
              <Select
                value={industry}
                onChange={(val) => setIndustry(val)}
                options={[
                  { value: 'Hospitality & Dining', label: 'Hospitality & Dining' },
                  { value: 'Retail & E-commerce', label: 'Retail & E-commerce' },
                  { value: 'Healthcare & Wellness', label: 'Healthcare & Wellness' },
                  { value: 'SaaS & Technology', label: 'SaaS & Technology' },
                  { value: 'Real Estate', label: 'Real Estate' },
                ]}
                size="sm"
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Austin, TX"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-2.5 py-1.5 text-xs text-zinc-100 focus:border-zinc-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Website (Optional)</label>
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-zinc-100 focus:border-zinc-500 focus:outline-none transition-colors font-mono"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer active:scale-[0.98]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Adding...</span>
                </>
              ) : (
                <span>Add Business</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
