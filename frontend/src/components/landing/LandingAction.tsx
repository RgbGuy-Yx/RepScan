import { ArrowRight, CheckCircle2, Clock, AlertTriangle, ArrowRightLeft } from 'lucide-react';

interface LandingActionProps {
  onLaunchApp?: () => void;
}

export default function LandingAction({ onLaunchApp }: LandingActionProps) {
  const tasks = [
    {
      status: 'Open',
      statusColor: 'bg-rose-500/10 text-rose-400 border-rose-500/25',
      icon: AlertTriangle,
      title: 'Recalibrate Kitchen Holding Units',
      assignee: 'Head Chef Arvind',
      insight: 'Food quality complaints increased this week',
      feedbackTrigger: '14 reviews citing cold or lukewarm food during peak dinner rush',
    },
    {
      status: 'In Progress',
      statusColor: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
      icon: Clock,
      title: 'Hostess Reservation Buffer Policy',
      assignee: 'Manager Rohit',
      insight: 'Table hold times spiked to 45+ minutes',
      feedbackTrigger: '8 reviews reporting wait times despite confirmed prior reservations',
    },
    {
      status: 'Resolved',
      statusColor: 'bg-[#27a644]/10 text-[#4ade80] border-[#27a644]/25',
      icon: CheckCircle2,
      title: 'Update Printed Menu Pricing Disclosures',
      assignee: 'Operations Lead',
      insight: 'Billing disputes resolved across weekend shifts',
      feedbackTrigger: 'Menu reprint completed · 0 service charge disputes in trailing 7 days',
    },
  ];

  return (
    <section id="action" className="py-24 border-t border-[#23252a] bg-[#010102]">
      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-12">
          <span className="text-[11px] font-semibold text-[#8a8f98] uppercase tracking-[0.06em] block mb-2">
            From Insight to Action
          </span>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-[-0.03em] text-[#f7f8f8] leading-tight">
            Knowing the problem is only the beginning.
          </h2>

          <p className="mt-4 text-sm sm:text-base text-[#8a8f98] leading-relaxed">
            Turn important customer insights into action items and track them from:
          </p>

          {/* Linear Status Progression Pill */}
          <div className="mt-4 inline-flex items-center gap-2 p-1.5 rounded-lg bg-[#0f1011] border border-[#23252a] text-xs font-mono">
            <span className="px-2.5 py-1 rounded bg-[#18191a] text-rose-400 border border-rose-500/20 font-medium">
              Open
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-[#62666d]" />
            <span className="px-2.5 py-1 rounded bg-[#18191a] text-amber-400 border border-amber-500/20 font-medium">
              In Progress
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-[#62666d]" />
            <span className="px-2.5 py-1 rounded bg-[#18191a] text-[#4ade80] border border-[#27a644]/20 font-medium">
              Resolved
            </span>
          </div>

          <p className="mt-4 text-xs sm:text-sm text-[#d0d6e0] font-medium leading-relaxed">
            Keep the connection between the action, the insight, and the customer feedback that triggered it.
          </p>
        </div>

        {/* 3-Column Action Board Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {tasks.map((task) => {
            const Icon = task.icon;
            return (
              <div
                key={task.title}
                className="p-6 rounded-xl bg-[#0f1011] border border-[#23252a] hover:border-[#34343a] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-mono font-medium px-2 py-0.5 rounded border ${task.statusColor}`}>
                      <Icon className="w-3 h-3" />
                      <span>{task.status}</span>
                    </span>
                    <span className="text-[11px] text-[#62666d]">{task.assignee}</span>
                  </div>

                  <h3 className="text-sm font-semibold text-[#f7f8f8] tracking-tight mb-2">
                    {task.title}
                  </h3>

                  <div className="space-y-3 mt-4 text-xs">
                    <div className="p-3 rounded-lg bg-[#141516] border border-[#23252a]/70">
                      <span className="text-[10px] uppercase font-mono tracking-wider text-[#8a8f98] block mb-1">
                        Connected Insight
                      </span>
                      <p className="text-[#f7f8f8] font-medium leading-snug">
                        {task.insight}
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-[#141516] border border-[#23252a]/70">
                      <span className="text-[10px] uppercase font-mono tracking-wider text-[#62666d] block mb-1">
                        Triggering Customer Feedback
                      </span>
                      <p className="text-[#8a8f98] leading-snug">
                        {task.feedbackTrigger}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-3 border-t border-[#23252a] flex items-center justify-between text-[11px] text-[#62666d]">
                  <span>Audit Trail Intact</span>
                  <span className="text-[#828fff] font-mono">100% Traceable</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info & CTA */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-[#0f1011] border border-[#23252a]">
          <div className="flex items-center gap-2 text-xs text-[#8a8f98]">
            <ArrowRightLeft className="w-4 h-4 text-[#828fff]" />
            <span>Actions stay cryptographically anchored to original customer review UUIDs</span>
          </div>

          {onLaunchApp && (
            <button
              type="button"
              onClick={onLaunchApp}
              className="linear-btn-secondary text-xs h-8 px-4 flex items-center gap-1.5 cursor-pointer"
            >
              <span>Open Operational Board</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
