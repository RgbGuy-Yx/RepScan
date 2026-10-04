import { useState } from 'react';
import { Check } from 'lucide-react';

interface LandingPricingProps {
  onLaunchApp: () => void;
}

export default function LandingPricing({ onLaunchApp }: LandingPricingProps) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');

  return (
    <section id="pricing" className="py-24 max-w-6xl mx-auto px-6 lg:px-8 border-t border-[#23252a]">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto">
        <span className="text-[11px] font-semibold text-[#8a8f98] uppercase tracking-[0.06em] block mb-2">
          Transparent Pricing
        </span>
        <h2 className="text-3xl sm:text-4xl font-semibold tracking-[-0.03em] text-[#f7f8f8]">
          Predictable scale for reputation observability.
        </h2>
        <p className="mt-3 text-sm text-[#8a8f98]">
          All plans include deterministic statistical math, PostgreSQL ground truth, and multi-channel ingestion.
        </p>

        {/* Pricing Toggle Pills */}
        <div className="mt-8 inline-flex items-center p-1 rounded-full bg-[#0f1011] border border-[#23252a]">
          <button
            type="button"
            onClick={() => setBillingCycle('annual')}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
              billingCycle === 'annual'
                ? 'bg-[#18191a] text-[#f7f8f8] border border-[#34343a] shadow-xs'
                : 'text-[#8a8f98] hover:text-[#f7f8f8]'
            }`}
          >
            Annual (20% off)
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle('monthly')}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
              billingCycle === 'monthly'
                ? 'bg-[#18191a] text-[#f7f8f8] border border-[#34343a] shadow-xs'
                : 'text-[#8a8f98] hover:text-[#f7f8f8]'
            }`}
          >
            Monthly
          </button>
        </div>
      </div>

      {/* 3-Tier Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-14 items-stretch">
        {/* Tier 1: Starter */}
        <div className="p-6 rounded-xl bg-[#0f1011] border border-[#23252a] flex flex-col justify-between shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
          <div>
            <span className="text-xs font-medium text-[#8a8f98] uppercase tracking-wider block">Starter</span>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-3xl font-semibold text-[#f7f8f8] tracking-tight">
                ${billingCycle === 'annual' ? '39' : '49'}
              </span>
              <span className="text-xs text-[#62666d]">/ month</span>
            </div>
            <p className="mt-2 text-xs text-[#8a8f98]">
              Essential reputation telemetry for single-location businesses.
            </p>

            <ul className="mt-6 space-y-2.5 text-xs text-[#d0d6e0] pt-6 border-t border-[#23252a]">
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-[#27a644]" />
                <span>Up to 2 Google Places / Maps locations</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-[#27a644]" />
                <span>Deterministic math deltas (p-value shifts)</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-[#27a644]" />
                <span>Weekly Executive PDF brief via email</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-[#27a644]" />
                <span>PostgreSQL verified proof drawer</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 pt-4">
            <button
              type="button"
              onClick={onLaunchApp}
              className="linear-btn-secondary w-full h-9 text-xs font-medium justify-center"
            >
              Start Free Trial
            </button>
          </div>
        </div>

        {/* Tier 2: Pro (Featured - Surface 2 Lifted) */}
        <div className="p-6 rounded-xl bg-[#141516] border border-[#34343a] flex flex-col justify-between shadow-[0_12px_40px_rgba(0,0,0,0.8),inset_0_1px_0_0_rgba(255,255,255,0.08)] relative">
          <div className="absolute -top-3 right-5">
            <span className="text-[10px] font-semibold bg-[#5e6ad2] text-white px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-[0_1px_4px_rgba(94,106,210,0.4)]">
              Most Popular
            </span>
          </div>

          <div>
            <span className="text-xs font-medium text-[#828fff] uppercase tracking-wider block">Pro Operations</span>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-3xl font-semibold text-[#f7f8f8] tracking-tight">
                ${billingCycle === 'annual' ? '119' : '149'}
              </span>
              <span className="text-xs text-[#62666d]">/ month</span>
            </div>
            <p className="mt-2 text-xs text-[#d0d6e0]">
              Full multi-channel pipeline with Grounded AI Assistant and Executive Reports.
            </p>

            <ul className="mt-6 space-y-2.5 text-xs text-[#f7f8f8] pt-6 border-t border-[#23252a]">
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-[#27a644]" />
                <span>Up to 10 locations across Google, Instagram & LinkedIn</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-[#27a644]" />
                <span>Interactive Grounded AI Assistant (Zero Hallucination)</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-[#27a644]" />
                <span>Executive Intelligence Reports with one-click PDF export</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-[#27a644]" />
                <span>Continuous Apify scrape synchronization (60 min)</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-[#27a644]" />
                <span>Anomaly velocity alerts</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 pt-4">
            <button
              type="button"
              onClick={onLaunchApp}
              className="linear-btn-primary w-full h-9 text-xs font-medium justify-center shadow-[0_2px_8px_rgba(94,106,210,0.35)]"
            >
              Get Started with Pro
            </button>
          </div>
        </div>

        {/* Tier 3: Enterprise */}
        <div className="p-6 rounded-xl bg-[#0f1011] border border-[#23252a] flex flex-col justify-between shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
          <div>
            <span className="text-xs font-medium text-[#8a8f98] uppercase tracking-wider block">Enterprise</span>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-3xl font-semibold text-[#f7f8f8] tracking-tight">
                Custom
              </span>
            </div>
            <p className="mt-2 text-xs text-[#8a8f98]">
              Dedicated pgvector infrastructure, zero data egress, and custom scrapers.
            </p>

            <ul className="mt-6 space-y-2.5 text-xs text-[#d0d6e0] pt-6 border-t border-[#23252a]">
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-[#27a644]" />
                <span>Unlimited enterprise locations & channels</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-[#27a644]" />
                <span>On-premise / Local Ollama deployment option</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-[#27a644]" />
                <span>Custom scrapers (Trustpilot, Zomato, TripAdvisor)</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-[#27a644]" />
                <span>Dedicated PostgreSQL shard with 99.99% uptime SLA</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-[#27a644]" />
                <span>Custom enterprise SSO & audit trails</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 pt-4">
            <button
              type="button"
              onClick={onLaunchApp}
              className="linear-btn-secondary w-full h-9 text-xs font-medium justify-center"
            >
              Contact Sales
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
