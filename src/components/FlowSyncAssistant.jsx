import React, { useState, useRef, useEffect } from 'react';
import { useStadiumData } from '../context/StadiumContext';
import { Send, Bot, User, Sparkles, Command, Loader2, ChevronDown, Target, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { askFlowSyncAI } from '../logic/geminiApi';

// ─── Language config ─────────────────────────────────────────────────────────
const LANGUAGES = [
  { code: 'English',  flag: '🇬🇧' },
  { code: 'Tamil',    flag: '🇮🇳' },
  { code: 'Hindi',    flag: '🇮🇳' },
  { code: 'Spanish',  flag: '🇪🇸' },
  { code: 'Mandarin', flag: '🇨🇳' },
  { code: 'French',   flag: '🇫🇷' },
];

// ─── Language Dropdown ────────────────────────────────────────────────────────
const LanguageDropdown = ({ selected, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = LANGUAGES.find(l => l.code === selected) ?? LANGUAGES[0];

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        id="language-trigger"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all duration-200 bg-slate-800/60 border-slate-600/50 text-slate-300 hover:bg-slate-700/60 hover:border-slate-500/60 hover:text-white active:scale-95"
      >
        <Globe size={12} className="text-indigo-400" />
        <span>{current.flag}</span>
        <span>{current.code}</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={11} />
        </motion.div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{   opacity: 0, y: -6, scale: 0.96  }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute right-0 top-full mt-2 w-44 bg-slate-900/95 backdrop-blur-xl border border-slate-700/60 rounded-2xl shadow-2xl shadow-black/40 z-50 overflow-hidden p-1.5"
          >
            {LANGUAGES.map((lang) => {
              const isActive = lang.code === selected;
              return (
                <button
                  key={lang.code}
                  id={`lang-${lang.code.toLowerCase()}`}
                  onClick={() => { onChange(lang.code); setOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 ${
                    isActive
                      ? 'bg-indigo-500/20 border border-indigo-500/30 text-indigo-300'
                      : 'hover:bg-slate-800/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="text-base leading-none">{lang.flag}</span>
                  <p className="text-[11px] font-black uppercase tracking-widest">{lang.code}</p>
                  {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Smart Mode config ────────────────────────────────────────────────────────
const SMART_MODES = [
  {
    key:         'fastest',
    emoji:       '⚡',
    label:       'Fastest',
    description: 'Shortest time route',
    color:       'text-amber-400',
    bg:          'bg-amber-500/10 border-amber-500/30',
    activeBg:    'bg-amber-500/20 border-amber-400/60',
    dot:         'bg-amber-400',
    glow:        'shadow-[0_0_12px_rgba(245,158,11,0.3)]',
  },
  {
    key:         'family',
    emoji:       '👨‍👩‍👧',
    label:       'Family',
    description: 'Low crowd + safe path',
    color:       'text-sky-400',
    bg:          'bg-sky-500/10 border-sky-500/30',
    activeBg:    'bg-sky-500/20 border-sky-400/60',
    dot:         'bg-sky-400',
    glow:        'shadow-[0_0_12px_rgba(14,165,233,0.3)]',
  },
  {
    key:         'group',
    emoji:       '👥',
    label:       'Group',
    description: 'Avoid splitting up',
    color:       'text-violet-400',
    bg:          'bg-violet-500/10 border-violet-500/30',
    activeBg:    'bg-violet-500/20 border-violet-400/60',
    dot:         'bg-violet-400',
    glow:        'shadow-[0_0_12px_rgba(139,92,246,0.3)]',
  },
  {
    key:         'elderly',
    emoji:       '🧓',
    label:       'Elderly',
    description: 'Smooth + less dense',
    color:       'text-emerald-400',
    bg:          'bg-emerald-500/10 border-emerald-500/30',
    activeBg:    'bg-emerald-500/20 border-emerald-400/60',
    dot:         'bg-emerald-400',
    glow:        'shadow-[0_0_12px_rgba(16,185,129,0.3)]',
  },
];

// ─── Markdown renderer ────────────────────────────────────────────────────────
/**
 * Simple inline markdown renderer — no external library.
 * Handles: **bold**, bullet lists (- or *), numbered lists, and paragraphs.
 */
const MarkdownMessage = ({ text }) => {
  if (!text) return null;

  const lines = text.split('\n');
  const elements = [];
  let listItems = [];

  const flushList = (key) => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`ul-${key}`} className="list-disc pl-5 space-y-1 my-2">
          {listItems.map((item, i) => (
            <li key={i} className="pl-1">{renderInline(item)}</li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  const renderInline = (str) => {
    const parts = str.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold text-indigo-300">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (/^[-*]\s+/.test(trimmed)) { listItems.push(trimmed.replace(/^[-*]\s+/, '')); return; }
    if (/^\d+\.\s+/.test(trimmed)) { listItems.push(trimmed.replace(/^\d+\.\s+/, '')); return; }
    if (/^#{1,3}\s+/.test(trimmed)) {
      flushList(idx);
      elements.push(<p key={idx} className="font-bold text-white mt-2 mb-1">{renderInline(trimmed.replace(/^#{1,3}\s+/, ''))}</p>);
      return;
    }
    if (trimmed === '') { flushList(idx); return; }
    flushList(idx);
    elements.push(<p key={idx} className="mb-1 last:mb-0">{renderInline(trimmed)}</p>);
  });

  flushList('end');
  return <div className="space-y-1 text-sm leading-relaxed">{elements}</div>;
};

// ─── Smart Mode Dropdown ──────────────────────────────────────────────────────
const SmartModeDropdown = ({ selected, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = SMART_MODES.find(m => m.key === selected) ?? SMART_MODES[0];

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      {/* Trigger button */}
      <button
        id="smart-mode-trigger"
        onClick={() => setOpen(o => !o)}
        className={`
          flex items-center gap-1.5 px-2 py-1 rounded-xl border text-[10px] font-black
          uppercase tracking-widest transition-all duration-200
          ${current.activeBg} ${current.color} ${current.glow}
          hover:brightness-110 active:scale-95
        `}
      >
        <span className="text-sm leading-none">{current.emoji}</span>
        <span>{current.label}</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={11} />
        </motion.div>
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{   opacity: 0, y: -6, scale: 0.96  }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute right-0 top-full mt-2 w-52 bg-slate-900/95 backdrop-blur-xl
              border border-slate-700/60 rounded-2xl shadow-2xl shadow-black/40 z-50 overflow-hidden p-1.5"
          >
            {SMART_MODES.map((mode) => {
              const isActive = mode.key === selected;
              return (
                <button
                  key={mode.key}
                  id={`smart-mode-${mode.key}`}
                  onClick={() => { onChange(mode.key); setOpen(false); }}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left
                    transition-all duration-150
                    ${isActive
                      ? `${mode.activeBg} ${mode.color}`
                      : 'hover:bg-slate-800/60 text-slate-400 hover:text-slate-200'
                    }
                  `}
                >
                  <span className="text-base leading-none w-5 text-center">{mode.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[11px] font-black uppercase tracking-widest ${isActive ? mode.color : ''}`}>
                      {mode.label}
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium normal-case tracking-normal truncate">
                      {mode.description}
                    </p>
                  </div>
                  {isActive && (
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${mode.dot}`} />
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Mode badge (below header) ────────────────────────────────────────────────
const ModeBadge = ({ mode }) => {
  const m = SMART_MODES.find(x => x.key === mode) ?? SMART_MODES[0];
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={mode}
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0   }}
        exit={{   opacity: 0, x:  8   }}
        transition={{ duration: 0.22 }}
        className={`flex items-center gap-2 px-3 py-1 rounded-lg border text-[10px] font-black
          uppercase tracking-widest ${m.bg} ${m.color}`}
      >
        <Target size={10} />
        <span>Mode: {m.label}</span>
        <span className="text-base leading-none ml-0.5">{m.emoji}</span>
      </motion.div>
    </AnimatePresence>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
export const FlowSyncAssistant = () => {
  const { messages, addUserMessage, addAssistantMessage, crowdData, votes, activePerk } = useStadiumData();
  const [inputValue,  setInputValue ] = useState('');
  const [isThinking,  setIsThinking ] = useState(false);
  const [smartMode,   setSmartMode  ] = useState('fastest');
  const [language,    setLanguage   ] = useState('English');
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage = inputValue;
    addUserMessage(userMessage, { mode: smartMode });
    setInputValue('');

    setIsThinking(true);
    // Silently append language instruction before sending to Gemini
    const localizedMessage = language !== 'English'
      ? `${userMessage} [SYSTEM INSTRUCTION: You must provide your entire response in ${language}.]`
      : userMessage;
    const response = await askFlowSyncAI(localizedMessage, crowdData, votes, smartMode, activePerk);
    setIsThinking(false);

    addAssistantMessage(response);
  };

  const currentMode = SMART_MODES.find(m => m.key === smartMode) ?? SMART_MODES[0];

  return (
    <div className="flex flex-col h-full glass-panel bg-slate-900/60 border-slate-700/50">

      {/* ── Header ── */}
      <div className="p-6 border-b border-white/5 bg-slate-950/20 backdrop-blur-md space-y-3">
        <div className="flex flex-wrap justify-between items-start gap-3">
          {/* Title */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 rounded-2xl border border-indigo-500/30">
              <Bot size={22} className="text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight leading-tight">FlowSync Assistant</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-indigo-400/80 font-bold uppercase tracking-widest">Predictive AI Active</span>
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[9px] text-indigo-400 font-bold uppercase">
                  <Sparkles size={10} />
                  Gemini
                </div>
              </div>
            </div>
          </div>

          {/* Controls: Language + Smart Mode dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            <LanguageDropdown selected={language} onChange={setLanguage} />
            <SmartModeDropdown selected={smartMode} onChange={setSmartMode} />
          </div>
        </div>

        {/* Active mode badge */}
        <div className="flex items-center gap-2">
          <ModeBadge mode={smartMode} />
          <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">
            AI personalised to your profile
          </span>
        </div>
      </div>

      {/* ── Message List ── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth"
      >
        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: m.role === 'user' ? 20 : -20, y: 10 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} items-start gap-3`}
            >
              {m.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center shrink-0 mt-1">
                  <Bot size={14} className="text-indigo-400" />
                </div>
              )}

              <div className={`max-w-[85%] px-5 py-4 rounded-3xl ${
                m.role === 'user'
                  ? 'bg-indigo-600/20 border border-indigo-500/30 text-indigo-50 rounded-tr-sm'
                  : 'bg-slate-800/60 border border-slate-700/50 text-slate-100 rounded-tl-sm'
              }`}>
                {/* Show mode tag on user messages */}
                {m.role === 'user' && m.mode && (() => {
                  const mm = SMART_MODES.find(x => x.key === m.mode);
                  return mm ? (
                    <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest
                      px-2 py-0.5 rounded-full border mb-2 ${mm.bg} ${mm.color}`}>
                      {mm.emoji} {mm.label}
                    </span>
                  ) : null;
                })()}

                {m.role === 'user'
                  ? <p className="text-sm leading-relaxed font-medium">{m.text}</p>
                  : <MarkdownMessage text={m.text} />
                }
                <span className="text-[10px] opacity-40 mt-2 block font-medium uppercase tracking-tighter">{m.time}</span>
              </div>

              {m.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center shrink-0 mt-1">
                  <User size={14} className="text-white" />
                </div>
              )}
            </motion.div>
          ))}

          {isThinking && (
            <motion.div
              key="thinking"
              initial={{ opacity: 0, x: -20, y: 10 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              className="flex justify-start items-start gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center shrink-0 mt-1">
                <Bot size={14} className="text-indigo-400" />
              </div>
              <div className="px-5 py-4 rounded-3xl bg-slate-800/60 border border-slate-700/50 text-slate-100 rounded-tl-sm flex items-center gap-2">
                <Loader2 size={16} className="animate-spin text-indigo-400" />
                <span className="text-sm font-medium opacity-70">
                  Computing {currentMode.emoji} {currentMode.label} strategy...
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Input ── */}
      <div className="p-6 bg-slate-950/40 backdrop-blur-xl border-t border-white/5">
        <form onSubmit={handleSubmit} className="relative group">
          <input
            type="text"
            id="flowsync-chat-input"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={`Ask FlowSync (${currentMode.label} mode)...`}
            disabled={isThinking}
            className="w-full bg-slate-900/80 border border-slate-700/80 text-white pl-5 pr-14 py-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/60 transition-all placeholder:text-slate-500 placeholder:text-sm text-sm disabled:opacity-50"
          />
          <button
            id="flowsync-send-btn"
            type="submit"
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-50"
            disabled={!inputValue.trim() || isThinking}
          >
            <Send size={18} />
          </button>
        </form>
        <p className="mt-3 text-center text-[10px] text-slate-500 uppercase font-black tracking-[0.2em]">
          Powered by FlowSync AI Engine v1.0.4
        </p>
      </div>
    </div>
  );
};
