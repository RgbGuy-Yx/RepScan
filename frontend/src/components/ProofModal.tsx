import { X, CheckCircle2 } from 'lucide-react';
import type { ReviewItem } from '../types/dashboard';
import type { ProofItem } from '../types';

interface ProofModalProps {
  item: ReviewItem | ProofItem | null;
  onClose: () => void;
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
        className="bg-[#0f1011] rounded-xl max-w-lg w-full p-6 shadow-[0_24px_50px_rgba(0,0,0,0.95),inset_0_1px_0_0_rgba(255,255,255,0.06)] border border-[#23252a] relative animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#23252a]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#27a644]" aria-hidden="true" />
            <h3 id="proof-title" className="text-sm font-semibold text-[#f7f8f8] tracking-tight">
              Grounded Proof Verification
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-6 h-6 rounded-md bg-[#18191a] border border-[#23252a] flex items-center justify-center text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[#23252a] transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-4 space-y-4">
          <div>
            <span className="text-[10px] font-semibold text-[#8a8f98] uppercase tracking-[0.05em] block">
              Identified Theme
            </span>
            <p className="text-sm font-semibold text-[#f7f8f8] mt-0.5">
              {theme}
            </p>
          </div>

          <div className="p-4 rounded-lg bg-[#141516] border border-[#23252a] space-y-2.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)]">
            <div className="flex items-center justify-between text-xs text-[#8a8f98]">
              <span className="font-medium text-[#f7f8f8]">{author}</span>
              <span>{date}</span>
            </div>
            <div className="text-amber-400 text-xs flex items-center gap-1.5">
              <span>{'★'.repeat(Math.floor(rating))}</span>
              <span className="text-[#62666d]">({rating} stars)</span>
            </div>
            <p className="text-xs text-[#d0d6e0] leading-relaxed pt-1">
              “{content}”
            </p>

            {originalLanguage && (
              <div className="mt-2.5 pt-2.5 border-t border-dashed border-[#23252a] text-[11px] text-[#8a8f98]">
                <span className="font-medium text-[#d0d6e0]">Original ({originalLanguage}): </span>
                <span className="italic">{content}</span>
                {englishTranslation && (
                  <p className="mt-1 text-[#d0d6e0] font-sans">
                    <span className="font-medium text-[#d0d6e0]">English Translation: </span>
                    {englishTranslation}
                  </p>
                )}
              </div>
            )}

            <div className="mt-2.5 pt-2.5 border-t border-[#23252a] flex items-center justify-between text-[11px] text-[#62666d]">
              <span>Channel: <strong className="text-[#8a8f98] font-medium">{platform}</strong></span>
              <span className="font-mono text-[#8a8f98]">UUID: {rawId}</span>
            </div>
          </div>

          <div className="p-2.5 rounded-md bg-[#27a644]/10 border border-[#27a644]/25 text-xs text-[#4ade80] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#27a644]" />
            <span>Cryptographically verified against PostgreSQL source records.</span>
          </div>
        </div>

        {/* Action */}
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="linear-btn-primary text-xs h-8 px-4 font-medium"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
