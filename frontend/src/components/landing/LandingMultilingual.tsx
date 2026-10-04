import googleIcon from '../../assets/Google-modern-3D-icon-on-Premium-vector-PNG.avif';

export default function LandingMultilingual() {
  const languageCards = [
    {
      badge: 'Hinglish (Code-Mixed)',
      platform: 'Google Reviews',
      isGoogle: true,
      original: '“Doctor consultation was very thorough but wait time bahut zyada tha, appointment ke baad bhi 40 min lag gaye.”',
      translation: '“Doctor consultation was very thorough, but wait time was excessively long; even with an appointment it took 40 minutes.”',
      theme: 'Consultation Latency & Reception Queue',
      sentiment: 'Mixed',
    },
    {
      badge: 'Telugu-English (Code-Mixed)',
      platform: 'Google Reviews',
      isGoogle: true,
      original: '“Treatment result chaala baavundi, skin allergy cleared quickly. Staff polite ga behave chesaaru.”',
      translation: '“Treatment result was very good, skin allergy cleared quickly. Staff behaved politely.”',
      theme: 'Treatment Effectiveness & Clinical Care',
      sentiment: 'Positive',
    },
    {
      badge: 'English',
      platform: 'Google Reviews',
      isGoogle: true,
      original: '“Outstanding dermatological advice and clean modern equipment, but pharmacy billing process took 20 minutes.”',
      translation: 'Original phrasing analyzed with complete clinical context preserved.',
      theme: 'Pharmacy Dispatch Speed',
      sentiment: 'Positive / Friction',
    },
  ];

  return (
    <section id="multilingual" className="py-24 border-t border-zinc-800/80 bg-zinc-950">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 space-y-12">
        {/* Section Header */}
        <div className="max-w-3xl space-y-2">
          <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider block">
            Multilingual Semantic Processing
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-zinc-100">
            Your customers don't write in textbook English.
          </h2>
          <div className="space-y-1 text-xs sm:text-sm text-zinc-400 leading-relaxed font-sans pt-1">
            <p>
              RepScan natively understands Indian regional languages and code-mixed reviews including Hinglish, Telugu-English, and Tamil-English.
            </p>
            <p className="text-zinc-300">
              Original regional phrases are preserved alongside verifiable semantic translations so authentic sentiment and clinical context are never lost in translation.
            </p>
          </div>
        </div>

        {/* Multilingual Examples Showcase */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {languageCards.map((card) => (
            <div
              key={card.badge}
              className="p-5 sm:p-6 rounded-xl bg-zinc-950/70 border border-zinc-800/80 hover:border-zinc-700 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                    {card.badge}
                  </span>
                  <span className="text-[11px] font-mono text-zinc-400 inline-flex items-center gap-1.5">
                    {card.isGoogle && (
                      <img src={googleIcon} alt="Google" className="w-3.5 h-3.5 object-contain shrink-0" />
                    )}
                    <span>{card.platform}</span>
                  </span>
                </div>

                <div className="p-3.5 rounded-lg bg-zinc-900/50 border border-zinc-800/70">
                  <span className="text-[10px] font-mono uppercase text-zinc-500 block mb-1">Raw Customer Input</span>
                  <p className="text-xs text-zinc-200 font-sans leading-relaxed italic">
                    {card.original}
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-zinc-900/20 border border-zinc-800/40">
                  <span className="text-[10px] font-mono uppercase text-emerald-400 block mb-1">Normalized English Analysis</span>
                  <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                    {card.translation}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[11px] font-mono text-zinc-500">
                <span className="truncate max-w-[180px]">{card.theme}</span>
                <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 text-[10px]">
                  {card.sentiment}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
