export default function LandingChangelog() {
  const releases = [
    {
      version: 'v2.4.0',
      date: 'September 24, 2026',
      title: 'Executive Intelligence Reports & Automated Anomaly Detection',
      description:
        'Introduced the Executive Reports engine with one-click formal PDF compilation, deterministic KPI deltas, and automated 2σ p-value shift notifications for service and operational quality.',
      badge: 'Latest',
    },
    {
      version: 'v2.3.2',
      date: 'September 10, 2026',
      title: 'PostgreSQL pgvector Deduplication & Multi-lingual Normalization',
      description:
        'Optimized concurrent Apify ingestion workers with SHA-256 fingerprinting. Added automated language translation for Hindi, Marathi, and regional Indian reviews with original text preservation.',
    },
    {
      version: 'v2.2.0',
      date: 'August 28, 2026',
      title: 'Local Ollama & Mistral-7B Zero Data Egress Mode',
      description:
        'Enterprises can now run sentiment topic clustering and RAG verification on self-hosted LLM nodes, ensuring zero customer feedback data escapes the organization perimeter.',
    },
  ];

  return (
    <section id="changelog" className="py-24 max-w-6xl mx-auto px-6 lg:px-8 border-t border-[#23252a] bg-[#010102]">
      <div className="max-w-2xl mb-12">
        <span className="text-[11px] font-semibold text-[#8a8f98] uppercase tracking-[0.06em] block mb-2">
          System Evolution
        </span>
        <h2 className="text-3xl sm:text-4xl font-semibold tracking-[-0.03em] text-[#f7f8f8]">
          Shipped with software craft.
        </h2>
        <p className="mt-2 text-sm text-[#8a8f98]">
          Review our recent releases, engine optimizations, and architectural enhancements.
        </p>
      </div>

      <div className="divide-y divide-[#23252a]">
        {releases.map((rel) => (
          <div key={rel.version} className="py-7 flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="md:w-56 shrink-0 space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-semibold text-[#f7f8f8]">{rel.version}</span>
                {rel.badge && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded font-medium bg-[#5e6ad2]/15 text-[#828fff] border border-[#5e6ad2]/30">
                    {rel.badge}
                  </span>
                )}
              </div>
              <span className="text-xs text-[#62666d] block font-mono">{rel.date}</span>
            </div>

            <div className="flex-1 space-y-1.5">
              <h3 className="text-sm font-semibold text-[#f7f8f8]">{rel.title}</h3>
              <p className="text-xs text-[#8a8f98] leading-relaxed max-w-2xl">{rel.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
