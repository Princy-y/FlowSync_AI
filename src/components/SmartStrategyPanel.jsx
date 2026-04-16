import React, { useState, useMemo, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Compass, Clock, Map, CheckCircle2, Users,
  AlertTriangle, TrendingUp, ShieldCheck, Zap,
  Navigation, X, RefreshCw, Gift, Timer, ArrowRight,
} from 'lucide-react';
import { useStadiumData } from '../context/StadiumContext';
import { WhatIfSimulator } from './WhatIfSimulator';
import { useAutoReroute } from '../hooks/useAutoReroute';

// ─── Constants ────────────────────────────────────────────────────────────────
const EXIT_ROUTES = {
  exitX: 'Via North Concourse',
  exitY: 'Via South Promenade',
};

const EXIT_LABELS = {
  exitX: 'Exit X',
  exitY: 'Exit Y',
};

// ─── Stat chip for density readout ────────────────────────────────────────────
const DensityChip = ({ label, pct, color, highlight }) => (
  <div className={`flex items-center justify-between px-3 py-1.5 rounded-lg border transition-all duration-500 ${
    highlight
      ? 'bg-orange-500/15 border-orange-500/40'
      : 'bg-slate-900/60 border-slate-700/40'
  }`}>
    <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">{label}</span>
    <span className={`text-xs font-black ${color}`}>{pct}%</span>
  </div>
);

// ─── Auto-Reroute Alert Card ──────────────────────────────────────────────────
const AutoRerouteAlert = ({ reroute, onDismiss }) => (
  <motion.div
    key="reroute-alert"
    initial={{ opacity: 0, y: -12, scale: 0.96 }}
    animate={{ opacity: 1, y: 0,   scale: 1     }}
    exit={{ opacity: 0,  y: -8,    scale: 0.96  }}
    transition={{ duration: 0.35, ease: 'easeOut' }}
    className="relative overflow-hidden rounded-2xl border border-orange-500/50 bg-orange-500/8 shadow-[0_0_30px_rgba(249,115,22,0.15)]"
  >
    {/* Animated glow sweep */}
    <motion.div
      className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-500/10 to-transparent pointer-events-none"
      animate={{ x: ['-100%', '100%'] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'linear', repeatDelay: 1 }}
    />

    <div className="relative p-4">
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {/* Pulsing icon */}
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-orange-500/30 animate-ping" />
            <div className="relative p-1.5 bg-orange-500/25 rounded-full border border-orange-500/50">
              <Navigation size={13} className="text-orange-400" />
            </div>
          </div>
          <span className="text-[11px] font-black uppercase tracking-widest text-orange-400">
            ⚡ Auto-ReRouting Activated
          </span>
        </div>
        <button
          onClick={onDismiss}
          className="p-1 rounded-lg hover:bg-white/5 text-slate-500 hover:text-slate-300 transition-colors"
          title="Dismiss"
        >
          <X size={13} />
        </button>
      </div>

      {/* Alert message */}
      <p className="text-xs text-orange-100/80 leading-relaxed mb-3">
        {reroute.alertMessage}
      </p>

      {/* From → To route change */}
      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900/60 border border-slate-700/40">
        {/* Congested (from) */}
        <div className="flex-1 text-center">
          <p className="text-[9px] uppercase tracking-widest text-red-400 font-black mb-0.5">Congested</p>
          <p className="text-sm font-black text-red-300 line-through opacity-70">
            {reroute.congestedExit?.label}
          </p>
          <p className="text-[10px] text-red-400 font-bold">{reroute.congestedExit?.density}%</p>
        </div>

        {/* Arrow */}
        <motion.div
          animate={{ x: [0, 4, 0] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        >
          <RefreshCw size={16} className="text-orange-400" />
        </motion.div>

        {/* Safe (to) */}
        <div className="flex-1 text-center">
          <p className="text-[9px] uppercase tracking-widest text-emerald-400 font-black mb-0.5">Rerouted</p>
          <p className="text-sm font-black text-emerald-300">
            {reroute.rerouteExit?.label}
          </p>
          <p className="text-[10px] text-emerald-400 font-bold">{reroute.rerouteExit?.density}%</p>
        </div>
      </div>

      {/* Timestamp */}
      {reroute.timestamp && (
        <p className="mt-2 text-[9px] text-slate-600 font-bold uppercase tracking-widest text-right">
          Triggered at {reroute.timestamp.toLocaleTimeString()}
        </p>
      )}
    </div>
  </motion.div>
);

// ─── Vendor Perk Card ─────────────────────────────────────────────────────────
const VendorPerkCard = ({ perk, onDismiss }) => {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.round((perk.expiresAt - Date.now()) / 1000))
  );

  useEffect(() => {
    if (secondsLeft <= 0) { onDismiss(); return; }
    const id = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) { onDismiss(); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const mins    = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const secs    = String(secondsLeft % 60).padStart(2, '0');
  const urgency = secondsLeft < 60;

  return (
    <motion.div
      key="vendor-perk"
      initial={{ opacity: 0, y: -12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0,   scale: 1     }}
      exit={{ opacity: 0,  y: -8,    scale: 0.96  }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-2xl border border-violet-500/50
        bg-violet-500/8 shadow-[0_0_30px_rgba(139,92,246,0.18)]"
    >
      {/* Shimmer sweep */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-violet-400/8 to-transparent pointer-events-none"
        animate={{ x: ['-100%', '100%'] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'linear', repeatDelay: 1.2 }}
      />

      <div className="relative p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-violet-500/30 animate-ping" />
              <div className="relative p-1.5 bg-violet-500/25 rounded-full border border-violet-500/50">
                <Gift size={13} className="text-violet-300" />
              </div>
            </div>
            <span className="text-[11px] font-black uppercase tracking-widest text-violet-300">
              🎁 Vendor Perk Unlocked
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-black ${
              urgency
                ? 'bg-red-500/15 border-red-500/40 text-red-400 animate-pulse'
                : 'bg-violet-500/15 border-violet-500/30 text-violet-300'
            }`}>
              <Timer size={9} />
              <span>{mins}:{secs}</span>
            </div>
            <button
              onClick={onDismiss}
              className="p-1 rounded-lg hover:bg-white/5 text-slate-500 hover:text-slate-300 transition-colors"
              title="Dismiss perk"
            >
              <X size={13} />
            </button>
          </div>
        </div>

        {/* Reroute context row */}
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900/60 border border-slate-700/40 mb-3">
          <div className="flex-1 text-center">
            <p className="text-[9px] uppercase tracking-widest text-red-400 font-black mb-0.5">Heavy Traffic</p>
            <p className="text-sm font-black text-red-300">{perk.congestedZone}</p>
            <p className="text-[10px] text-red-400 font-bold">{perk.congestedPct}%</p>
          </div>
          <motion.div animate={{ x: [0, 4, 0] }} transition={{ duration: 0.9, repeat: Infinity }}>
            <ArrowRight size={16} className="text-violet-400" />
          </motion.div>
          <div className="flex-1 text-center">
            <p className="text-[9px] uppercase tracking-widest text-emerald-400 font-black mb-0.5">Reroute Here</p>
            <p className="text-sm font-black text-emerald-300">{perk.clearZone}</p>
            <p className="text-[10px] text-emerald-400 font-bold">{perk.clearPct}%</p>
          </div>
        </div>

        {/* Perk offer */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-violet-500/12 border border-violet-500/30">
          <span className="text-xl leading-none">{perk.emoji}</span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-violet-400 mb-0.5">
              {perk.vendor}
            </p>
            <p className="text-sm font-bold text-white leading-snug">{perk.offer}</p>
            <p className="text-[9px] text-violet-400/60 font-medium mt-0.5 uppercase tracking-widest">
              At {perk.clearZone} · Limited Offer
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ─── Main component ────────────────────────────────────────────────────────────
const SmartStrategyPanelComponent = () => {
  const { crowdData, votes, addAssistantMessage, activePerk } = useStadiumData();
  const [groupSize, setGroupSize] = useState(1);
  const [perkDismissed, setPerkDismissed] = useState(false);

  // Reset dismissed state whenever a new perk activates
  const perkKey = activePerk?.active
    ? `${activePerk.congestedId}-${activePerk.clearId}`
    : null;
  useEffect(() => {
    if (perkKey) setPerkDismissed(false);
  }, [perkKey]);

  const showPerk = activePerk?.active && !perkDismissed;

  // ── Auto-Reroute hook ─────────────────────────────────────────────────────
  const {
    isActive:      rerouteActive,
    rerouteExit,
    congestedExit,
    alertMessage,
    timestamp:     rerouteTimestamp,
    dismissAlert,
  } = useAutoReroute({ crowdData, votes, addAssistantMessage });

  // ── Derived values via useMemo ────────────────────────────────────────────

  /** Highest density (0–100 int) across ALL gates + exits */
  const highestDensity = useMemo(() => {
    return Object.values(crowdData).reduce((max, loc) => {
      const pct = Math.round(loc.density * 100);
      return pct > max ? pct : max;
    }, 0);
  }, [crowdData]);

  /** Group Sync Risk */
  const groupSyncRisk = useMemo(() => {
    if (groupSize > 3 && highestDensity > 70) {
      return {
        level:   'High Risk',
        message: 'High crowd pressure detected. Group cohesion at risk — alter route.',
        isHigh:  true,
      };
    }
    return {
      level:   'Safe',
      message: 'All clear. Optimal route maintains group integrity.',
      isHigh:  false,
    };
  }, [groupSize, highestDensity]);

  /** Sensor-computed best exit (lowest density) */
  const sensorExit = useMemo(() => {
    const exits = Object.entries(crowdData).filter(([key]) => key.startsWith('exit'));
    if (!exits.length) return { id: 'exitY', label: 'Exit Y', route: 'Via South Promenade', density: 0 };

    const [bestId, bestData] = exits.reduce((best, current) =>
      current[1].density < best[1].density ? current : best
    );

    return {
      id:      bestId,
      label:   EXIT_LABELS[bestId]  ?? bestId.toUpperCase(),
      route:   EXIT_ROUTES[bestId]  ?? 'Via Main Corridor',
      density: Math.round(bestData.density * 100),
    };
  }, [crowdData]);

  /**
   * activeExit — use reroute override when active, otherwise sensor-based.
   * This is the single source of truth consumed by the UI.
   */
  const activeExit = rerouteActive && rerouteExit ? rerouteExit : sensorExit;

  /** Live exit density chips */
  const exitReadouts = useMemo(() => {
    return Object.entries(crowdData)
      .filter(([key]) => key.startsWith('exit'))
      .map(([key, val]) => ({
        key,
        label:     EXIT_LABELS[key] ?? key,
        pct:       Math.round(val.density * 100),
        highlight: rerouteActive && congestedExit?.id === key,
      }));
  }, [crowdData, rerouteActive, congestedExit]);

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full glass-panel p-6 bg-slate-900/60 border-slate-700/50 relative overflow-hidden rounded-2xl">
      {/* Dot-grid watermark */}
      <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />

      {/* ── Header ── */}
      <h3 className="text-xl font-bold mb-6 flex items-center gap-3 text-white shrink-0">
        <div className={`p-2 rounded-xl border transition-all duration-500 ${
          rerouteActive
            ? 'bg-orange-500/20 border-orange-500/40'
            : 'bg-indigo-500/20 border-indigo-500/30'
        }`}>
          <Compass className={rerouteActive ? 'text-orange-400' : 'text-indigo-400'} size={20} />
        </div>
        Smart Strategy Panel
        {/* Live pulse indicator */}
        <span className="ml-auto flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              rerouteActive ? 'bg-orange-400' : 'bg-indigo-400'
            }`} />
            <span className={`relative inline-flex rounded-full h-2 w-2 ${
              rerouteActive ? 'bg-orange-500' : 'bg-indigo-500'
            }`} />
          </span>
          <span className={`text-[9px] font-black uppercase tracking-widest hidden sm:block ${
            rerouteActive ? 'text-orange-400' : 'text-indigo-400'
          }`}>
            {rerouteActive ? 'Rerouting' : 'Live'}
          </span>
        </span>
      </h3>

      <div className="space-y-4 flex-1 relative z-10 overflow-y-auto custom-scrollbar pr-1">

        {/* ── Auto-Reroute Alert (top priority slot) ── */}
        <AnimatePresence>
          {rerouteActive && rerouteExit && (
            <AutoRerouteAlert
              reroute={{ rerouteExit, congestedExit, alertMessage, timestamp: rerouteTimestamp }}
              onDismiss={dismissAlert}
            />
          )}

          {/* ── Vendor Perk Card (second priority slot) ── */}
          {showPerk && (
            <VendorPerkCard
              key={perkKey}
              perk={activePerk}
              onDismiss={() => setPerkDismissed(true)}
            />
          )}
        </AnimatePresence>

        {/* ── Group Size Input ── */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/50 flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="p-2 bg-indigo-500/20 rounded-lg shrink-0">
              <Users size={16} className="text-indigo-400" />
            </div>
            <label
              htmlFor="group-size-input"
              className="text-[11px] uppercase tracking-widest text-slate-300 font-bold"
            >
              Group Size Simulation
            </label>
          </div>
          <input
            id="group-size-input"
            type="number"
            min="1"
            max="50"
            value={groupSize}
            onChange={(e) => setGroupSize(Number(e.target.value) || 1)}
            className="w-full sm:w-20 bg-slate-950 border border-slate-700 text-white text-center py-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-bold transition-shadow"
          />
        </motion.div>

        {/* ── Group Sync Risk Card (animated swap) ── */}
        <AnimatePresence mode="wait">
          {groupSyncRisk.isHigh ? (
            <motion.div
              key="high-risk"
              initial={{ opacity: 0, scale: 0.95, y: 4 }}
              animate={{ opacity: 1, scale: 1,    y: 0 }}
              exit={{ opacity: 0,   scale: 0.95, y: -4 }}
              transition={{ duration: 0.25 }}
              className="p-4 rounded-xl bg-red-500/10 border border-red-500/40 flex items-start gap-3 shadow-[0_0_20px_rgba(239,68,68,0.15)]"
            >
              <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={18} />
              <div>
                <span className="text-[10px] uppercase tracking-widest text-red-500 font-black block mb-0.5">
                  Group Sync Risk: {groupSyncRisk.level}
                </span>
                <span className="text-sm font-semibold text-red-200">{groupSyncRisk.message}</span>
                <div className="mt-2 flex items-center gap-1.5">
                  <TrendingUp size={12} className="text-orange-400" />
                  <span className="text-[10px] text-orange-300 font-bold">
                    Peak Density: {highestDensity}%
                  </span>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="safe"
              initial={{ opacity: 0, scale: 0.95, y: 4 }}
              animate={{ opacity: 1, scale: 1,    y: 0 }}
              exit={{ opacity: 0,   scale: 0.95, y: -4 }}
              transition={{ duration: 0.25 }}
              className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3 shadow-[0_0_15px_rgba(16,185,129,0.06)]"
            >
              <ShieldCheck className="text-emerald-400 shrink-0 mt-0.5" size={18} />
              <div>
                <span className="text-[10px] uppercase tracking-widest text-emerald-500 font-black block mb-0.5">
                  Group Sync Risk: {groupSyncRisk.level}
                </span>
                <span className="text-sm font-semibold text-emerald-200">{groupSyncRisk.message}</span>
                <div className="mt-2 flex items-center gap-1.5">
                  <Zap size={12} className="text-emerald-400" />
                  <span className="text-[10px] text-emerald-300 font-bold">
                    Peak Density: {highestDensity}%
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Recommended Exit (overridden by reroute when active) ── */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className={`p-5 rounded-xl relative mt-4 shadow-lg overflow-hidden border transition-all duration-500 ${
            rerouteActive
              ? 'bg-orange-500/8 border-orange-500/40 shadow-[0_0_25px_rgba(249,115,22,0.12)]'
              : 'bg-indigo-500/10 border-indigo-500/30'
          }`}
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <CheckCircle2 size={50} />
          </div>

          <div className="flex items-center gap-2 mb-2">
            <span className={`text-[10px] uppercase tracking-widest font-bold ${
              rerouteActive ? 'text-orange-400' : 'text-indigo-400'
            }`}>
              {rerouteActive ? '⚡ Auto-Rerouted Exit' : 'Recommended Exit'}
            </span>
            {rerouteActive && (
              <span className="px-1.5 py-0.5 rounded-full bg-orange-500/20 border border-orange-500/30 text-[9px] text-orange-400 font-black uppercase tracking-wider animate-pulse">
                Active
              </span>
            )}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeExit.id + (rerouteActive ? '-rerouted' : '-sensor')}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3 }}
              className="text-2xl font-black flex items-center gap-3 text-white"
            >
              <CheckCircle2
                className={`shrink-0 ${rerouteActive ? 'text-orange-400' : 'text-emerald-500'}`}
                size={24}
              />
              {activeExit.label}
              <span className={`ml-auto text-sm font-bold px-2 py-0.5 rounded-lg border ${
                rerouteActive
                  ? 'text-orange-400 bg-orange-500/10 border-orange-500/20'
                  : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
              }`}>
                {activeExit.density}%
              </span>
            </motion.div>
          </AnimatePresence>

          {/* Live exit density strip — congested exit highlighted in orange */}
          <div className="mt-3 space-y-1.5">
            {exitReadouts.map(({ key, label, pct, highlight }) => (
              <DensityChip
                key={key}
                label={label}
                pct={pct}
                highlight={highlight}
                color={
                  highlight
                    ? 'text-orange-400'
                    : pct < 40
                    ? 'text-emerald-400'
                    : pct < 70
                    ? 'text-yellow-400'
                    : 'text-red-400'
                }
              />
            ))}
          </div>
        </motion.div>

        {/* ── Optimal Route ── */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className={`p-5 rounded-xl shadow-lg border transition-all duration-500 ${
            rerouteActive
              ? 'bg-orange-500/5 border-orange-500/25'
              : 'bg-slate-800/40 border-slate-700/50'
          }`}
        >
          <span className={`text-[10px] uppercase tracking-widest font-bold block mb-2 ${
            rerouteActive ? 'text-orange-400/80' : 'text-slate-400'
          }`}>
            Optimal Route
          </span>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeExit.route}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.3 }}
              className="text-lg font-bold flex items-center gap-3 text-slate-200"
            >
              <Map className={`shrink-0 ${rerouteActive ? 'text-orange-400' : 'text-blue-400'}`} size={20} />
              {activeExit.route}
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* ── Best Departure Window ── */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="p-5 rounded-xl bg-slate-800/40 border border-slate-700/50 shadow-lg"
        >
          <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold block mb-2">
            Best Departure Window
          </span>
          <div className="text-lg font-bold flex items-center gap-3 text-slate-200">
            <Clock className="text-yellow-400 shrink-0" size={20} />
            T+15 Minutes{' '}
            <span className="opacity-50 font-medium text-xs">(Post-Rush)</span>
          </div>
        </motion.div>

        {/* ── What-If Simulation Engine ── */}
        <WhatIfSimulator groupSize={groupSize} />

      </div>
    </div>
  );
};

export const SmartStrategyPanel = memo(SmartStrategyPanelComponent);
