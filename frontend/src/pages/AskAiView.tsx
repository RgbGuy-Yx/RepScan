import { useState, useRef } from 'react';
import { Sparkles, Send, ShieldCheck, ExternalLink, Bot, User } from 'lucide-react';
import type { ReviewItem } from '../types/dashboard';
import { MOCK_REVIEWS } from '../mock/dashboardData';

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
  'Why did our rating drop this week?',
  'What are customers complaining about the most?',
  'Show recent negative reviews about staff',
  'Compare this week with last week',
  'Summarize this week for me',
];

export default function AskAiView({ initialQuery, onOpenProof }: AskAiViewProps) {
  const chatCounterRef = useRef(100);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      sender: 'user',
      text: initialQuery || 'Why did our rating drop this week?',
      timestamp: '10:42 AM',
    },
    {
      id: 'm2',
      sender: 'assistant',
      text: 'Our rating fell by 0.4 stars (from 4.5 to 4.1) driven by a 267% surge in Food Quality complaints (cold food delivery) and inattentive staff behavior during peak Friday/Saturday dinner rushes.',
      confidence: 'High',
      sources: ['Google Reviews (#rev_1)', 'Google Reviews (#rev_4)'],
      reviewRefs: [MOCK_REVIEWS[0], MOCK_REVIEWS[3]],
      timestamp: '10:42 AM',
    },
  ]);

  const [inputVal, setInputVal] = useState('');

  const handleSend = (text: string) => {
    if (!text.trim()) return;

    chatCounterRef.current += 1;
    const currentId = chatCounterRef.current;
    const userMsg: ChatMessage = {
      id: `u_${currentId}`,
      sender: 'user',
      text,
      timestamp: 'Just now',
    };

    let replyText =
      'Based on 248 verified customer reviews across Google, Instagram, and LinkedIn, overall sentiment remains 62% positive. Top praises highlight ambience (80% positive), while staff response latency remains the primary operational bottleneck.';
    let refs = [MOCK_REVIEWS[1], MOCK_REVIEWS[2]];

    if (text.toLowerCase().includes('staff')) {
      replyText =
        '14 reviews this week cited staff responsiveness delays. Negative sentiment clustered between 8:00 PM and 10:00 PM on Friday and Saturday, where table wait times exceeded 40 minutes.';
      refs = [MOCK_REVIEWS[0], MOCK_REVIEWS[3]];
    } else if (text.toLowerCase().includes('summarize')) {
      replyText =
        'Weekly Executive Summary: 248 total reviews (+28% volume). Food Quality and Staff Behavior represent 80% of negative feedback. Ambience and Aesthetics score highest with 92% satisfaction.';
    }

    const aiMsg: ChatMessage = {
      id: `a_${currentId}`,
      sender: 'assistant',
      text: replyText,
      confidence: 'High',
      sources: refs.map((r) => `${r.platform.toUpperCase()} (${r.author})`),
      reviewRefs: refs,
      timestamp: 'Just now',
    };

    setMessages((prev) => [...prev, userMsg, aiMsg]);
    setInputVal('');
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
            <p className="text-xs text-[#d0d6e0] mt-0.5">
              Every analytical claim is verified against raw database rows with direct review UUID citations.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#27a644]/10 text-xs font-medium text-[#4ade80] border border-[#27a644]/30">
          <ShieldCheck className="w-3.5 h-3.5 text-[#27a644]" />
          <span>Zero Hallucinations</span>
        </div>
      </div>

      {/* Preset Chips */}
      <div className="flex flex-wrap items-center gap-2 mb-4 shrink-0">
        {PRESET_QUESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => handleSend(q)}
            className="px-3 py-1.5 rounded-md bg-[#0f1011] border border-[#23252a] hover:border-[#34343a] text-xs font-medium text-[#d0d6e0] hover:text-[#f7f8f8] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)] transition-colors"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${
              msg.sender === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.sender === 'assistant' && (
              <div className="w-8 h-8 rounded-md bg-[#141516] border border-[#5e6ad2]/30 text-[#828fff] flex items-center justify-center shrink-0 shadow-xs">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-2xl p-4 rounded-xl text-xs leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-[#18191a] border border-[#34343a] text-[#f7f8f8] rounded-tr-xs shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]'
                  : 'bg-[#0f1011] border border-[#23252a] text-[#d0d6e0] rounded-tl-xs shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] space-y-3'
              }`}
            >
              <p className="leading-relaxed">{msg.text}</p>

              {msg.reviewRefs && msg.reviewRefs.length > 0 && (
                <div className="pt-2.5 border-t border-[#23252a] space-y-2">
                  <span className="text-[10px] font-semibold text-[#8a8f98] uppercase tracking-[0.05em] block">
                    Verified Citations
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {msg.reviewRefs.map((rev) => (
                      <button
                        key={rev.id}
                        type="button"
                        onClick={() => onOpenProof(rev)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#141516] hover:bg-[#18191a] border border-[#23252a] hover:border-[#34343a] text-[#828fff] hover:text-[#f7f8f8] font-medium transition-colors text-[11px]"
                      >
                        <span>
                          {rev.author} ({rev.rating}★)
                        </span>
                        <ExternalLink className="w-3 h-3 text-[#62666d]" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {msg.confidence && (
                <div className="flex items-center justify-between text-[11px] text-[#62666d] pt-1 border-t border-[#23252a]/60">
                  <span className="text-[#4ade80] font-medium flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Confidence: {msg.confidence}
                  </span>
                  <span className="font-mono text-[#62666d]">{msg.timestamp}</span>
                </div>
              )}
            </div>

            {msg.sender === 'user' && (
              <div className="w-8 h-8 rounded-md bg-[#18191a] border border-[#23252a] text-[#8a8f98] flex items-center justify-center shrink-0">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(inputVal);
        }}
        className="mt-4 pt-3 border-t border-[#23252a] flex items-center gap-2.5 shrink-0"
      >
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder="Ask anything about customer reviews, themes, or trends…"
          className="flex-1 h-10 px-3.5 text-xs rounded-md border border-[#23252a] bg-[#141516] text-[#f7f8f8] placeholder:text-[#62666d] focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2]"
        />
        <button
          type="submit"
          className="linear-btn-primary h-10 px-4 rounded-md font-medium text-xs flex items-center gap-2"
        >
          <span>Send</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
