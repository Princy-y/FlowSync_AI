import React, { useState, useMemo, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FlaskConical,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  ShieldCheck,
  Zap,
  Bot,
  Loader2,
  Star,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useStadiumData } from '../context/StadiumContext';
import { askFlowSyncAI } from '../logic/geminiApi';

// ─── Time offsets ─────────────────────────────────────────────────────────────
const TIME_SLOTS = [
  { key: 'now',    label: 'Now',        minutes: 0  },
  { key: 'plus5',  label: '+5 Minutes', minutes: 5  },
  { key: 'plus10', label: '+10 Minutes',minutes: 10 },
];

// ─── Congestion level thresholds ─────────────────────────────────────────────
const getCongestionLevel = (pct) => {
  if (pct >= 85) return { label: 'Very High',      emoji: '🚨', color: 'text-red-400',    bg: 'bg-red-500/15',    border: 'border-red-500/40',    dot: 'bg-red-500'    };
  if (pct >= 70) return { label: 'High Congestion',emoji: '⚠️', color: 'text-orange-400', bg: 'bg-orange-500/15', border: 'border-orange-500/40', dot: 'bg-orange-500' };
  if (pct >= 30) return { label: 'Moderate',       emoji: '🟡', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', dot: 'bg-yellow-500' };
  return           { label: 'Low',           emoji: '✅', color: 'text-emerald-400', bg: 'bg-emerald-500/10',border: 'border-emerald-500/30',dot: 'bg-emerald-500'};
};

// ─── Core simulation engine ───────────────────────────────────────────────────
/**
 * predictScenario — applies time-based density growth/decay vectors.
 * @param {number} baseDensity  float 0–1
 * @param {string} trend        'increasing' | 'stable' | 'decreasing'
 * @param {number} minutes      time offset (0, 5, 10)
 * @returns {number} predicted density % (0–100, integer)
 */
const predictScenario = (baseDensity, trend, minutes) => {
  if (minutes === 0) return Math.round(baseDensity * 100);

  const steps = minutes / 5; // number of 5-min ticks
  let density = baseDensity;

  for (let i = 0; i < steps; i++) {
    if (trend === 'increasing') {
      // 10–25% growth vector per tick, weighted by current saturation
      const growthRate = 0.10 + (0.15 * density); // higher density → slower growth
      density = density * (1 + growthRate);
    } else if (trend === 'decreasing') {
      // 8–15% decay per tick
      const decayRate = 0.08 + (0.07 * (1 - density));
      density = density * (1 - decayRate);
    } else {
      // stable: subtle random variance ±2%
      density = density * (1 + (Math.random() - 0.5) * 0.04);
    }
  }

  return Math.min(100, Math.max(0, Math.round(density * 100)));
};

// ─── Group risk evaluation ───────────────────────────────────────────────────
const evalGroupRisk = (groupSize, predictedPct) => {
  if (groupSize > 4 && predictedPct > 70) {
    return { label: 'High Risk of Group Splitting', isHigh: true };
  }
  return { label: 'Group Movement Stable', isHigh: false };
};

// ─── Optimal decision logic ──────────────────────────────────────────────────
const getOptimalDecision = (scenarios) => {
  // Find the time slot where the recommended exit has the lowest predicted density
  let best = scenarios[0];
  for (const s of scenarios) {
    if (s.bestExitDensity < best.bestExitDensity) best = s;
  }

  const nowDensity = scenarios[0].bestExitDensity;
  if (best.timeKey === 'now') {
    return { recommendation: 'Leave Now', detail: 'Current flow is optimal — act immediately.' };
  }
  if (best.timeKey === 'plus5') {
    return { recommendation: 'Wait 5 Minutes', detail: 'Flow improves shortly — brief hold recommended.' };
  }
  return { recommendation: 'Wait 10 Minutes', detail: 'Crowd will clear significantly — delay departure.' };
};

// ─── Sub-components ──────────────────────────────────────────────────────────

const CongestionBadge = ({ pct }) => {
  const level = getCongestionLevel(pct);
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${level.bg} ${level.border} border ${level.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${level.dot} inline-block`} />
      {level.label} ({pct}%)
    </span>
  );
};

const TrendIcon = ({ trend }) => {
  if (trend === 'increasing') return <TrendingUp size={12} className="text-red-400" />;
  if (trend === 'decreasing') return <TrendingDown size={12} className="text-emerald-400" />;
  return <Minus size={12} className="text-slate-400" />;
};

// ─── Main WhatIfSimulator component ─────────────────────────────────────────
const WhatIfSimulatorComponent = ({ groupSize }) => {
  const { crowdData, votes, addAssistantMessage, addUserMessage } = useStadiumData();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [aiSummary, setAiSummary] = useState(null);

  // ── Compute scenarios for all time slots ────────────────────────────────────
  const scenarios = useMemo(() => {
    // Exits only
    const exits = Object.entries(crowdData).filter(([k]) => k.startsWith('exit'));

    return TIME_SLOTS.map(({ key, label, minutes }) => {
      // Predict density for every exit at this time offset
      const exitPredictions = exits.map(([id, loc]) => {
        const predictedPct = predictScenario(loc.density, loc.trend, minutes);
        const level = getCongestionLevel(predictedPct);
        return { id, label: id === 'exitX' ? 'Exit X' : 'Exit Y', predictedPct, level, trend: loc.trend };
      });

      // Best exit = lowest predicted density
      const bestExit = exitPredictions.reduce((a, b) => a.predictedPct < b.predictedPct ? a : b);
      const groupRisk = evalGroupRisk(groupSize, bestExit.predictedPct);

      return { timeKey: key, timeLabel: label, exitPredictions, bestExit, bestExitDensity: bestExit.predictedPct, groupRisk };
    });
  }, [crowdData, groupSize]);

  // ── Optimal decision ──────────────────────────────────────────────────────
  const optimalDecision = useMemo(() => getOptimalDecision(scenarios), [scenarios]);

  // ── AI summary handler ────────────────────────────────────────────────────
  const handleAskAI = useCallback(async () => {
    setIsAiThinking(true);
    setAiSummary(null);

    const simPayload = scenarios.map(s =>
      `${s.timeLabel}: Best exit is ${s.bestExit.label} at ${s.bestExitDensity}% (${s.bestExit.level.label}). Group risk: ${s.groupRisk.label}.`
    ).join(' | ');

    const prompt = `What-If Simulation Results: ${simPayload}. Group size: ${groupSize}. Optimal decision: ${optimalDecision.recommendation}. Based on these predictions, summarize the best crowd evacuation strategy in 2–3 concise sentences.`;

    addUserMessage(`[Simulation Query] ${prompt}`);
    const response = await askFlowSyncAI(prompt, crowdData, votes);
    setIsAiThinking(false);
    setAiSummary(response);
    addAssistantMessage(response);
  }, [scenarios, groupSize, optimalDecision, crowdData, votes, addUserMessage, addAssistantMessage]);

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className="rounded-2xl bg-slate-900/70 border border-violet-500/25 shadow-[0_0_30px_rgba(139,92,246,0.08)] overflow-hidden"
    >
      {/* ── Section header (collapsible) ── */}
      <button
        onClick={() => setIsExpanded(p => !p)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-violet-500/20 rounded-lg border border-violet-500/30 group-hover:border-violet-400/50 transition-colors">
            <FlaskConical size={16} className="text-violet-400" />
          </div>
          <div className="text-left">
            <span className="text-sm font-black text-white tracking-tight">🔮 What-If Simulation</span>
            <p className="text-[10px] text-violet-400/70 font-bold uppercase tracking-widest mt-0.5">Predictive Scenario Engine</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Pulse badge */}
          <span className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-[9px] font-black text-violet-400 uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse inline-block" />
            Live
          </span>
          {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="sim-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4">

              {/* ── Optimal Decision Banner ── */}
              <motion.div
                key={optimalDecision.recommendation}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35 }}
                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gradient-to-r from-violet-500/15 to-indigo-500/10 border border-violet-500/30"
              >
                <div className="flex items-center gap-2">
                  <Star size={14} className="text-yellow-400 shrink-0" fill="currentColor" />
                  <span className="text-[10px] uppercase tracking-widest text-violet-300 font-black">Optimal Decision</span>
                </div>
                <div className="flex items-center gap-2">
                  <ArrowRight size={13} className="text-violet-400" />
                  <span className="text-sm font-black text-white">{optimalDecision.recommendation}</span>
                </div>
              </motion.div>

              {/* ── Comparison Table ── */}
              <div className="overflow-x-auto rounded-xl border border-slate-700/50">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-700/50 bg-slate-800/60">
                      <th className="px-3 py-2.5 text-left text-[10px] uppercase tracking-widest text-slate-400 font-black">Time</th>
                      <th className="px-3 py-2.5 text-left text-[10px] uppercase tracking-widest text-slate-400 font-black">Best Exit</th>
                      <th className="px-3 py-2.5 text-left text-[10px] uppercase tracking-widest text-slate-400 font-black">Crowd Level</th>
                      <th className="px-3 py-2.5 text-center text-[10px] uppercase tracking-widest text-slate-400 font-black">Group</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scenarios.map((s, i) => {
                      const isOptimal = s.timeKey === (
                        optimalDecision.recommendation === 'Leave Now' ? 'now' :
                        optimalDecision.recommendation === 'Wait 5 Minutes' ? 'plus5' : 'plus10'
                      );
                      return (
                        <motion.tr
                          key={s.timeKey}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.07 }}
                          className={`border-b border-slate-700/30 transition-colors ${
                            isOptimal
                              ? 'bg-violet-500/10 border-l-2 border-l-violet-500'
                              : 'hover:bg-slate-800/30'
                          }`}
                        >
                          {/* Time */}
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-1.5">
                              {isOptimal && <Star size={10} className="text-yellow-400 shrink-0" fill="currentColor" />}
                              <span className={`font-black ${isOptimal ? 'text-violet-300' : 'text-slate-300'}`}>
                                {s.timeLabel}
                              </span>
                            </div>
                          </td>

                          {/* Best exit */}
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-1">
                              <TrendIcon trend={s.bestExit.trend} />
                              <span className="text-slate-200 font-bold">{s.bestExit.label}</span>
                            </div>
                          </td>

                          {/* Crowd level badge */}
                          <td className="px-3 py-3">
                            <AnimatePresence mode="wait">
                              <motion.div
                                key={`${s.timeKey}-${s.bestExitDensity}`}
                                initial={{ opacity: 0, y: 3 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -3 }}
                                transition={{ duration: 0.2 }}
                              >
                                <CongestionBadge pct={s.bestExitDensity} />
                              </motion.div>
                            </AnimatePresence>
                          </td>

                          {/* Group risk */}
                          <td className="px-3 py-3 text-center">
                            {s.groupRisk.isHigh
                              ? <AlertTriangle size={14} className="text-red-400 mx-auto" />
                              : <ShieldCheck size={14} className="text-emerald-400 mx-auto" />
                            }
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ── Per-exit detail rows ── */}
              <div className="space-y-2">
                {scenarios.map((s) => (
                  <div key={s.timeKey} className="space-y-1">
                    <div className="flex items-center gap-1.5 px-1">
                      <Clock size={10} className="text-slate-500" />
                      <span className="text-[10px] uppercase tracking-widest text-slate-500 font-black">{s.timeLabel}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {s.exitPredictions.map(ep => (
                        <div
                          key={ep.id}
                          className={`flex items-center justify-between px-3 py-2 rounded-lg border ${ep.level.bg} ${ep.level.border}`}
                        >
                          <span className="text-[10px] font-bold text-slate-300">{ep.label}</span>
                          <span className={`text-[11px] font-black ${ep.level.color}`}>{ep.predictedPct}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Group risk summary ── */}
              <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/40 flex items-center gap-2">
                {scenarios[scenarios.length - 1].groupRisk.isHigh
                  ? <AlertTriangle size={14} className="text-red-400 shrink-0" />
                  : <Zap size={14} className="text-emerald-400 shrink-0" />
                }
                <span className="text-[11px] text-slate-300 font-bold">
                  {scenarios[scenarios.length - 1].groupRisk.label}
                  <span className="text-slate-500 font-normal"> (at +10 min, group of {groupSize})</span>
                </span>
              </div>

              {/* ── Optimal detail tag ── */}
              <p className="text-[11px] text-slate-400 px-1 leading-relaxed">
                <span className="text-violet-400 font-black">{optimalDecision.recommendation}:</span>{' '}
                {optimalDecision.detail}
              </p>

              {/* ── AI Strategy Button ── */}
              <button
                onClick={handleAskAI}
                disabled={isAiThinking}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600/20 border border-indigo-500/40 hover:bg-indigo-600/30 hover:border-indigo-400/60 text-indigo-300 text-xs font-black uppercase tracking-wider transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAiThinking
                  ? <><Loader2 size={14} className="animate-spin" /> Computing Strategy...</>
                  : <><Bot size={14} /> Ask AI to Summarize Strategy</>
                }
              </button>

              {/* ── AI Response inline preview ── */}
              <AnimatePresence>
                {aiSummary && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.3 }}
                    className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/20 text-xs text-indigo-100 leading-relaxed"
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Bot size={11} className="text-indigo-400" />
                      <span className="text-[9px] uppercase tracking-widest text-indigo-400 font-black">AI Strategy Summary</span>
                    </div>
                    {aiSummary}
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export const WhatIfSimulator = memo(WhatIfSimulatorComponent);
