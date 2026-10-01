import { Languages, Check } from 'lucide-react';

export default function LandingMultilingual() {
  const languageCards = [
    {
      badge: 'Hinglish (Code-Mixed)',
      platform: 'Google Reviews',
      original: '“Food bahut accha tha but service was extremely slow, table ke liye 40 min wait karwaya.”',
      translation: '“Food was very good, but service was extremely slow — made us wait 40 minutes for a table.”',
      theme: 'Service Latency & Table Queueing',
      sentiment: 'Mixed',
    },
    {
      badge: 'Telugu-English (Code-Mixed)',
      platform: 'Instagram Comments',
      original: '“Biryani taste super ga undi, but AC work avvaledu and billing lo chaala time pattindi.”',
      translation: '“Biryani tasted great, but the AC wasn’t working and billing took a long time.”',
      theme: 'Facility & Billing Latency',
      sentiment: 'Mixed',
    },
    {
      badge: 'English',
      platform: 'Google Reviews',
      original: '“Outstanding ambience and courteous staff, but dessert preparation took 25 minutes after ordering.”',
      translation: 'Original phrasing analyzed with complete semantic context preserved.',
      theme: 'Kitchen Preparation Speed',
      sentiment: 'Positive / Concern',
    },
  ];

  return (
    <section id="multilingual" className="py-24 border-t border-[#23252a] bg-[#010102]">
      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-12">
          <span className="text-[11px] font-semibold text-[#8a8f98] uppercase tracking-[0.06em] block mb-2">
            Built for Real Customer Feedback
          </span>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-[-0.03em] text-[#f7f8f8] leading-tight">
            Your customers don't always speak the same way.
          </h2>
          <div className="mt-4 space-y-2 text-sm sm:text-base text-[#8a8f98] leading-relaxed">
            <p>
              RepScan understands English, Hindi, Telugu, and common code-mixed feedback such as Hinglish and Telugu-English.
            </p>
            <p className="text-[#d0d6e0]">
              Original feedback is preserved while translations are provided when needed for analysis — so the meaning and context of the customer's words aren't lost.
            </p>
          </div>
        </div>

        {/* Multilingual Examples Showcase */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {languageCards.map((card) => (
            <div
              key={card.badge}
              className="p-6 rounded-xl bg-[#0f1011] border border-[#23252a] hover:border-[#34343a] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-[#18191a] border border-[#23252a] text-[#828fff]">
                    {card.badge}
                  </span>
                  <span className="text-[10px] text-[#62666d]">{card.platform}</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#62666d] block mb-1">
                      Original Customer Review
                    </span>
                    <p className="text-xs sm:text-sm text-[#f7f8f8] leading-relaxed font-sans italic">
                      {card.original}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[#23252a]/70">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8a8f98] block mb-1">
                      Preserved Context &amp; Analysis
                    </span>
                    <p className="text-xs text-[#8a8f98] leading-relaxed">
                      {card.translation}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-[#23252a] flex items-center justify-between text-[11px]">
                <span className="text-[#8a8f98] truncate">{card.theme}</span>
                <span className="text-[#4ade80] font-mono text-[10px] shrink-0">Preserved ✓</span>
              </div>
            </div>
          ))}
        </div>

        {/* Feature Highlights Strip */}
        <div className="mt-6 p-4 rounded-xl bg-[#0f1011] border border-[#23252a] flex flex-wrap items-center justify-between gap-4 text-xs text-[#8a8f98]">
          <div className="flex items-center gap-2">
            <Languages className="w-4 h-4 text-[#828fff]" />
            <span>Full phonetic &amp; romanized code-mixing normalization</span>
          </div>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5 text-[#d0d6e0]">
              <Check className="w-3.5 h-3.5 text-[#27a644]" /> Hindi &amp; Hinglish
            </span>
            <span className="flex items-center gap-1.5 text-[#d0d6e0]">
              <Check className="w-3.5 h-3.5 text-[#27a644]" /> Telugu &amp; Telugu-English
            </span>
            <span className="flex items-center gap-1.5 text-[#d0d6e0]">
              <Check className="w-3.5 h-3.5 text-[#27a644]" /> English
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
