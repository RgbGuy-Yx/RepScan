import { Inbox, Cpu, BarChart2, ShieldCheck, CheckSquare } from 'lucide-react';
import googleIcon from '../../assets/Google-modern-3D-icon-on-Premium-vector-PNG.avif';

export default function LandingHowItWorks() {
  const steps = [
    {
      step: '01',
      title: 'Collect',
      description: 'Ingest raw customer feedback across Google Maps, Instagram, and verified channels.',
      icon: Inbox,
      tag: 'Multi-Channel Pipeline',
      isGoogle: true,
    },
    {
      step: '02',
      title: 'Analyze',
      description: 'AI extracts sentiment, recurring topics, native code-mixed languages, and root friction.',
      icon: Cpu,
      tag: 'Semantic & NLU Clustering',
    },
    {
      step: '03',
      title: 'Compare',
      description: "Measure telemetry velocity shifts against previous crawl cycles with confidence bounds.",
      icon: BarChart2,
      tag: 'Velocity & Delta Models',
    },
    {
      step: '04',
      title: 'Prove',
      description: 'Trace every statistical conclusion directly back to timestamped customer citations.',
      icon: ShieldCheck,
      tag: 'Grounded Verifiability',
    },
    {
      step: '05',
      title: 'Remediate',
      description: 'Convert critical friction findings into operational Kanban tasks for your team.',
      icon: CheckSquare,
      tag: 'Closed-Loop Action',
    },
  ];

  return (
    <section id="how-it-works" className="py-24 border-t border-zinc-800/80 bg-zinc-950">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 space-y-12">
        {/* Section Header */}
        <div className="max-w-2xl space-y-2">
          <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider block">
            Operational Workflow
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-zinc-100">
            From raw customer reviews to closed-loop remediation.
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed font-sans">
            A deterministic 5-step pipeline engineered to eradicate guesswork and operational blind spots.
          </p>
        </div>

        {/* 5-Step Pipeline Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {steps.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="p-5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 hover:border-zinc-700 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300 group-hover:text-emerald-400 group-hover:border-zinc-700 transition-colors">
                      {item.isGoogle ? (
                        <img src={googleIcon} alt="Google" className="w-4 h-4 object-contain" />
                      ) : (
                        <Icon className="w-4 h-4" />
                      )}
                    </div>
                    <span className="font-mono text-xs text-zinc-500 bg-zinc-900/80 px-2 py-0.5 rounded border border-zinc-800 tabular-nums">
                      {item.step}
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold text-zinc-100 tracking-tight">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-zinc-800/70 text-[10px] font-mono text-zinc-500">
                  {item.tag}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
