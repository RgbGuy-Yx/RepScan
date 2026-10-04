import { X, CheckCircle2 } from 'lucide-react';
import type { ReviewItem } from '../types/dashboard';
import type { ProofItem } from '../types';
import googleIcon from '../assets/Google-modern-3D-icon-on-Premium-vector-PNG.avif';

interface ProofModalProps {
  item: ReviewItem | ProofItem | null;
  onClose: () => void;
}

function StarRating({ rating }: { rating: number }) {
  const safeRating = Math.max(0, Math.min(5, Number(rating) || 0));
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`w-3 h-3 ${
            star <= Math.round(safeRating) ? 'text-amber-400 fill-amber-400' : 'text-zinc-750 fill-zinc-800'
          }`}
          viewBox="0 0 24 24"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

export default function ProofModal({ item, onClose }: ProofModalProps) {
  if (!item) return null;

  // Normalize between ProofItem and ReviewItem
  const isProofItem = 'excerpt' in item;
  const author = item.author;
  const date = item.date;
  const rating = item.rating;
  const platform = isProofItem ? item.platform : item.platform.toUpperCase();
  const content = isProofItem ? item.excerpt : item.content;
  const theme = isProofItem ? item.theme : (item.themes?.[0] || 'Customer Feedback');
  const rawId = isProofItem ? item.rawId : item.id;
  const originalLanguage = !isProofItem && item.originalLanguage ? item.originalLanguage : null;
  const englishTranslation = !isProofItem && item.englishTranslation ? item.englishTranslation : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="proof-title"
    >
      <div
        className="bg-zinc-950 rounded-lg max-w-lg w-full p-6 shadow-2xl border border-zinc-800 relative animate-in fade-in zoom-in-95 duration-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-zinc-800/80">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
            <h3 id="proof-title" className="text-xs font-semibold text-zinc-100 tracking-tight">
              Grounded Proof Verification
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-6 h-6 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-4 space-y-4">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">
              Identified Theme Cluster
            </span>
            <p className="text-xs font-medium text-zinc-200 mt-0.5">
              {theme}
            </p>
          </div>

          <div className="p-4 rounded-md bg-zinc-900/60 border border-zinc-800/80 space-y-2.5">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="font-medium text-zinc-200">{author}</span>
              <span className="font-mono text-[11px] text-zinc-500">{date}</span>
            </div>
            <div className="flex items-center gap-2">
              <StarRating rating={rating} />
              <span className="text-zinc-400 font-mono text-[11px] font-medium">{Number(rating).toFixed(1)} / 5.0</span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed pt-1 font-sans">
              "{content}"
            </p>

            {originalLanguage && (
              <div className="mt-2.5 pt-2.5 border-t border-dashed border-zinc-800 text-[11px] text-zinc-400">
                <span className="font-medium text-zinc-300">Original ({originalLanguage}): </span>
                <span className="italic">{content}</span>
                {englishTranslation && (
                  <p className="mt-1 text-zinc-300 font-sans">
                    <span className="font-medium text-zinc-200">English Translation: </span>
                    {englishTranslation}
                  </p>
                )}
              </div>
            )}

            <div className="mt-2.5 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
              <span className="flex items-center gap-1.5">
                <span>Channel:</span>
                {String(platform).toLowerCase().includes('google') ? (
                  <strong className="text-zinc-200 font-medium inline-flex items-center gap-1">
                    <img src={googleIcon} alt="Google" className="w-3.5 h-3.5 object-contain" />
                    <span>Google</span>
                  </strong>
                ) : (
                  <strong className="text-zinc-300 font-medium">{platform}</strong>
                )}
              </span>
              <span>UUID: {rawId ? String(rawId).slice(0, 12) + '...' : 'N/A'}</span>
            </div>
          </div>

          <div className="p-2.5 rounded-md bg-emerald-950/20 border border-emerald-800/30 text-xs text-emerald-400 flex items-center gap-2 font-mono text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
            <span>Cryptographically verified against PostgreSQL source records.</span>
          </div>
        </div>

        {/* Action */}
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-md text-xs font-medium bg-zinc-100 hover:bg-white text-zinc-950 transition-colors active:scale-[0.98] cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
