import { Inbox, Cpu, BarChart2, ShieldCheck, CheckSquare } from 'lucide-react';

export default function LandingHowItWorks() {
  const steps = [
    {
      step: '01',
      title: 'Collect',
      description: 'Bring customer feedback from your connected platforms into one place.',
      icon: Inbox,
      tag: 'Multi-Channel Ingestion',
    },
    {
      step: '02',
      title: 'Understand',
      description: 'AI analyzes sentiment, recurring themes, languages, and customer concerns.',
      icon: Cpu,
      tag: 'Semantic & Multilingual',
    },
    {
      step: '03',
      title: 'Compare',
      description: "See how this week's feedback compares with previous periods.",
      icon: BarChart2,
      tag: 'Period Velocity Deltas',
    },
    {
      step: '04',
      title: 'Prove',
      description: 'Trace every important insight back to the actual customer reviews behind it.',
      icon: ShieldCheck,
      tag: 'Grounded Evidence',
    },
    {
      step: '05',
      title: 'Act',
      description: 'Turn important insights into trackable action items.',
      icon: CheckSquare,
      tag: 'Operational Kanban',
    },
  ];

  return (
    <section id="how-it-works" className="py-24 border-t border-[#23252a] bg-[#010102]">
      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-2xl mb-12">
          <span className="text-[11px] font-semibold text-[#8a8f98] uppercase tracking-[0.06em] block mb-2">
            How RepScan Works
          </span>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-[-0.03em] text-[#f7f8f8] leading-tight">
            From customer feedback to clear action.
          </h2>
        </div>

        {/* 5-Step Pipeline Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {steps.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="p-5 rounded-xl bg-[#0f1011] border border-[#23252a] hover:border-[#34343a] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-8 h-8 rounded-md bg-[#141516] border border-[#23252a] flex items-center justify-center text-[#828fff] group-hover:border-[#5e6ad2]/40 transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="font-mono text-xs text-[#62666d] bg-[#141516] px-2 py-0.5 rounded border border-[#23252a]">
                      {item.step}
                    </span>
                  </div>

                  <h3 className="text-base font-semibold text-[#f7f8f8] tracking-tight">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-xs text-[#8a8f98] leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-[#23252a]/70 text-[10px] font-mono text-[#62666d]">
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
