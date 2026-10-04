import { useState, useRef, useEffect, useCallback } from 'react';
import {
  ArrowUp,
  Bot,
  ArrowUpRight,
  MessageSquare,
  AlertCircle,
  Info,
  RotateCcw,
  Sparkles,
  Clock,
  ThumbsUp,
  AlertTriangle,
  Stethoscope,
  CheckCircle2,
} from 'lucide-react';
import type { ReviewItem } from '../types/dashboard';
import { useBusiness } from '../context/BusinessContext';
import { businessApi } from '../api/businessApi';

interface AskAiViewProps {
  initialQuery?: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  confidence?: 'High' | 'Medium' | 'Low';
  limitationNote?: string | null;
  sources?: string[];
  reviewRefs?: ReviewItem[];
  timestamp: string;
  isError?: boolean;
}

const PRESET_SUGGESTIONS = [
  {
    category: 'What Customers Love',
    icon: ThumbsUp,
    query: 'What do customers and patients love most about our service?',
    description: 'Explore top praises, highlights, and favorite customer experiences',
  },
  {
    category: 'Opportunities to Improve',
    icon: AlertTriangle,
    query: 'What are the most common customer complaints and how can we resolve them?',
    description: 'Discover constructive feedback and areas we can elevate',
  },
  {
    category: 'Staff & Patient Care',
    icon: Clock,
    query: 'How do customers describe our staff friendliness, communication, and wait times?',
    description: 'Review front-desk interactions, reception, and scheduling',
  },
  {
    category: 'Treatment Outcomes',
    icon: Stethoscope,
    query: 'What do patients share about their treatment results and doctor expertise?',
    description: 'Explore patient satisfaction with medical and procedural care',
  },
];

function sanitizeErrorMessage(error: any): string {
  const raw = (typeof error === 'string' ? error : error?.response?.data?.message || error?.message || error?.toString() || '').trim();
  if (!raw) {
    return 'The AI service is currently undergoing maintenance. Please try again shortly.';
  }

  const lower = raw.toLowerCase();

  // If already clean maintenance text
  if (lower.includes('maintenance')) {
    return 'The AI service is currently undergoing maintenance. Please try again shortly.';
  }

  // Intercept technical signatures, HTTP status codes, server down, JSON errors, network drops, or stack traces
  if (
    lower.includes('failed (') ||
    lower.includes('502') ||
    lower.includes('500') ||
    lower.includes('503') ||
    lower.includes('422') ||
    lower.includes('status') ||
    lower.includes('traceback') ||
    lower.includes('aiserviceexception') ||
    lower.includes('error:') ||
    lower.includes('fetch failed') ||
    lower.includes('network') ||
    lower.includes('econnrefused') ||
    lower.includes('orchestration') ||
    lower.includes('mistral') ||
    lower.includes('unavailable') ||
    lower.includes('{') ||
    lower.includes('json')
  ) {
    return 'The AI service is currently undergoing maintenance. Please try again shortly.';
  }
  return raw;
}

function sanitizeAssistantText(rawText: string): string {
  return rawText
    .replace(/\(?\s*RAW_ITEM_ID:\s*[a-f0-9\-]+(?:,\s*Rating:[^)]*)?\s*\)?/gi, '')
    .replace(/\(\s*[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\s*(?:,\s*Rating:[^)]*)?\)/gi, '')
    .replace(/\(\s*Rating:\s*[\d\.\*\/]+\s*\)/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Inline renderer for **bold**, *italic*, and `code`
function renderInlineMarkdown(text: string) {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);

  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-zinc-100">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em key={i} className="italic text-zinc-300">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="font-mono text-[11px] px-1 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-200">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

interface ParsedBrief {
  header?: { title: string; subtitle?: string };
  intro?: string;
  themes: Array<{
    num: string;
    title: string;
    complaint?: string;
    quotes: string[];
    impact?: string;
  }>;
  takeaways?: {
    title: string;
    items: Array<{ label: string; text: string }>;
  };
  confidenceNote?: string;
  closing?: string;
}

function parseExecutiveBrief(rawText: string): ParsedBrief | null {
  const clean = sanitizeAssistantText(rawText);
  const rawLines = clean.split('\n').map((l) => l.trim());

  // Check if text exhibits structured review themes or executive briefing layout
  const hasThemePattern = rawLines.some(
    (l) =>
      /^\*\*(\d+)\.\s+(.*?)\*\*$/.test(l) ||
      /^###\s+(\d+)\./.test(l) ||
      /^Key Complaint:/i.test(l) ||
      /^\*\*(?:Key Takeaways|Recommended Action|Confidence Note)/i.test(l)
  );

  if (!hasThemePattern) {
    return null;
  }

  const brief: ParsedBrief = {
    themes: [],
  };

  let currentSection: 'header_or_intro' | 'theme' | 'takeaways' | 'confidence' | 'closing' =
    'header_or_intro';
  let currentTheme: {
    num: string;
    title: string;
    complaint?: string;
    quotes: string[];
    impact?: string;
  } | null = null;
  const introLines: string[] = [];
  const takeawayItems: Array<{ label: string; text: string }> = [];
  let takeawayTitle = 'Key Action Steps & Recommendations';
  const confidenceLines: string[] = [];
  const closingLines: string[] = [];

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    if (!line || line === '---' || line === '***' || line === '___') {
      continue;
    }

    // Confidence Note section
    if (
      /^\*\*(?:Confidence Note|Context & Confidence)\*\*$/i.test(line) ||
      /^###\s+(?:Confidence Note|Context & Confidence)/i.test(line)
    ) {
      if (currentTheme) {
        brief.themes.push(currentTheme);
        currentTheme = null;
      }
      currentSection = 'confidence';
      continue;
    }

    // Takeaways / Recommendations section
    if (
      /^\*\*(?:Key Takeaways|Action Steps|Recommendations|Recommended Action Steps).*?\*\*$/i.test(
        line
      ) ||
      /^###\s+(?:Key Takeaways|Action Steps|Recommendations|Recommended Action Steps)/i.test(line)
    ) {
      if (currentTheme) {
        brief.themes.push(currentTheme);
        currentTheme = null;
      }
      takeawayTitle = line.replace(/^\*\*|\*\*$/g, '').replace(/^###\s+/, '').trim();
      currentSection = 'takeaways';
      continue;
    }

    // Closing offer
    if (
      /^Let me know if you(?:’|')d like me to/i.test(line) ||
      /^Feel free to ask/i.test(line) ||
      /^Would you like me to/i.test(line)
    ) {
      if (currentTheme) {
        brief.themes.push(currentTheme);
        currentTheme = null;
      }
      currentSection = 'closing';
      closingLines.push(line);
      continue;
    }

    // Theme Header (e.g. **1. Extremely Long Wait Times** or ### 1. Extremely Long Wait Times)
    const themeMatch = line.match(/^\*\*(\d+)\.\s+(.*?)\*\*$/) || line.match(/^###\s+(\d+)\.\s+(.*)/);
    if (themeMatch) {
      if (currentTheme) {
        brief.themes.push(currentTheme);
      }
      currentSection = 'theme';
      currentTheme = {
        num: themeMatch[1],
        title: themeMatch[2].trim(),
        quotes: [],
      };
      continue;
    }

    if (currentSection === 'header_or_intro') {
      if (
        !brief.header &&
        (line.toLowerCase().startsWith('recent negative reviews') ||
          line.toLowerCase().startsWith('review analysis') ||
          line.toLowerCase().startsWith('customer feedback') ||
          line.toLowerCase().startsWith('negative reviews') ||
          line.toLowerCase().startsWith('customer sentiment'))
      ) {
        const parenMatch = line.match(/^(.*?)\s*\((.*?)\):?$/);
        if (parenMatch) {
          brief.header = {
            title: parenMatch[1].trim(),
            subtitle: parenMatch[2].trim(),
          };
        } else {
          brief.header = {
            title: line.replace(/:$/, '').trim(),
          };
        }
      } else {
        introLines.push(line);
      }
    } else if (currentSection === 'theme' && currentTheme) {
      if (/^Key Complaint:/i.test(line)) {
        currentTheme.complaint = line.replace(/^Key Complaint:\s*/i, '').trim();
      } else if (/^Impact:/i.test(line)) {
        currentTheme.impact = line.replace(/^Impact:\s*/i, '').trim();
      } else if (line.startsWith('>')) {
        const q = line.replace(/^>\s*/, '').trim();
        if (q) currentTheme.quotes.push(q);
      } else if (/^Example:/i.test(line)) {
        const val = line.replace(/^Example:\s*/i, '').trim();
        if (val) currentTheme.quotes.push(val);
      } else if (currentTheme.complaint && !currentTheme.impact && !line.startsWith('>')) {
        currentTheme.complaint += ' ' + line;
      }
    } else if (currentSection === 'takeaways') {
      const kvMatch = line.match(/^(?:[-*]\s+)?(?:\*\*)?([^:]+?)(?:\*\*)?:\s+(.*)$/);
      if (kvMatch) {
        takeawayItems.push({
          label: kvMatch[1].trim(),
          text: kvMatch[2].trim(),
        });
      } else {
        takeawayItems.push({
          label: '',
          text: line.replace(/^[-*]\s+/, '').trim(),
        });
      }
    } else if (currentSection === 'confidence') {
      confidenceLines.push(line);
    } else if (currentSection === 'closing') {
      closingLines.push(line);
    }
  }

  if (currentTheme) {
    brief.themes.push(currentTheme);
  }

  if (introLines.length > 0) {
    brief.intro = introLines.join('\n\n');
  }

  if (takeawayItems.length > 0) {
    brief.takeaways = {
      title: takeawayTitle,
      items: takeawayItems,
    };
  }

  if (confidenceLines.length > 0) {
    brief.confidenceNote = confidenceLines.join(' ');
  }

  if (closingLines.length > 0) {
    brief.closing = closingLines.join(' ');
  }

  return brief;
}

// Structured Markdown Message Renderer for Executive Briefings
function FormattedMessage({ text }: { text: string }) {
  const brief = parseExecutiveBrief(text);

  // If parsed as an Executive Structured Brief, render premium card layout
  if (brief && (brief.themes.length > 0 || brief.takeaways)) {
    return (
      <div className="space-y-3.5 leading-relaxed font-sans text-xs">
        {/* Executive Header */}
        {brief.header && (
          <div className="pb-3 border-b border-zinc-800/80 mb-2">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono tracking-wide uppercase bg-[#5e6ad2]/15 text-[#828cf0] border border-[#5e6ad2]/30">
                Executive Intelligence Brief
              </span>
            </div>
            <h3 className="text-sm font-semibold text-white tracking-tight">
              {brief.header.title}
            </h3>
            {brief.header.subtitle && (
              <p className="text-[11px] font-mono text-zinc-400 mt-1">
                {brief.header.subtitle}
              </p>
            )}
          </div>
        )}

        {/* Intro Overview */}
        {brief.intro && (
          <div className="text-zinc-300 text-xs leading-relaxed bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-3">
            {renderInlineMarkdown(brief.intro)}
          </div>
        )}

        {/* Core Themes / Issues */}
        {brief.themes.length > 0 && (
          <div className="space-y-3 pt-1">
            {brief.themes.map((theme, i) => (
              <div
                key={i}
                className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-3.5 space-y-3 shadow-sm hover:border-zinc-700/60 transition-colors"
              >
                {/* Theme Title Bar */}
                <div className="flex items-center justify-between gap-2 border-b border-zinc-800/50 pb-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-md bg-rose-500/15 border border-rose-500/30 flex items-center justify-center font-mono text-[10px] font-semibold text-rose-400">
                      {theme.num || i + 1}
                    </span>
                    <h4 className="text-xs font-semibold text-zinc-100 tracking-tight">
                      {theme.title}
                    </h4>
                  </div>
                  <span className="text-[9.5px] font-mono uppercase tracking-wider text-rose-400/90 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">
                    Friction Area
                  </span>
                </div>

                {/* Complaint */}
                {theme.complaint && (
                  <div className="flex items-start gap-2 text-xs">
                    <span className="inline-flex items-center text-[9px] font-mono uppercase tracking-wider font-semibold text-rose-400 bg-rose-500/15 border border-rose-500/25 px-1.5 py-0.5 rounded shrink-0 mt-0.5">
                      Complaint
                    </span>
                    <div className="flex-1 text-zinc-300 leading-relaxed">
                      {renderInlineMarkdown(theme.complaint)}
                    </div>
                  </div>
                )}

                {/* Quotes / Evidence */}
                {theme.quotes.length > 0 && (
                  <div className="space-y-2 pt-0.5">
                    {theme.quotes.map((quote, qIdx) => (
                      <blockquote
                        key={qIdx}
                        className="pl-3 py-2 rounded-r-xl border-l-2 border-amber-500/60 bg-amber-500/5 text-zinc-200 italic font-sans text-xs leading-relaxed"
                      >
                        {renderInlineMarkdown(quote)}
                      </blockquote>
                    ))}
                  </div>
                )}

                {/* Impact */}
                {theme.impact && (
                  <div className="flex items-start gap-2 pt-2 border-t border-zinc-800/40 text-xs">
                    <span className="inline-flex items-center text-[9px] font-mono uppercase tracking-wider font-semibold text-[#828cf0] bg-[#5e6ad2]/15 border border-[#5e6ad2]/25 px-1.5 py-0.5 rounded shrink-0 mt-0.5">
                      Impact
                    </span>
                    <div className="flex-1 text-zinc-300 leading-relaxed">
                      {renderInlineMarkdown(theme.impact)}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Action Steps & Takeaways */}
        {brief.takeaways && brief.takeaways.items.length > 0 && (
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-950/15 p-3.5 space-y-3 mt-1">
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <h4 className="text-xs font-semibold tracking-tight text-emerald-300">
                {brief.takeaways.title}
              </h4>
            </div>
            <div className="space-y-2 pt-0.5">
              {brief.takeaways.items.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs">
                  <span className="w-4 h-4 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center font-mono text-[9px] font-semibold text-emerald-400 shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <div className="flex-1 text-zinc-300 leading-relaxed">
                    {item.label && (
                      <strong className="font-semibold text-zinc-100">
                        {item.label}:{' '}
                      </strong>
                    )}
                    <span>{renderInlineMarkdown(item.text)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sentiment & Context Note */}
        {brief.confidenceNote && (
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3 flex items-start gap-2.5 text-xs text-zinc-400 leading-relaxed">
            <Info className="w-4 h-4 text-[#828cf0] shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-[11px] font-medium text-zinc-200 mb-0.5">
                Sentiment & Context Note
              </div>
              <div className="text-zinc-300">
                {renderInlineMarkdown(brief.confidenceNote)}
              </div>
            </div>
          </div>
        )}

        {/* Closing Offer */}
        {brief.closing && (
          <p className="text-xs text-zinc-400 italic pt-1 pl-0.5">
            {renderInlineMarkdown(brief.closing)}
          </p>
        )}
      </div>
    );
  }

  // Standard Markdown Line-by-Line Renderer (Fallback for general queries)
  const clean = sanitizeAssistantText(text);
  const lines = clean.split('\n');

  return (
    <div className="space-y-2.5 leading-relaxed font-sans text-xs">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }

        // Horizontal Rule (--- or ***)
        if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
          return <hr key={idx} className="border-zinc-800/80 my-3" />;
        }

        // Headings (###)
        if (trimmed.startsWith('### ')) {
          const headingText = trimmed.replace(/^###\s+/, '');
          return (
            <div key={idx} className="mt-4 mb-2 pt-2 border-t border-zinc-800/60 first:border-0 first:pt-0">
              <h4 className="text-xs font-semibold text-white tracking-tight flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#5e6ad2] shrink-0" />
                <span>{renderInlineMarkdown(headingText)}</span>
              </h4>
            </div>
          );
        }

        // Headings (# or ##)
        if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
          return (
            <h3 key={idx} className="text-sm font-semibold text-white tracking-tight mt-4 mb-2">
              {renderInlineMarkdown(trimmed.replace(/^#+\s+/, ''))}
            </h3>
          );
        }

        // Standalone Theme Subheadings (e.g. **1. Extremely Long Wait Times**)
        const themeHeaderMatch = trimmed.match(/^\*\*(\d+\.\s+.*?)\*\*$/);
        if (themeHeaderMatch) {
          return (
            <div key={idx} className="mt-4 mb-2 pt-2 border-t border-zinc-800/60 first:border-0 first:pt-0 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
              <span className="text-xs font-semibold text-white tracking-tight">
                {themeHeaderMatch[1]}
              </span>
            </div>
          );
        }

        // Blockquotes (> "...")
        if (trimmed.startsWith('>')) {
          const quoteContent = trimmed.replace(/^>\s*/, '');
          return (
            <blockquote
              key={idx}
              className="my-2 pl-3 py-1.5 rounded-r-xl border-l-2 border-[#5e6ad2]/70 bg-zinc-900/60 text-zinc-200 italic font-sans text-xs"
            >
              {renderInlineMarkdown(quoteContent)}
            </blockquote>
          );
        }

        // Key-Value Subsections (Key Complaint:, Impact:, Example:)
        if (trimmed.startsWith('Key Complaint:')) {
          const val = trimmed.replace(/^Key Complaint:\s*/, '');
          return (
            <div key={idx} className="flex items-start gap-1.5 text-zinc-300">
              <span className="inline-flex items-center text-[9.5px] font-mono uppercase tracking-wider font-semibold text-rose-400 bg-rose-500/15 border border-rose-500/25 px-1.5 py-0.5 rounded shrink-0">
                Complaint
              </span>
              <span className="flex-1">{renderInlineMarkdown(val)}</span>
            </div>
          );
        }

        if (trimmed.startsWith('Impact:')) {
          const val = trimmed.replace(/^Impact:\s*/, '');
          return (
            <div key={idx} className="flex items-start gap-1.5 text-zinc-300">
              <span className="inline-flex items-center text-[9.5px] font-mono uppercase tracking-wider font-semibold text-[#828cf0] bg-[#5e6ad2]/15 border border-[#5e6ad2]/25 px-1.5 py-0.5 rounded shrink-0">
                Impact
              </span>
              <span className="flex-1">{renderInlineMarkdown(val)}</span>
            </div>
          );
        }

        if (trimmed.startsWith('Example:')) {
          const val = trimmed.replace(/^Example:\s*/, '');
          return (
            <div key={idx} className="flex items-start gap-1.5 text-zinc-300">
              <span className="inline-flex items-center text-[9.5px] font-mono uppercase tracking-wider font-semibold text-amber-400 bg-amber-500/15 border border-amber-500/25 px-1.5 py-0.5 rounded shrink-0">
                Evidence
              </span>
              <span className="flex-1">{renderInlineMarkdown(val)}</span>
            </div>
          );
        }

        // Bullet point lists (- or *)
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const content = trimmed.replace(/^[-*]\s+/, '');
          return (
            <div key={idx} className="flex items-start gap-2.5 pl-1 text-zinc-300">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 shrink-0 mt-1.5" />
              <span className="flex-1">{renderInlineMarkdown(content)}</span>
            </div>
          );
        }

        // Numbered lists (1. , 2. )
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2.5 pl-1 text-zinc-300">
              <span className="font-mono text-[11px] text-zinc-400 font-medium shrink-0 min-w-[14px]">
                {numMatch[1]}.
              </span>
              <span className="flex-1">{renderInlineMarkdown(numMatch[2])}</span>
            </div>
          );
        }

        // Normal paragraph
        return (
          <p key={idx} className="text-zinc-300">
            {renderInlineMarkdown(line)}
          </p>
        );
      })}
    </div>
  );
}

export default function AskAiView({ initialQuery }: AskAiViewProps) {
  const { activeBusiness } = useBusiness();
  const chatCounterRef = useRef(1);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [googleBusinessUrl, setGoogleBusinessUrl] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Retrieve company's connected Google Maps review page URL
  useEffect(() => {
    if (!activeBusiness?.id) {
      setGoogleBusinessUrl(null);
      return;
    }
    businessApi
      .listPlatforms(activeBusiness.id)
      .then((platforms) => {
        const gConn = platforms.find(
          (p) => p.platform === 'google_maps' || (p.platform as any) === 'google'
        );
        if (gConn?.source_url) {
          setGoogleBusinessUrl(gConn.source_url);
        } else if (gConn?.place_id) {
          setGoogleBusinessUrl(`https://search.google.com/local/reviews?placeid=${gConn.place_id}`);
        } else {
          setGoogleBusinessUrl(null);
        }
      })
      .catch(() => setGoogleBusinessUrl(null));
  }, [activeBusiness?.id]);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const handleSend = useCallback(
    async (text: string) => {
      const cleanText = text.trim();
      if (!cleanText || !activeBusiness?.id || isSending) return;

      chatCounterRef.current += 1;
      const currentId = chatCounterRef.current;
      const userMsg: ChatMessage = {
        id: `u_${currentId}`,
        sender: 'user',
        text: cleanText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInputVal('');
      setIsSending(true);

      try {
        const history = messages
          .filter((m) => !m.isError)
          .map((m) => ({
            role: m.sender,
            content: m.text,
          }));

        const res = await businessApi.sendChat(activeBusiness.id, cleanText, history);

        const reviewRefs: ReviewItem[] = (res.citations || []).map((c) => ({
          id: c.id,
          author: c.author || 'Verified Customer',
          rating: c.rating || 5,
          date: c.published_at ? new Date(c.published_at).toLocaleDateString() : 'Recent',
          platform: (c.platform?.toLowerCase() as any) || 'google',
          content: c.content,
          sentiment: c.rating && c.rating <= 2 ? 'negative' : c.rating && c.rating >= 4 ? 'positive' : 'neutral',
          themes: [],
          sourceUrl: c.source_url || undefined,
        }));

        const aiMsg: ChatMessage = {
          id: `a_${currentId}`,
          sender: 'assistant',
          text: res.answer,
          confidence: res.confidence > 0.8 ? 'High' : res.confidence > 0.5 ? 'Medium' : 'Low',
          limitationNote: res.limitation_note,
          sources: (res.citations || []).map((c) => `${c.platform.toUpperCase()} (${c.author})`),
          reviewRefs,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setMessages((prev) => [...prev, aiMsg]);
      } catch (err: any) {
        const friendlyText = sanitizeErrorMessage(err);
        const errorMsg: ChatMessage = {
          id: `err_${currentId}`,
          sender: 'assistant',
          text: friendlyText,
          isError: true,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsSending(false);
      }
    },
    [activeBusiness, isSending, messages]
  );

  // Handle optional initialQuery
  useEffect(() => {
    if (initialQuery && activeBusiness?.id) {
      handleSend(initialQuery);
    }
  }, [initialQuery, activeBusiness?.id, handleSend]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(inputVal);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  const getCompanyReviewPageUrl = (r: ReviewItem): string => {
    // 1. Direct review URL or direct Google review page saved with the item
    if (r.sourceUrl && (r.sourceUrl.includes('google.com') || r.sourceUrl.includes('goo.gl'))) {
      return r.sourceUrl;
    }

    // 2. Exact Google Maps review page connected to this business in Settings
    if (googleBusinessUrl && googleBusinessUrl.startsWith('http')) {
      return googleBusinessUrl;
    }

    // 3. Fallback: Google Maps company search page (opens company listing & reviews, NO person name)
    const bizName = activeBusiness?.name || 'Business';
    const loc = activeBusiness?.location ? ` ${activeBusiness.location}` : '';
    const query = encodeURIComponent(`${bizName}${loc}`.trim());
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  };

  if (!activeBusiness) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3 bg-[#010102]">
        <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
          <MessageSquare className="w-5 h-5" />
        </div>
        <h3 className="text-sm font-semibold text-zinc-100">No Business Selected</h3>
        <p className="text-xs text-zinc-400 max-w-sm">
          Select an active business profile from the header selector to query verified customer reviews.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full w-full bg-[#010102] overflow-hidden select-text">
      {/* ─────────────────────────────────────────────────────────────
          FULL-BLEED SCROLLABLE MESSAGES STREAM
          ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
        {messages.length === 0 ? (
          /* ── ELEGANT MINIMAL EMPTY STATE ── */
          <div className="h-full min-h-[460px] flex flex-col items-center justify-center text-center max-w-3xl mx-auto space-y-8 animate-in fade-in duration-300">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-amber-400 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-xl font-semibold text-zinc-100 tracking-tight">
                  Hi there! How can I assist you today?
                </h2>
                <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
                  I'm your friendly feedback assistant for <span className="text-zinc-200 font-medium">{activeBusiness.name}</span>.
                  Ask me anything about what patients love, common concerns, or ways to delight your customers!
                </p>
              </div>
            </div>

            {/* 2x2 Suggestion Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl text-left">
              {PRESET_SUGGESTIONS.map((preset) => {
                const IconComponent = preset.icon;
                return (
                  <button
                    key={preset.category}
                    type="button"
                    onClick={() => handleSend(preset.query)}
                    className="p-4 rounded-xl bg-zinc-900/30 border border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/70 transition-all text-left group cursor-pointer space-y-1.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)] active:scale-[0.99]"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <IconComponent className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-200 transition-colors" />
                        <span className="font-medium text-zinc-200 group-hover:text-white transition-colors">
                          {preset.category}
                        </span>
                      </div>
                      <ArrowUpRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-200 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </div>
                    <p className="text-[11px] text-zinc-500 group-hover:text-zinc-400 transition-colors leading-relaxed line-clamp-2">
                      {preset.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* ── ACTIVE MESSAGE STREAM (ERGONOMIC MAX-W COLUMN WITHIN COMPLETE AREA) ── */
          <div className="max-w-3xl lg:max-w-4xl mx-auto w-full space-y-6">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in duration-200`}
              >
                {msg.sender === 'assistant' && (
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border text-xs mt-0.5 ${
                      msg.isError
                        ? 'bg-amber-950/30 border-amber-800/50 text-amber-400'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-300'
                    }`}
                  >
                    {msg.isError ? <AlertCircle className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                  </div>
                )}

                <div
                  className={`rounded-2xl text-xs space-y-3 ${
                    msg.sender === 'user'
                      ? 'max-w-xl p-4 bg-zinc-800/80 border border-zinc-700/60 text-zinc-100 shadow-sm ml-auto'
                      : msg.isError
                      ? 'flex-1 max-w-3xl p-5 bg-zinc-950/90 border border-amber-500/25 text-zinc-200 shadow-[inset_0_1px_0_0_rgba(245,158,11,0.04)]'
                      : 'flex-1 max-w-3xl p-5 sm:p-6 bg-zinc-900/30 border border-zinc-800/70 text-zinc-200 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)]'
                  }`}
                >
                  {/* Message Meta Header */}
                  <div className="flex items-center justify-between gap-4 border-b border-zinc-800/40 pb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-mono text-[11px] font-medium ${
                          msg.sender === 'user' ? 'text-zinc-300' : msg.isError ? 'text-amber-400' : 'text-zinc-400'
                        }`}
                      >
                        {msg.sender === 'user' ? 'You' : msg.isError ? 'Service Notice' : 'RepScan Assistant'}
                      </span>
                      {msg.sender === 'assistant' && !msg.isError && msg.confidence && (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900/80 border border-zinc-800">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              msg.confidence === 'High'
                                ? 'bg-emerald-400'
                                : msg.confidence === 'Medium'
                                ? 'bg-amber-400'
                                : 'bg-zinc-500'
                            }`}
                          />
                          <span className="text-zinc-300">{msg.confidence} Confidence</span>
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500">{msg.timestamp}</span>
                  </div>

                  {/* Body Content */}
                  {msg.sender === 'assistant' && !msg.isError ? (
                    <FormattedMessage text={msg.text} />
                  ) : (
                    <p className="leading-relaxed whitespace-pre-wrap font-sans text-xs">{msg.text}</p>
                  )}

                  {/* Limitation Note Banner */}
                  {msg.sender === 'assistant' && msg.limitationNote && !msg.isError && (
                    <div className="pt-2 border-t border-zinc-800/60 flex items-start gap-2 text-[11px] font-mono text-zinc-400 bg-zinc-900/40 p-2.5 rounded-lg border border-zinc-800/50">
                      <Info className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                      <span>{msg.limitationNote}</span>
                    </div>
                  )}

                  {/* Error Retry Option */}
                  {msg.isError && (
                    <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px]">
                      <span className="text-zinc-500 font-mono">Status: Undergoing Maintenance</span>
                      <button
                        type="button"
                        onClick={() => {
                          const lastUser = [...messages].reverse().find((m) => m.sender === 'user');
                          if (lastUser) handleSend(lastUser.text);
                        }}
                        className="inline-flex items-center gap-1 font-mono text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Try again</span>
                      </button>
                    </div>
                  )}

                  {/* Verified Cited Evidence Proof Badges */}
                  {msg.sender === 'assistant' && msg.reviewRefs && msg.reviewRefs.length > 0 && (
                    <div className="pt-3 border-t border-zinc-800/60 space-y-2">
                      <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider block">
                        Verified Review Citations:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {msg.reviewRefs.map((r, i) => (
                          <a
                            key={r.id || i}
                            href={getCompanyReviewPageUrl(r)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-[11px] font-mono px-3 py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-850 text-zinc-300 hover:text-white transition-all cursor-pointer shadow-sm group active:scale-[0.98]"
                            title={`Open ${activeBusiness?.name || 'business'} reviews on Google Maps`}
                          >
                            <span className="font-medium text-zinc-200">{r.author}</span>
                            <span className="text-amber-400">({r.rating}★)</span>
                            <span className="text-zinc-500 capitalize">· {r.platform}</span>
                            <ArrowUpRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-200 transition-colors" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Minimal Modern RAG Loader in-stream */}
            {isSending && (
              <div className="flex gap-3.5 justify-start animate-in fade-in duration-200">
                <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 flex items-center justify-center shrink-0 text-xs">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="rounded-full px-4 py-2 bg-zinc-900/50 border border-zinc-800/80 text-xs text-zinc-400 flex items-center gap-3 font-mono shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)]">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-pulse" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-pulse" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-pulse" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-[11px] text-zinc-400">Looking through customer reviews for you...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          DOCKED MINIMAL BOTTOM INPUT BAR (FULL WIDTH CANVAS)
          ───────────────────────────────────────────────────────────── */}
      <div className="shrink-0 bg-gradient-to-t from-[#010102] via-[#010102]/95 to-transparent pt-3 pb-5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl lg:max-w-4xl mx-auto w-full space-y-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(inputVal);
            }}
            className="relative flex items-center bg-zinc-900/60 border border-zinc-800 hover:border-zinc-750 focus-within:border-zinc-600 rounded-2xl p-1.5 pl-4 transition-all shadow-[0_4px_24px_rgba(0,0,0,0.5)]"
          >
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask me anything about reviews, customer feedback, or ratings for ${activeBusiness.name}...`}
              disabled={isSending}
              className="flex-1 bg-transparent py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none resize-none font-sans max-h-32 leading-relaxed"
            />
            <button
              type="submit"
              disabled={!inputVal.trim() || isSending}
              className="w-8 h-8 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 flex items-center justify-center transition-all active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed shrink-0 cursor-pointer shadow-sm ml-2"
              title="Send query"
              aria-label="Send query"
            >
              <ArrowUp className="w-4 h-4 stroke-[2.5]" />
            </button>
          </form>

          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 px-2 select-none">
            <span>Press <kbd className="text-zinc-400 font-semibold">Enter</kbd> to ask · <kbd className="text-zinc-400 font-semibold">Shift + Enter</kbd> for newline</span>
            {messages.length > 0 ? (
              <button
                type="button"
                onClick={handleClearChat}
                className="text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer underline underline-offset-2"
              >
                Clear conversation
              </button>
            ) : (
              <span className="hidden sm:inline">Friendly Assistant · Verified Customer Evidence</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
