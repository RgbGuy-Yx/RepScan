export default function LandingTestimonials() {
  const testimonials = [
    {
      quote:
        '“RepScan replaced our noisy sentiment dashboard with cold, hard statistical facts. When our ratings dip, we know the exact operational shift within minutes — verified against raw review rows.”',
      author: 'Aakash Verma',
      role: 'VP Operations',
      company: 'The Urban Table Hospitality Group',
      initials: 'AV',
    },
    {
      quote:
        '“The zero-hallucination assistant is remarkable. Our executives can query multi-channel feedback in plain English and receive direct PostgreSQL row citations they can trust.”',
      author: 'Sarah Chen',
      role: 'Head of Customer Experience',
      company: 'Nexus Dining Group',
      initials: 'SC',
    },
  ];

  return (
    <section className="py-24 border-t border-[#23252a] bg-[#010102]">
      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-14">
          <span className="text-[11px] font-semibold text-[#8a8f98] uppercase tracking-[0.06em] block mb-2">
            Proven at Scale
          </span>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-[-0.03em] text-[#f7f8f8]">
            Loved by operations leaders.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {testimonials.map((t) => (
            <div
              key={t.author}
              className="p-8 rounded-xl bg-[#0f1011] border border-[#23252a] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] flex flex-col justify-between"
            >
              <p className="text-base sm:text-[17px] text-[#d0d6e0] leading-relaxed font-normal">
                {t.quote}
              </p>

              <div className="mt-8 pt-4 border-t border-[#23252a] flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#18191a] border border-[#34343a] text-[#828fff] font-semibold text-xs flex items-center justify-center">
                  {t.initials}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[#f7f8f8]">{t.author}</h4>
                  <p className="text-xs text-[#8a8f98]">
                    {t.role} · <span className="text-[#62666d]">{t.company}</span>
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
