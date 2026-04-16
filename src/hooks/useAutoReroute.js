import { useState, useEffect, useRef, useCallback } from 'react';
import { askFlowSyncAI } from '../logic/geminiApi';

// ─── Config constants ─────────────────────────────────────────────────────────
const CONGESTION_THRESHOLD  = 0.80; // 80% density triggers reroute
const REROUTE_COOLDOWN_MS   = 30_000; // 30 s between repeated triggers
const ALERT_VISIBLE_MS      = 20_000; // auto-dismiss alert after 20 s

const EXIT_LABELS = { exitX: 'Exit X', exitY: 'Exit Y' };
const EXIT_ROUTES = { exitX: 'Via North Concourse', exitY: 'Via South Promenade' };

// ─── Best safe exit selector ──────────────────────────────────────────────────
/**
 * From all exits, pick the one that:
 *   1. Is NOT the congested exit
 *   2. Has lowest density
 *   3. Prefers stable/decreasing trend
 */
const pickSafeExit = (crowdData, congestedId) => {
  const exits = Object.entries(crowdData).filter(([k]) => k.startsWith('exit'));

  // Score: lower density = better; bonus for stable/decreasing
  const scored = exits
    .filter(([id]) => id !== congestedId)
    .map(([id, loc]) => {
      const trendBonus = loc.trend === 'decreasing' ? -5 : loc.trend === 'stable' ? -2 : 0;
      return { id, loc, score: Math.round(loc.density * 100) + trendBonus };
    })
    .sort((a, b) => a.score - b.score);

  if (!scored.length) return null;

  const { id, loc } = scored[0];
  return {
    id,
    label:   EXIT_LABELS[id]  ?? id.toUpperCase(),
    route:   EXIT_ROUTES[id]  ?? 'Via Main Corridor',
    density: Math.round(loc.density * 100),
    trend:   loc.trend,
  };
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
/**
 * useAutoReroute
 *
 * Monitors crowdData on every update.
 * Returns:
 *   {
 *     isActive       : boolean          — reroute currently in effect
 *     rerouteExit    : object | null    — the new recommended exit
 *     congestedExit  : object | null    — the exit that triggered the reroute
 *     alertMessage   : string           — human-readable alert text
 *     timestamp      : Date | null      — when the last reroute fired
 *     dismissAlert   : () => void       — manually dismiss
 *   }
 */
export const useAutoReroute = ({ crowdData, votes = {}, addAssistantMessage }) => {
  const [rerouteState, setRerouteState] = useState({
    isActive:      false,
    rerouteExit:   null,
    congestedExit: null,
    alertMessage:  '',
    timestamp:     null,
  });

  // Refs — survive renders, never trigger re-renders
  const lastTriggerTimeRef   = useRef(0);          // epoch ms of last trigger
  const lastCongestedIdRef   = useRef(null);        // id of the last congested exit
  const dismissTimerRef      = useRef(null);        // auto-dismiss setTimeout id
  const prevCrowdDataRef     = useRef(crowdData);   // previous snapshot for delta guard

  // ── Dismiss helper ────────────────────────────────────────────────────────
  const dismissAlert = useCallback(() => {
    clearTimeout(dismissTimerRef.current);
    setRerouteState(prev => ({ ...prev, isActive: false }));
  }, []);

  // ── Main monitoring effect ────────────────────────────────────────────────
  useEffect(() => {
    const now = Date.now();

    // 1. Check if trigger condition is met — any exit >80% AND increasing
    const exits = Object.entries(crowdData).filter(([k]) => k.startsWith('exit'));

    const congestedEntry = exits.find(
      ([, loc]) => loc.density > CONGESTION_THRESHOLD && loc.trend === 'increasing'
    );

    if (!congestedEntry) {
      // No congestion — if it was active from the same exit before, keep the alert
      // visible until it auto-dismisses (don't kill it prematurely)
      prevCrowdDataRef.current = crowdData;
      return;
    }

    const [congestedId, congestedLoc] = congestedEntry;
    const congestedDensityPct = Math.round(congestedLoc.density * 100);

    // 2. Cooldown guard — don't re-trigger the same exit within 30 s
    const isSameExit  = lastCongestedIdRef.current === congestedId;
    const inCooldown  = now - lastTriggerTimeRef.current < REROUTE_COOLDOWN_MS;

    if (isSameExit && inCooldown) {
      prevCrowdDataRef.current = crowdData;
      return;
    }

    // 3. Significance guard — only act if density moved by >3% vs last snapshot
    const prevDensity = prevCrowdDataRef.current?.[congestedId]?.density ?? 0;
    if (isSameExit && Math.abs(congestedLoc.density - prevDensity) < 0.03) {
      prevCrowdDataRef.current = crowdData;
      return;
    }

    // 4. Pick the safest alternative exit
    const safeExit = pickSafeExit(crowdData, congestedId);
    if (!safeExit) {
      prevCrowdDataRef.current = crowdData;
      return;
    }

    const congestedLabel = EXIT_LABELS[congestedId] ?? congestedId.toUpperCase();
    const alertMessage = `${congestedLabel} congestion rose to ${congestedDensityPct}%. Switching to ${safeExit.label} for smoother flow.`;

    // 5. Fire reroute
    lastTriggerTimeRef.current  = now;
    lastCongestedIdRef.current  = congestedId;
    prevCrowdDataRef.current    = crowdData;

    setRerouteState({
      isActive:      true,
      rerouteExit:   safeExit,
      congestedExit: {
        id:      congestedId,
        label:   congestedLabel,
        density: congestedDensityPct,
        trend:   congestedLoc.trend,
      },
      alertMessage,
      timestamp: new Date(),
    });

    // 6. Auto-dismiss after 20 s
    clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = setTimeout(() => {
      setRerouteState(prev => ({ ...prev, isActive: false }));
    }, ALERT_VISIBLE_MS);

    // 7. Fire AI context injection (non-blocking)
    if (addAssistantMessage) {
      const aiPrompt = `⚡ System auto-rerouted due to congestion spike. ${alertMessage} Based on this, confirm the recommended action for the operator.`;
      askFlowSyncAI(aiPrompt, crowdData, votes)
        .then(response => addAssistantMessage(response))
        .catch(() => {});
    }
  }, [crowdData]); // eslint-disable-line react-hooks/exhaustive-deps
  // Note: intentionally only depend on crowdData (4-second tick).
  // votes / addAssistantMessage are captured via closure refs to avoid stale-closure loops.

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => () => clearTimeout(dismissTimerRef.current), []);

  return { ...rerouteState, dismissAlert };
};
