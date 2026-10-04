import { TrendingUp, HelpCircle, ShieldCheck, CheckSquare, ArrowUpRight } from 'lucide-react';

export default function LandingFeatures() {
  const valueProps = [
    {
      icon: TrendingUp,
      tag: 'Delta Velocity',
      title: 'What changed?',
      description: 'Automatically detects statistical spikes and declines in topic frequency between crawl cycles.',
      highlight: '+28% Treatment Satisfaction',
    },
    {
      icon: HelpCircle,
      tag: 'Causal Root Causes',
      title: 'Why did it change?',
      description: 'Isolates the exact themes and service facets driving customer praise or complaints.',
      highlight: '36 Semantic Clusters',
    },
    {
      icon: ShieldCheck,
      tag: 'Grounded Evidence',
      title: 'Can I trust it?',
      description: 'Every insight is linked directly to raw customer review citations with verified statistical confidence.',
      highlight: 'Zero AI Hallucination',
    },
    {
      icon: CheckSquare,
      tag: 'Operational Kanban',
      title: 'What should I do?',
      description: 'Transforms high-signal customer feedback into accountable, assignable action items for your team.',
      highlight: 'Track from Open to Resolved',
    },
  ];

  return (
    <section id="core-value" className="py-24 max-w-7xl mx-auto px-6 lg:px-8 border-t border-zinc-800/80 bg-zinc-950">
      {/* Section Header */}
      <div className="max-w-2xl space-y-2">
        <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider block">
          Core Value Proposition
        </span>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-zinc-100">
          Not another generic sentiment dashboard.
        </h2>
        <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed font-sans">
          RepScan goes beyond superficial star ratings. It detects velocity shifts, uncovers root causes, and grounds every conclusion in verifiable customer proof.
        </p>
      </div>

      {/* Feature Cards Grid (4-Column Hairline Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-10">
        {valueProps.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className="p-5 sm:p-6 rounded-xl bg-zinc-950/70 border border-zinc-800/80 hover:border-zinc-700 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] transition-all flex flex-col justify-between group"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300 group-hover:text-emerald-400 group-hover:border-zinc-700 transition-colors">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="font-mono text-[10px] text-zinc-500 bg-zinc-900/80 px-2 py-0.5 rounded border border-zinc-800">
                    {item.tag}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-sm font-semibold text-zinc-100 tracking-tight flex items-center justify-between">
                    <span>{item.title}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-300 transition-colors opacity-0 group-hover:opacity-100" />
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-3 border-t border-zinc-800/70 flex items-center justify-between text-[11px] font-mono">
                <span className="text-emerald-400 font-medium">{item.highlight}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80" />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
