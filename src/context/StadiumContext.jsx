import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import { calculateTPlus5 } from '../logic/PredictiveEngine';
import { computeActivePerk } from '../logic/vendorPerks';

const StadiumContext = createContext();

// ─── Initial vote state for all gates/exits ───────────────────────────────────
const INITIAL_VOTES = {
  gateA: { low: 0, medium: 0, high: 0 },
  gateB: { low: 0, medium: 0, high: 0 },
  gateC: { low: 0, medium: 0, high: 0 },
  exitX: { low: 0, medium: 0, high: 0 },
  exitY: { low: 0, medium: 0, high: 0 },
};

/**
 * getConfidence — maps a vote count to a reliability tier.
 * < 5  votes  → 'Low'    (tier 1)
 * 5–20 votes  → 'Medium' (tier 2)
 * > 20 votes  → 'High'   (tier 3)
 *
 * @param {number} totalVotes
 * @returns {{ label: string, tier: 1|2|3, color: string }}
 */
export const getConfidence = (totalVotes) => {
  if (totalVotes > 20) return { label: 'High',   tier: 3, color: 'emerald' };
  if (totalVotes >= 5) return { label: 'Medium', tier: 2, color: 'yellow'  };
  return               { label: 'Low',    tier: 1, color: 'red'     };
};

/**
 * getCrowdInsight — aggregates votes into a dominant crowd-level insight.
 * Now includes confidence scoring so the UI and AI can signal reliability.
 *
 * @param {{ low: number, medium: number, high: number }} votes
 * @returns {{ level: string, percentage: number, totalVotes: number,
 *             color: string, confidence: { label, tier, color },
 *             percentages: { low, medium, high } }}
 */
export const getCrowdInsight = (votes) => {
  const totalVotes = (votes.low ?? 0) + (votes.medium ?? 0) + (votes.high ?? 0);
  if (totalVotes === 0) {
    return {
      level: 'No Reports',
      percentage: 0,
      totalVotes: 0,
      color: 'slate',
      confidence: getConfidence(0),
      percentages: { low: 0, medium: 0, high: 0 },
    };
  }

  const percentages = {
    low:    Math.round((votes.low    / totalVotes) * 100),
    medium: Math.round((votes.medium / totalVotes) * 100),
    high:   Math.round((votes.high   / totalVotes) * 100),
  };

  // Dominant = whichever bucket has the most votes
  const dominant = Object.entries(percentages).reduce((a, b) => b[1] > a[1] ? b : a);
  const [dominantKey, dominantPct] = dominant;

  const levelMap = {
    low:    { level: 'Clear / Free', color: 'emerald' },
    medium: { level: 'Moderate',      color: 'yellow'  },
    high:   { level: 'Crowded',        color: 'red'     },
  };

  return {
    ...levelMap[dominantKey],
    percentage:  dominantPct,
    totalVotes,
    percentages,
    confidence: getConfidence(totalVotes),
  };
};

// ─── Provider ─────────────────────────────────────────────────────────────────
export const StadiumProvider = memo(({ children }) => {
  const [data, setData] = useState({
    gateA: { density: 0.2,  trend: 'stable',     predicted_density: 20 },
    gateB: { density: 0.45, trend: 'increasing',  predicted_density: 56 },
    gateC: { density: 0.12, trend: 'stable',      predicted_density: 12 },
    exitX: { density: 0.6,  trend: 'stable',      predicted_density: 60 },
    exitY: { density: 0.34, trend: 'decreasing',  predicted_density: 29 },
  });

  // ── Vote state — keyed by location id ──────────────────────────────────────
  const [votes, setVotes] = useState(INITIAL_VOTES);

  // ── Track which locations a user has already voted on (anti-spam) ──────────
  const [votedLocations, setVotedLocations] = useState(new Set());

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: "Welcome to FlowSync AI. I'm monitoring the stadium crowd levels. Predictive Intelligence Engine is online.",
      time: new Date().toLocaleTimeString(),
    },
  ]);

  // ── Crowd simulation tick ──────────────────────────────────────────────────
  const generateNewData = useCallback((prev) => {
    const nextValue = (val) => {
      const step = (Math.random() - 0.5) * 0.1;
      let newDensity = val.density + step;
      newDensity = Math.max(0, Math.min(1, newDensity));

      let trend = 'stable';
      if (newDensity > val.density + 0.02) trend = 'increasing';
      else if (newDensity < val.density - 0.02) trend = 'decreasing';

      const parsedDensity = Number(newDensity.toFixed(2));
      const predicted_density = calculateTPlus5(parsedDensity, trend);
      return { density: parsedDensity, trend, predicted_density };
    };

    return {
      gateA: nextValue(prev.gateA),
      gateB: nextValue(prev.gateB),
      gateC: nextValue(prev.gateC),
      exitX: nextValue(prev.exitX),
      exitY: nextValue(prev.exitY),
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setData((prev) => generateNewData(prev));
    }, 4000);
    return () => clearInterval(interval);
  }, [generateNewData]);

  // ── Report crowd (existing "Report Crowd" button) ─────────────────────────
  const reportCrowd = useCallback((id) => {
    setData((prev) => {
      if (!prev[id]) return prev;
      const newDensity = Math.min(1, prev[id].density + 0.1);
      return {
        ...prev,
        [id]: {
          density: newDensity,
          trend: 'increasing',
          predicted_density: calculateTPlus5(newDensity, 'increasing'),
        },
      };
    });
  }, []);

  // ── Cast a crowd vote — one vote per location per session ─────────────────
  const castVote = useCallback((locationId, voteType) => {
    // Anti-spam: already voted on this location
    if (votedLocations.has(locationId)) return false;

    setVotes((prev) => ({
      ...prev,
      [locationId]: {
        ...prev[locationId],
        [voteType]: (prev[locationId]?.[voteType] ?? 0) + 1,
      },
    }));

    setVotedLocations((prev) => new Set([...prev, locationId]));
    return true;
  }, [votedLocations]);

  // ── Pre-computed crowd insights (useMemo — updates only when votes change) ─
  const crowdInsights = useMemo(() => {
    const result = {};
    for (const [id, v] of Object.entries(votes)) {
      result[id] = getCrowdInsight(v);
    }
    return result;
  }, [votes]);

  // ── Vendor perk — recomputed on every sensor tick (crowdData change) ────────
  // useRef holds the previous perk so computeActivePerk can preserve the
  // existing 5-minute expiry when the same congestion pair is still active.
  const prevPerkRef = useRef(null);
  const activePerk = useMemo(() => {
    const perk = computeActivePerk(data, prevPerkRef.current);
    prevPerkRef.current = perk;
    return perk;
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Message helpers ───────────────────────────────────────────────────────
  const addAssistantMessage = useCallback((text) => {
    setMessages((prev) => {
      if (prev.some((m) => m.text === text)) return prev;
      return [...prev, { role: 'assistant', text, time: new Date().toLocaleTimeString() }];
    });
  }, []);

  const addUserMessage = useCallback((text, meta = {}) => {
    setMessages((prev) => [...prev, { role: 'user', text, time: new Date().toLocaleTimeString(), ...meta }]);
  }, []);

  const value = {
    crowdData:     data,
    votes,
    crowdInsights,
    votedLocations,
    castVote,
    reportCrowd,
    messages,
    addUserMessage,
    addAssistantMessage,
    activePerk,
  };

  return <StadiumContext.Provider value={value}>{children}</StadiumContext.Provider>;
});

export const useStadiumData = () => {
  const context = useContext(StadiumContext);
  if (!context) throw new Error('useStadiumData must be used within StadiumProvider');
  return context;
};
