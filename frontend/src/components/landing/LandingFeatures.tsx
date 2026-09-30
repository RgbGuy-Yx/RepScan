import { TrendingUp, HelpCircle, ShieldCheck, CheckSquare } from 'lucide-react';

export default function LandingFeatures() {
  const valueProps = [
    {
      icon: TrendingUp,
      tag: 'Delta Detection',
      title: 'What changed?',
      description: 'Identify meaningful shifts in customer feedback.',
    },
    {
      icon: HelpCircle,
      tag: 'Theme Causality',
      title: 'Why did it change?',
      description: 'Discover the themes driving those changes.',
    },
    {
      icon: ShieldCheck,
      tag: 'Grounded Evidence',
      title: 'Can I trust it?',
      description: 'See confidence levels, limitations, and the reviews behind every insight.',
    },
    {
      icon: CheckSquare,
      tag: 'Action Board',
      title: 'What should I do?',
      description: 'Turn insights into actionable tasks.',
    },
  ];

  return (
    <section id="core-value" className="py-24 max-w-6xl mx-auto px-6 lg:px-8">
      {/* Section Header */}
      <div className="max-w-2xl">
        <span className="text-[11px] font-semibold text-[#8a8f98] uppercase tracking-[0.06em] block mb-2">
          Core Value Proposition
        </span>
        <h2 className="text-3xl sm:text-4xl font-semibold tracking-[-0.03em] text-[#f7f8f8] leading-tight">
          Not another sentiment dashboard.
        </h2>
        <p className="mt-3 text-sm sm:text-base text-[#8a8f98] leading-relaxed">
          RepScan goes beyond ratings and sentiment scores.
        </p>
      </div>

      {/* Feature Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-12">
        {valueProps.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className="p-6 rounded-xl bg-[#0f1011] border border-[#23252a] hover:border-[#34343a] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-8 h-8 rounded-md bg-[#141516] border border-[#23252a] flex items-center justify-center text-[#828fff] group-hover:border-[#5e6ad2]/40 transition-colors">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="font-mono text-[10px] text-[#62666d] bg-[#141516] px-2 py-0.5 rounded border border-[#23252a]">
                    {item.tag}
                  </span>
                </div>

                <h3 className="text-base font-semibold text-[#f7f8f8] tracking-tight">
                  {item.title}
                </h3>
                <p className="mt-2.5 text-xs sm:text-sm text-[#8a8f98] leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div className="mt-6 pt-3 border-t border-[#23252a]/70 flex items-center justify-between text-[11px] text-[#62666d]">
                <span>Insight Pipeline</span>
                <span className="text-[#4ade80] font-mono">Evidence-Backed</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
