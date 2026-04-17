/**
 * Unit tests for logic/PredictiveEngine.js — calculateTPlus5 & calculateGroupRisk
 * Run with: npm test
 */
import { describe, it, expect } from 'vitest';
import { calculateTPlus5, calculateGroupRisk } from '../logic/PredictiveEngine';

// ─── calculateTPlus5 ──────────────────────────────────────────────────────────
describe('calculateTPlus5', () => {
  it('applies 25% growth for increasing trend', () => {
    // 0.4 * 100 = 40 → 40 * 1.25 = 50
    expect(calculateTPlus5(0.4, 'increasing')).toBe(50);
  });

  it('also applies growth for legacy "rising" trend alias', () => {
    expect(calculateTPlus5(0.4, 'rising')).toBe(50);
  });

  it('applies 15% decay for decreasing trend', () => {
    // 0.4 * 100 = 40 → 40 * 0.85 = 34
    expect(calculateTPlus5(0.4, 'decreasing')).toBe(34);
  });

  it('also applies decay for legacy "falling" trend alias', () => {
    expect(calculateTPlus5(0.4, 'falling')).toBe(34);
  });

  it('returns unchanged value for stable trend', () => {
    // 0.5 * 100 = 50 → no multiplier
    expect(calculateTPlus5(0.5, 'stable')).toBe(50);
  });

  it('clamps output to 100 for very dense increasing zones', () => {
    // 0.95 * 100 = 95 → 95 * 1.25 = 118.75 → clamped to 100
    expect(calculateTPlus5(0.95, 'increasing')).toBe(100);
  });

  it('clamps output to 0 for zero density', () => {
    expect(calculateTPlus5(0, 'increasing')).toBe(0);
    expect(calculateTPlus5(0, 'decreasing')).toBe(0);
    expect(calculateTPlus5(0, 'stable')).toBe(0);
  });

  it('rounds the result to an integer', () => {
    const result = calculateTPlus5(0.3, 'increasing');
    expect(Number.isInteger(result)).toBe(true);
  });

  it('handles full density (1.0) correctly', () => {
    expect(calculateTPlus5(1.0, 'stable')).toBe(100);
  });
});

// ─── calculateGroupRisk ───────────────────────────────────────────────────────
describe('calculateGroupRisk', () => {
  it('returns High Risk object for large group at high density', () => {
    const result = calculateGroupRisk(5, 80);
    expect(result).toMatchObject({
      status: 'High Risk',
      message: expect.any(String),
    });
  });

  it('returns Safe for small group even at high density', () => {
    // groupSize ≤ 4 → always Safe regardless of density
    const result = calculateGroupRisk(4, 90);
    expect(result).toBe('Safe');
  });

  it('returns Safe for large group at low density', () => {
    // density ≤ 75 → always Safe
    const result = calculateGroupRisk(10, 75);
    expect(result).toBe('Safe');
  });

  it('returns Safe for small group at low density', () => {
    const result = calculateGroupRisk(2, 30);
    expect(result).toBe('Safe');
  });

  it('triggers High Risk exactly at boundary: group=5, density=76', () => {
    const result = calculateGroupRisk(5, 76);
    expect(result).toMatchObject({ status: 'High Risk' });
  });
});
