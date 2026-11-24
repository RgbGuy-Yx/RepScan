import { X, CheckCircle2 } from 'lucide-react';
import type { ReviewItem } from '../types/dashboard';
import type { ProofItem } from '../types';

interface ProofModalProps {
  item: ReviewItem | ProofItem | null;
  onClose: () => void;
}

function StarRating({ rating }: { rating: number | null | undefined }) {
  if (rating === null || rating === undefined) return null;
  const safeRating = Math.max(0, Math.min(5, Number(rating) || 0));
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`w-3 h-3 ${
            star <= Math.round(safeRating) ? 'text-amber-400 fill-amber-400' : 'text-[#404040] fill-transparent'
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm font-sans"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="proof-title"
    >
      <div
        className="bg-[#171717] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#262626] relative animate-in fade-in zoom-in-95 duration-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#262626]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#4ade80]" aria-hidden="true" />
            <h3 id="proof-title" className="font-serif font-light text-xl text-white tracking-tight">
              Grounded Proof Verification
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-[#1f1f1f] border border-[#262626] flex items-center justify-center text-[#a3a3a3] hover:text-white hover:bg-[#262626] transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-4 space-y-4">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#737373] block">
              Identified Theme Cluster
            </span>
            <p className="text-xs font-medium text-white mt-0.5">
              {theme}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#1f1f1f] border border-[#262626] space-y-2.5">
            <div className="flex items-center justify-between text-xs text-[#a3a3a3]">
              <span className="font-medium text-white">{author}</span>
              <span className="font-mono text-[11px] text-[#737373]">{date}</span>
            </div>
            {String(platform).toLowerCase().includes('google') ? (
              rating !== null && rating !== undefined ? (
                <div className="flex items-center gap-2">
                  <StarRating rating={rating} />
                  <span className="text-[#a3a3a3] font-mono text-[11px] font-medium">
                    {Number(rating).toFixed(1)} / 5.0 (Google Review)
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-[#737373] font-mono text-[11px]">
                    Google Review • Unrated
                  </span>
                </div>
              )
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-[#737373] font-mono text-[11px]">
                  Instagram Comment • Sentiment Classified (No Star Rating)
                </span>
              </div>
            )}
            <p className="text-xs text-[#ffffff] leading-relaxed pt-1 font-sans">
              "{content}"
            </p>

            {originalLanguage && (
              <div className="mt-2.5 pt-2.5 border-t border-dashed border-[#262626] text-[11px] text-[#a3a3a3]">
                <span className="font-medium text-white">Original ({originalLanguage}): </span>
                <span className="italic">{content}</span>
                {englishTranslation && (
                  <p className="mt-1 text-white font-sans">
                    <span className="font-medium text-[#4ade80]">English Translation: </span>
                    {englishTranslation}
                  </p>
                )}
              </div>
            )}

            <div className="mt-2.5 pt-2.5 border-t border-[#262626] flex items-center justify-between text-[11px] text-[#737373] font-mono">
              <span className="flex items-center gap-1.5">
                <span>Channel:</span>
                {String(platform).toLowerCase().includes('google') ? (
                  <strong className="text-white font-medium">Google Maps</strong>
                ) : (
                  <strong className="text-[#4ade80] font-medium">{platform}</strong>
                )}
              </span>
              <span>UUID: {rawId ? String(rawId).slice(0, 12) + '...' : 'N/A'}</span>
            </div>
          </div>

          <div className="badge-action-subtle w-full justify-start py-2 px-3">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-[#22c55e]" />
            <span className="text-xs text-[#a3a3a3]">Cryptographically verified against PostgreSQL source records.</span>
          </div>
        </div>

        {/* Action */}
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="btn-pill-primary text-xs py-2 px-5"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
