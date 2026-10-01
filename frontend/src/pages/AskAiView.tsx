import { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, ShieldCheck, ExternalLink, Bot, User, Loader2 } from 'lucide-react';
import type { ReviewItem } from '../types/dashboard';
import { useBusiness } from '../context/BusinessContext';
import { businessApi } from '../api/businessApi';

interface AskAiViewProps {
  initialQuery?: string;
  onOpenProof: (review: ReviewItem) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  confidence?: 'High' | 'Medium' | 'Low';
  sources?: string[];
  reviewRefs?: ReviewItem[];
  timestamp: string;
}

const PRESET_QUESTIONS = [
  'What are customers complaining about the most?',
  'Why did our rating change recently?',
  'Show negative feedback regarding staff or food',
  'Summarize recent customer sentiment',
];

export default function AskAiView({ initialQuery, onOpenProof }: AskAiViewProps) {
  const { activeBusiness } = useBusiness();
  const chatCounterRef = useRef(1);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  // Handle optional initialQuery
  useEffect(() => {
    if (initialQuery && activeBusiness?.id) {
      handleSend(initialQuery);
    }
  }, [initialQuery, activeBusiness?.id]);

  const handleSend = async (text: string) => {
    if (!text.trim() || !activeBusiness?.id || isSending) return;

    chatCounterRef.current += 1;
    const currentId = chatCounterRef.current;
    const userMsg: ChatMessage = {
      id: `u_${currentId}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputVal('');
    setIsSending(true);

    try {
      const history = messages.map((m) => ({
        role: m.sender,
        content: m.text,
      }));

      const res = await businessApi.sendChat(activeBusiness.id, text, history);

      const reviewRefs: ReviewItem[] = (res.citations || []).map((c) => ({
        id: c.id,
        author: c.author || 'Verified Customer',
        rating: c.rating || 5,
        date: c.published_at ? new Date(c.published_at).toLocaleDateString() : 'Recent',
        platform: (c.platform?.toLowerCase() as any) || 'google',
        content: c.content,
        sentiment: c.rating && c.rating <= 2 ? 'negative' : c.rating && c.rating >= 4 ? 'positive' : 'neutral',
        themes: [],
      }));

      const aiMsg: ChatMessage = {
        id: `a_${currentId}`,
        sender: 'assistant',
        text: res.answer,
        confidence: res.confidence > 0.8 ? 'High' : res.confidence > 0.5 ? 'Medium' : 'Low',
        sources: (res.citations || []).map((c) => `${c.platform.toUpperCase()} (${c.author})`),
        reviewRefs,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err_${currentId}`,
        sender: 'assistant',
        text:
          err.message ||
          'Could not retrieve grounded intelligence. Ensure customer reviews are ingested for this business.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto flex flex-col h-[calc(100vh-4.5rem)]">
      {/* Top Banner */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-[#0f1011] border border-[#23252a] mb-5 shrink-0 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-[#141516] border border-[#23252a] text-[#828fff] flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-[10px] font-semibold text-[#8a8f98] uppercase tracking-[0.05em]">
              PostgreSQL Verified Grounding
            </h2>
            <p className="text-xs text-[#d0d6e0] font-medium mt-0.5">
              Querying {activeBusiness?.name || 'Active Business'} • Zero hallucinations with citation back-links
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-[#4ade80] font-medium bg-[#27a644]/10 border border-[#27a644]/25 px-2.5 py-1 rounded-md">
          <ShieldCheck className="w-3.5 h-3.5 text-[#27a644]" />
          <span>Real-time Vector Search</span>
        </div>
      </div>

      {/* Messages Stream Container */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#5e6ad2]/15 border border-[#5e6ad2]/30 flex items-center justify-center text-[#828fff] shadow-[0_0_20px_rgba(94,106,210,0.2)]">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#f7f8f8]">
                Ask RepScan Intelligence
              </h3>
              <p className="text-xs text-[#8a8f98] max-w-sm mt-1">
                Ask questions about customer feedback, sentiment trends, or operational issues for {activeBusiness?.name || 'your business'}.
              </p>
            </div>

            {/* Preset Suggestions */}
            <div className="flex flex-wrap gap-2 justify-center max-w-lg pt-2">
              {PRESET_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => handleSend(q)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-[#23252a] hover:border-[#34343a] bg-[#0f1011] hover:bg-[#141516] text-[#d0d6e0] transition-colors cursor-pointer text-left"
                >
                  “{q}”
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'assistant' && (
                <div className="w-7 h-7 rounded-md bg-[#18191a] text-[#828fff] flex items-center justify-center shrink-0 border border-[#5e6ad2]/30 text-xs">
                  <Bot className="w-3.5 h-3.5" />
                </div>
              )}

              <div
                className={`max-w-2xl rounded-xl p-4 text-xs space-y-2.5 ${
                  msg.sender === 'user'
                    ? 'bg-[#5e6ad2] text-white shadow-[0_2px_8px_rgba(94,106,210,0.35)]'
                    : 'bg-[#0f1011] border border-[#23252a] text-[#d0d6e0] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]'
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <span
                    className={`font-semibold ${
                      msg.sender === 'user' ? 'text-white/80' : 'text-[#8a8f98]'
                    }`}
                  >
                    {msg.sender === 'user' ? 'You' : 'RepScan Intelligence'}
                  </span>
                  <span
                    className={`text-[10px] ${
                      msg.sender === 'user' ? 'text-white/70' : 'text-[#62666d]'
                    }`}
                  >
                    {msg.timestamp}
                  </span>
                </div>

                <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>

                {msg.sender === 'assistant' && msg.confidence && (
                  <div className="pt-2 border-t border-[#23252a] flex items-center justify-between text-[11px] text-[#8a8f98]">
                    <span>Grounding Confidence: <strong className="text-[#4ade80]">{msg.confidence}</strong></span>
                  </div>
                )}

                {msg.sender === 'assistant' && msg.reviewRefs && msg.reviewRefs.length > 0 && (
                  <div className="pt-2 border-t border-[#23252a] space-y-1.5">
                    <span className="text-[10px] text-[#8a8f98] font-semibold uppercase tracking-wider block">
                      Cited Customer Reviews:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.reviewRefs.map((r, i) => (
                        <button
                          key={r.id || i}
                          type="button"
                          onClick={() => onOpenProof(r)}
                          className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-[#141516] hover:bg-[#18191a] border border-[#23252a] text-[11px] text-[#828fff] transition-colors cursor-pointer"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>
                            {r.platform.toUpperCase()} • {r.author}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {msg.sender === 'user' && (
                <div className="w-7 h-7 rounded-md bg-[#141516] text-[#8a8f98] flex items-center justify-center shrink-0 border border-[#23252a] text-xs">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          ))
        )}

        {isSending && (
          <div className="flex gap-3.5 justify-start">
            <div className="w-7 h-7 rounded-md bg-[#18191a] text-[#828fff] flex items-center justify-center shrink-0 border border-[#5e6ad2]/30 text-xs">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="p-4 rounded-xl bg-[#0f1011] border border-[#23252a] flex items-center gap-2 text-xs text-[#8a8f98]">
              <Loader2 className="w-3.5 h-3.5 text-[#5e6ad2] animate-spin" />
              <span>Querying PostgreSQL vector citations...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(inputVal);
        }}
        className="shrink-0 flex items-center gap-2"
      >
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder={`Ask about ${activeBusiness?.name || 'customer feedback'}…`}
          disabled={isSending}
          className="flex-1 h-10 px-4 text-xs rounded-lg border border-[#23252a] bg-[#0f1011] text-[#f7f8f8] placeholder:text-[#62666d] focus:border-[#5e6ad2] focus:outline-none transition-colors"
        />
        <button
          type="submit"
          disabled={!inputVal.trim() || isSending}
          className="h-10 px-4 rounded-lg bg-[#5e6ad2] hover:bg-[#828fff] text-white text-xs font-medium transition-all shadow-[0_2px_8px_rgba(94,106,210,0.35)] disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Ask AI</span>
        </button>
      </form>
    </div>
  );
}
