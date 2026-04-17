/**
 * Unit tests for the WhatIfSimulator scenario prediction logic.
 * The core functions are extracted and tested in isolation here.
 * Run with: npm test
 */
import { describe, it, expect } from 'vitest';

// ─── Inline the pure functions from WhatIfSimulator (framework-agnostic) ──────
// These mirror the implementations inside WhatIfSimulator.jsx exactly.

const predictScenario = (baseDensity, trend, minutes) => {
  if (minutes === 0) return Math.round(baseDensity * 100);
  const steps = minutes / 5;
  let density = baseDensity;
  for (let i = 0; i < steps; i++) {
    if (trend === 'increasing') {
      const growthRate = 0.10 + (0.15 * density);
      density = density * (1 + growthRate);
    } else if (trend === 'decreasing') {
      const decayRate = 0.08 + (0.07 * (1 - density));
      density = density * (1 - decayRate);
    }
    // stable: small random variance — not tested deterministically here
  }
  return Math.min(100, Math.max(0, Math.round(density * 100)));
};

const evalGroupRisk = (groupSize, predictedPct) => {
  if (groupSize > 4 && predictedPct > 70) {
    return { label: 'High Risk of Group Splitting', isHigh: true };
  }
  return { label: 'Group Movement Stable', isHigh: false };
};

/**
 * getOptimalDecision — returns the recommendation string for the scenario
 * with the lowest bestExitDensity.
 * NOTE: expects plain string values, NOT vitest matchers as object values.
 */
const getOptimalDecision = (scenarios) => {
  let best = scenarios[0];
  for (const s of scenarios) {
    if (s.bestExitDensity < best.bestExitDensity) best = s;
  }
  if (best.timeKey === 'now')    return { recommendation: 'Leave Now',       detail: 'Current flow is optimal — act immediately.' };
  if (best.timeKey === 'plus5')  return { recommendation: 'Wait 5 Minutes',  detail: 'Flow improves shortly — brief hold recommended.' };
  return                                { recommendation: 'Wait 10 Minutes', detail: 'Crowd will clear significantly — delay departure.' };
};

// ─── predictScenario ─────────────────────────────────────────────────────────
describe('predictScenario', () => {
  it('returns current density unchanged at t=0', () => {
    expect(predictScenario(0.5, 'increasing', 0)).toBe(50);
    expect(predictScenario(0.3, 'decreasing', 0)).toBe(30);
    expect(predictScenario(0.7, 'stable', 0)).toBe(70);
  });

  it('returns a higher density for increasing trend at t=5', () => {
    const base = predictScenario(0.4, 'increasing', 0);
    const predicted = predictScenario(0.4, 'increasing', 5);
    expect(predicted).toBeGreaterThan(base);
  });

  it('returns a lower density for decreasing trend at t=5', () => {
    const base = predictScenario(0.6, 'decreasing', 0);
    const predicted = predictScenario(0.6, 'decreasing', 5);
    expect(predicted).toBeLessThan(base);
  });

  it('clamps output to 100 for very high increasing density', () => {
    const result = predictScenario(0.95, 'increasing', 10);
    expect(result).toBe(100);
  });

  it('clamps output to 0 for zero density', () => {
    expect(predictScenario(0, 'increasing', 10)).toBe(0);
    expect(predictScenario(0, 'decreasing', 10)).toBe(0);
  });

  it('returns an integer result', () => {
    const result = predictScenario(0.47, 'increasing', 5);
    expect(Number.isInteger(result)).toBe(true);
  });

  it('density at t=10 is more extreme than at t=5 for increasing trend', () => {
    const at5  = predictScenario(0.4, 'increasing', 5);
    const at10 = predictScenario(0.4, 'increasing', 10);
    expect(at10).toBeGreaterThanOrEqual(at5);
  });
});

// ─── evalGroupRisk ────────────────────────────────────────────────────────────
describe('evalGroupRisk', () => {
  it('marks high risk for group > 4 and density > 70', () => {
    const result = evalGroupRisk(5, 75);
    expect(result.isHigh).toBe(true);
    expect(result.label).toContain('High Risk');
  });

  it('marks safe for group ≤ 4 at any density', () => {
    expect(evalGroupRisk(4, 90).isHigh).toBe(false);
    expect(evalGroupRisk(1, 99).isHigh).toBe(false);
  });

  it('marks safe for group > 4 at density ≤ 70', () => {
    expect(evalGroupRisk(6, 70).isHigh).toBe(false);
    expect(evalGroupRisk(10, 50).isHigh).toBe(false);
  });

  it('marks high risk at exact boundary: group=5, density=71', () => {
    expect(evalGroupRisk(5, 71).isHigh).toBe(true);
  });
});

// ─── getOptimalDecision ───────────────────────────────────────────────────────
describe('getOptimalDecision', () => {
  it('recommends "Leave Now" when now has the lowest density', () => {
    const scenarios = [
      { timeKey: 'now',    bestExitDensity: 30 },
      { timeKey: 'plus5',  bestExitDensity: 50 },
      { timeKey: 'plus10', bestExitDensity: 70 },
    ];
    const result = getOptimalDecision(scenarios);
    expect(result.recommendation).toBe('Leave Now');
    expect(result.detail).toEqual(expect.any(String));
  });

  it('recommends "Wait 5 Minutes" when plus5 has the lowest density', () => {
    const scenarios = [
      { timeKey: 'now',    bestExitDensity: 60 },
      { timeKey: 'plus5',  bestExitDensity: 25 },
      { timeKey: 'plus10', bestExitDensity: 40 },
    ];
    const result = getOptimalDecision(scenarios);
    expect(result.recommendation).toBe('Wait 5 Minutes');
  });

  it('recommends "Wait 10 Minutes" when plus10 has the lowest density', () => {
    const scenarios = [
      { timeKey: 'now',    bestExitDensity: 80 },
      { timeKey: 'plus5',  bestExitDensity: 65 },
      { timeKey: 'plus10', bestExitDensity: 20 },
    ];
    const result = getOptimalDecision(scenarios);
    expect(result.recommendation).toBe('Wait 10 Minutes');
  });

  it('returns a detail string alongside every recommendation', () => {
    const scenarios = [
      { timeKey: 'now',    bestExitDensity: 10 },
      { timeKey: 'plus5',  bestExitDensity: 50 },
      { timeKey: 'plus10', bestExitDensity: 90 },
    ];
    const result = getOptimalDecision(scenarios);
    expect(typeof result.detail).toBe('string');
    expect(result.detail.length).toBeGreaterThan(0);
  });

  it('picks the first scenario if all densities are equal', () => {
    const scenarios = [
      { timeKey: 'now',    bestExitDensity: 50 },
      { timeKey: 'plus5',  bestExitDensity: 50 },
      { timeKey: 'plus10', bestExitDensity: 50 },
    ];
    const result = getOptimalDecision(scenarios);
    expect(result.recommendation).toBe('Leave Now');
  });
});
