export default function LandingMarquee() {
  const companies = [
    { name: 'STRIPE', category: 'Fintech Infrastructure' },
    { name: 'VERCEL', category: 'Frontend Cloud' },
    { name: 'SUPABASE', category: 'Postgres Backend' },
    { name: 'RETOOL', category: 'Internal Systems' },
    { name: 'RAYCAST', category: 'Productivity' },
    { name: 'LINEAR', category: 'Issue Tracking' },
  ];

  return (
    <div className="py-12 border-y border-[#23252a]/70 bg-[#010102]">
      <div className="max-w-6xl mx-auto px-6 text-center">
        <span className="text-[11px] font-semibold text-[#62666d] uppercase tracking-[0.08em] block mb-7">
          Trusted by operations and customer experience teams at modern software organizations
        </span>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 items-center justify-center">
          {companies.map((co) => (
            <div
              key={co.name}
              className="py-3 px-4 rounded-md bg-[#0f1011] border border-[#23252a] hover:border-[#34343a] transition-colors flex flex-col items-center justify-center group"
            >
              <span className="font-mono font-semibold tracking-wider text-xs text-[#8a8f98] group-hover:text-[#f7f8f8] transition-colors">
                {co.name}
              </span>
              <span className="text-[9px] text-[#62666d] mt-0.5 uppercase tracking-wide">
                {co.category}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
