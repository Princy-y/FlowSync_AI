import React, { memo } from 'react';
import {
  MapPin, Users, TrendingUp, TrendingDown, Minus,
  LogOut, Clock, ThumbsUp, Radio, Star, CheckCircle2, Shield, ShieldCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStadiumData } from '../context/StadiumContext';

// ─── Vote button config ───────────────────────────────────────────────────────
const VOTE_BUTTONS = [
  {
    key:     'low',
    emoji:   '🟢',
    label:   'Clear / Free',
    sub:     '🟢 Best Condition',
    ring:    'focus:ring-2 focus:ring-emerald-400',
    base:    'bg-emerald-500/15 border-emerald-500/50 text-emerald-300 shadow-[0_0_14px_rgba(16,185,129,0.22)]',
    hover:   'hover:bg-emerald-500/30 hover:border-emerald-400/80 hover:shadow-[0_0_20px_rgba(16,185,129,0.40)] hover:text-emerald-100',
    voted:   'bg-emerald-500/25 border-emerald-400/60 text-emerald-200 shadow-[0_0_16px_rgba(16,185,129,0.30)]',
    bar:     'bg-emerald-500',
    glow:    'shadow-[0_0_22px_rgba(16,185,129,0.35)]',
  },
  {
    key:     'medium',
    emoji:   '🟡',
    label:   'Moderate',
    sub:     'Medium',
    ring:    'focus:ring-yellow-500',
    base:    'bg-yellow-500/8 border-yellow-500/25 text-yellow-400',
    hover:   'hover:bg-yellow-500/18 hover:border-yellow-500/45 hover:text-yellow-300',
    voted:   'bg-yellow-500/15 border-yellow-400/40 text-yellow-300',
    bar:     'bg-yellow-500',
    glow:    '',
  },
  {
    key:     'high',
    emoji:   '🔴',
    label:   'Crowded',
    sub:     'Busy',
    ring:    'focus:ring-red-500',
    base:    'bg-red-500/8 border-red-500/25 text-red-400',
    hover:   'hover:bg-red-500/18 hover:border-red-500/45 hover:text-red-300',
    voted:   'bg-red-500/15 border-red-400/40 text-red-300',
    bar:     'bg-red-500',
    glow:    '',
  },
];

// ─── Insight display map ──────────────────────────────────────────────────────
const INSIGHT_STYLES = {
  emerald: {
    text:   'text-emerald-300',
    bg:     'bg-emerald-500/12',
    border: 'border-emerald-500/35',
    dot:    'bg-emerald-400',
    glow:   'shadow-[0_0_20px_rgba(16,185,129,0.18)]',
    label:  '🟢 Best Condition Reported',
    badge:  'Recommended Zone',
    badgeBg: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
  },
  yellow: {
    text:   'text-yellow-300',
    bg:     'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    dot:    'bg-yellow-400',
    glow:   '',
    label:  null,
    badge:  null,
  },
  red: {
    text:   'text-red-300',
    bg:     'bg-red-500/10',
    border: 'border-red-500/30',
    dot:    'bg-red-400',
    glow:   '',
    label:  null,
    badge:  null,
  },
  slate: {
    text:   'text-slate-400',
    bg:     'bg-slate-500/8',
    border: 'border-slate-600/30',
    dot:    'bg-slate-500',
    glow:   '',
    label:  null,
    badge:  null,
  },
};

// ─── Confidence badge colours ─────────────────────────────────────────────────
const CONFIDENCE_STYLES = {
  Low:    { bg: 'bg-red-500/12 border-red-500/30',     text: 'text-red-400',     dot: 'bg-red-400'     },
  Medium: { bg: 'bg-yellow-500/12 border-yellow-500/30', text: 'text-yellow-400', dot: 'bg-yellow-400' },
  High:   { bg: 'bg-emerald-500/12 border-emerald-500/30', text: 'text-emerald-400', dot: 'bg-emerald-400' },
};

// ─── Confidence pill (rendered inside insight panel) ─────────────────────────
const ConfidenceBadge = ({ confidence, totalVotes }) => {
  const s = CONFIDENCE_STYLES[confidence.label] ?? CONFIDENCE_STYLES.Low;
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border mt-2 ${s.bg}`}>
      <Shield size={10} className={s.text} />
      <span className={`text-[9px] font-black uppercase tracking-widest ${s.text}`}>
        Confidence: {confidence.label}
      </span>
      <span className="text-[9px] text-slate-500 font-bold ml-auto">
        ({totalVotes} {totalVotes === 1 ? 'report' : 'reports'})
      </span>
    </div>
  );
};

// ─── Stacked vote bar ─────────────────────────────────────────────────────────
const VoteBar = ({ percentages, totalVotes }) => {
  if (totalVotes === 0) return null;
  return (
    <div className="flex h-2 w-full rounded-full overflow-hidden gap-px mt-2.5">
      {VOTE_BUTTONS.map(({ key, bar }) =>
        (percentages[key] ?? 0) > 0 ? (
          <motion.div
            key={key}
            className={`${bar} first:rounded-l-full last:rounded-r-full`}
            initial={{ width: 0 }}
            animate={{ width: `${percentages[key]}%` }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
          />
        ) : null
      )}
    </div>
  );
};

// ─── Per-vote-type mini pill (shown in result breakdown) ─────────────────────
const VotePill = ({ btn, pct }) => (
  <div className={`flex items-center justify-between px-2 py-1 rounded-lg border ${
    pct > 0 ? `${btn.voted} opacity-90` : 'bg-slate-900/40 border-slate-700/30 opacity-40'
  }`}>
    <span className="text-[10px] font-bold">{btn.emoji} {btn.label}</span>
    <span className="text-[11px] font-black">{pct}%</span>
  </div>
);

// ─── Main GateCard ────────────────────────────────────────────────────────────
const GateCardComponent = ({ id, label, density, trend, predicted_density, onReport }) => {
  const { castVote, crowdInsights, votedLocations } = useStadiumData();

  const hasVoted    = votedLocations.has(id);
  const insight     = crowdInsights[id];
  const styles      = INSIGHT_STYLES[insight?.color ?? 'slate'];
  const confidence  = insight?.confidence ?? { label: 'Low', tier: 1, color: 'red' };

  // Only trust majority signals once we have enough data
  const hasEnoughVotes    = (insight?.totalVotes ?? 0) >= 5;

  // isClearMajority — dominant is clear with ≥50% AND enough votes
  const isClearMajority = hasEnoughVotes && insight?.color === 'emerald' && (insight?.percentage ?? 0) >= 50;

  // isVerifiedBestRoute — dominant clear >70% AND confidence = High AND enough votes
  const isVerifiedBestRoute = hasEnoughVotes
    && insight?.color === 'emerald'
    && (insight?.percentages?.low ?? 0) > 70
    && confidence.tier === 3;

  // ── Sensor-level card theming ─────────────────────────────────────────────
  let borderColor = 'border-emerald-500';
  let bgColor     = 'bg-emerald-500/10';
  let textColor   = 'text-emerald-400';
  let sensorPulse = '';

  if (density > 0.7) {
    borderColor = 'border-red-500';
    bgColor     = 'bg-red-500/10';
    textColor   = 'text-red-400';
    sensorPulse = 'animate-[pulse_1.5s_ease-in-out_infinite]';
  } else if (density >= 0.4) {
    borderColor = 'border-yellow-500';
    bgColor     = 'bg-yellow-500/10';
    textColor   = 'text-yellow-400';
  }

  // Override card border/BG with green glow if majority votes say Clear
  const cardBorder = isClearMajority ? 'border-emerald-400' : borderColor;
  const cardBg     = isClearMajority ? 'bg-emerald-500/8'  : bgColor;
  const cardGlow   = isClearMajority ? 'shadow-[0_0_24px_rgba(16,185,129,0.20)]' : 'shadow-lg';

  const isExit = id.startsWith('exit');

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border-2 backdrop-blur-md transition-all duration-500 flex flex-col
        ${cardBorder} ${cardBg} ${cardGlow} ${!isClearMajority ? sensorPulse : ''}`}
    >
      {/* ── Top section ── */}
      <div className="p-5 flex flex-col flex-1">

        {/* Header row */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            {isExit
              ? <LogOut size={16} className="opacity-80" />
              : <MapPin  size={16} className="opacity-80" />
            }
            <h3 className="font-bold text-sm tracking-wide uppercase opacity-90">{label}</h3>
          </div>
          <div className="flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-1 bg-white/10 rounded-full">
            {trend === 'increasing' && <TrendingUp   size={12} className="text-red-400"     />}
            {trend === 'decreasing' && <TrendingDown  size={12} className="text-emerald-400" />}
            {trend === 'stable'     && <Minus         size={12} className="opacity-60"       />}
            {trend}
          </div>
        </div>

        {/* Density readout + Report button */}
        <div className="flex justify-between items-end mt-2">
          <div className="flex items-baseline gap-2">
            <Users size={18} className="opacity-70 mb-1" />
            <span className={`text-4xl font-black tracking-tighter ${textColor}`}>
              {(density * 100).toFixed(0)}
              <span className="text-xl opacity-60 ml-0.5">%</span>
            </span>
          </div>
          <button
            onClick={() => onReport(id)}
            className="text-xs bg-slate-900/60 hover:bg-slate-800 active:scale-95 transition-all px-3 py-2 rounded-xl font-bold border border-white/10 hover:border-white/30 text-white uppercase tracking-widest shadow-lg"
          >
            Report Crowd
          </button>
        </div>

        {/* Badge section — Verified Best Route > Recommended Zone */}
        <AnimatePresence>
          {isVerifiedBestRoute && (
            <motion.div
              key="verified"
              initial={{ opacity: 0, scale: 0.88, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.88, y: -6 }}
              transition={{ duration: 0.35, type: 'spring', stiffness: 260, damping: 20 }}
              className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl
                bg-emerald-500/20 border border-emerald-400/60
                shadow-[0_0_24px_rgba(16,185,129,0.35)]"
            >
              <ShieldCheck size={13} className="text-emerald-300 shrink-0" fill="rgba(16,185,129,0.25)" />
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-200">
                🌟 Community Verified Best Route
              </span>
              <CheckCircle2 size={12} className="text-emerald-400 ml-auto shrink-0" />
            </motion.div>
          )}

          {!isVerifiedBestRoute && isClearMajority && (
            <motion.div
              key="recommended"
              initial={{ opacity: 0, scale: 0.9, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -4 }}
              transition={{ duration: 0.3 }}
              className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 shadow-[0_0_16px_rgba(16,185,129,0.2)]"
            >
              <Star size={12} className="text-emerald-400 shrink-0" fill="currentColor" />
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300">
                Recommended Zone
              </span>
              <CheckCircle2 size={12} className="text-emerald-400 ml-auto shrink-0" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Live Crowd Consensus section ── */}
        <div className="mt-4 space-y-2.5">

          {/* Section label */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Radio size={10} className="text-indigo-400 animate-pulse" />
              <span className="text-[9px] uppercase tracking-[0.2em] font-black text-indigo-400">
                Live Crowd Consensus
              </span>
            </div>
            {hasVoted && (
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                Voted ✓
              </span>
            )}
          </div>

          {/* Vote buttons — 3-column grid, "Clear / Free" visually emphasized as primary */}
          <div className="grid grid-cols-3 gap-1.5">
            {VOTE_BUTTONS.map((btn) => (
              <motion.button
                key={btn.key}
                whileTap={hasVoted ? {} : { scale: 0.93 }}
                whileHover={!hasVoted && btn.key === 'low' ? { scale: 1.03 } : {}}
                onClick={() => castVote(id, btn.key)}
                disabled={hasVoted}
                title={hasVoted ? 'You already reported this area' : `Mark as ${btn.label}`}
                className={`
                  relative flex flex-col items-center gap-0.5 rounded-xl border
                  text-[10px] font-black uppercase tracking-wider
                  transition-all duration-200 outline-none
                  ${btn.key === 'low'
                    ? 'py-3 px-1'   // taller for primary "Clear" option
                    : 'py-1.5 px-1'
                  }
                  ${!hasVoted
                    ? `${btn.base} ${btn.hover} ${btn.ring} cursor-pointer`
                    : `${btn.base} opacity-50 cursor-not-allowed`
                  }
                `}
              >
                {/* Primary star badge for Clear option */}
                {btn.key === 'low' && !hasVoted && (
                  <span className="absolute -top-2 -right-2 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center shadow-[0_0_8px_rgba(16,185,129,0.6)]">
                    <Star size={8} className="text-white" fill="white" />
                  </span>
                )}
                <span className={`leading-none ${btn.key === 'low' ? 'text-xl' : 'text-base'}`}>
                  {btn.emoji}
                </span>
                <span className={btn.key === 'low' ? 'text-[9px]' : ''}>
                  {btn.key === 'low' ? 'Clear / Free' : btn.label}
                </span>
                {btn.key === 'low' && (
                  <span className="text-[8px] text-emerald-400/80 font-bold normal-case tracking-normal">
                    {btn.sub}
                  </span>
                )}
              </motion.button>
            ))}
          </div>

          {/* Insight result panel — shown after votes collected */}
          <AnimatePresence>
            {insight && insight.totalVotes > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.35 }}
                className="overflow-hidden"
              >
                {/* Dominant level banner */}
                <div className={`
                  flex items-center justify-between px-3 py-2 rounded-xl border mt-0.5
                  transition-all duration-500
                  ${styles.bg} ${styles.border} ${styles.glow}
                `}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${styles.dot} shrink-0 ${
                      isClearMajority ? 'animate-pulse' : ''
                    }`} />
                    <div>
                      {/* Special label for clear majority */}
                      {isClearMajority && styles.label && (
                        <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest leading-none mb-0.5">
                          {styles.label}
                        </p>
                      )}
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={hasEnoughVotes ? `${insight.level}-${insight.percentage}` : 'insufficient'}
                          initial={{ opacity: 0, y: 3 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -3 }}
                          transition={{ duration: 0.2 }}
                          className={`text-[11px] font-black ${
                            hasEnoughVotes ? styles.text : 'text-slate-500'
                          }`}
                        >
                          {hasEnoughVotes ? (
                            <>
                              {insight.percentage}% users report area is{' '}
                              {insight.level === 'Clear / Free' ? 'clear' :
                               insight.level === 'Moderate' ? 'moderate' : 'crowded'}{' '}
                              <span className="font-normal opacity-60">
                                ({insight.totalVotes} {insight.totalVotes === 1 ? 'report' : 'reports'})
                              </span>
                            </>
                          ) : (
                            <span className="font-bold text-slate-500 normal-case tracking-normal">
                              Not enough reports
                              <span className="opacity-60 ml-1">
                                ({insight.totalVotes} of 5 needed)
                              </span>
                            </span>
                          )}
                        </motion.span>
                      </AnimatePresence>
                      {/* AI context hint — only when enough votes and clear majority */}
                      {isClearMajority && (
                        <p className="text-[8px] text-emerald-400/60 font-medium normal-case tracking-normal mt-0.5 leading-tight">
                          User reports indicate area is mostly clear
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <div className="flex items-center gap-1 text-slate-500">
                      <ThumbsUp size={10} />
                      <span className="text-[10px] font-bold">{insight.totalVotes}</span>
                    </div>
                    <span className="text-[9px] text-slate-600 font-bold">reports</span>
                  </div>
                </div>

                {/* Per-type breakdown pills + bar — only shown once data is reliable */}
                {hasEnoughVotes && (
                  <>
                    <div className="grid grid-cols-3 gap-1 mt-2">
                      {VOTE_BUTTONS.map(btn => (
                        <VotePill
                          key={btn.key}
                          btn={btn}
                          pct={insight.percentages?.[btn.key] ?? 0}
                        />
                      ))}
                    </div>

                    {/* Stacked vote bar */}
                    <VoteBar percentages={insight.percentages} totalVotes={insight.totalVotes} />
                  </>
                )}

                {/* Confidence badge — always shown so user knows data reliability */}
                <ConfidenceBadge confidence={confidence} totalVotes={insight.totalVotes} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* No votes yet placeholder */}
          {insight && insight.totalVotes === 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[10px] text-slate-600 text-center font-bold uppercase tracking-widest py-1"
            >
              No reports yet — tap to be the first
            </motion.p>
          )}
        </div>
      </div>

      {/* ── Footer: Predicted density ── */}
      <div className="flex border-t border-white/10 pt-3 w-full justify-between items-center bg-slate-950/20 px-5 pb-4 rounded-b-[14px]">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mt-1">
          <Clock size={12} className="opacity-70" /> Predicted in 5m:
        </span>
        <span className={`text-sm font-black mt-1 ${
          predicted_density > 75
            ? 'text-red-400 animate-pulse'
            : predicted_density > 40
            ? 'text-yellow-400'
            : 'text-emerald-400'
        }`}>
          {predicted_density}%
        </span>
      </div>
    </motion.div>
  );
};

export const GateCard = memo(GateCardComponent);
