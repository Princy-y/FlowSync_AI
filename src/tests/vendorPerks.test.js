/**
 * Unit tests for logic/vendorPerks.js — computeActivePerk
 * Run with: npm test
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { computeActivePerk } from '../logic/vendorPerks';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const makeCrowdData = (overrides = {}) => ({
  gateA: { density: 0.2,  trend: 'stable'     },
  gateB: { density: 0.3,  trend: 'stable'     },
  gateC: { density: 0.2,  trend: 'stable'     },
  exitX: { density: 0.25, trend: 'stable'     },
  exitY: { density: 0.2,  trend: 'stable'     },
  ...overrides,
});

// ─── computeActivePerk ────────────────────────────────────────────────────────
describe('computeActivePerk', () => {
  it('returns { active: false } when no location exceeds 80% density', () => {
    const data = makeCrowdData();
    const result = computeActivePerk(data, null);
    expect(result.active).toBe(false);
  });

  it('returns { active: false } when dense location exists but no clear (<30%) alternative', () => {
    const data = makeCrowdData({
      gateA: { density: 0.85, trend: 'increasing' },
      gateB: { density: 0.5,  trend: 'stable'     },
      gateC: { density: 0.5,  trend: 'stable'     },
      exitX: { density: 0.4,  trend: 'stable'     },
      exitY: { density: 0.35, trend: 'stable'     },
    });
    const result = computeActivePerk(data, null);
    expect(result.active).toBe(false);
  });

  it('returns active perk when congestion > 80% AND a clear < 30% zone exists', () => {
    const data = makeCrowdData({
      gateA: { density: 0.9,  trend: 'increasing' },
      exitY: { density: 0.15, trend: 'decreasing' },
    });
    const result = computeActivePerk(data, null);
    expect(result.active).toBe(true);
    expect(result.congestedPct).toBeGreaterThan(80);
    expect(result.clearPct).toBeLessThan(30);
  });

  it('active perk contains required shape properties', () => {
    const data = makeCrowdData({
      exitX: { density: 0.85, trend: 'increasing' },
      gateC: { density: 0.10, trend: 'stable'     },
    });
    const result = computeActivePerk(data, null);
    expect(result).toMatchObject({
      active:        true,
      congestedZone: expect.any(String),
      clearZone:     expect.any(String),
      congestedPct:  expect.any(Number),
      clearPct:      expect.any(Number),
      vendor:        expect.any(String),
      offer:         expect.any(String),
      emoji:         expect.any(String),
      expiresAt:     expect.any(Number),
      aiContext:     expect.any(String),
    });
  });

  it('reuses existing expiresAt when the same congested/clear pair is still active', () => {
    const data = makeCrowdData({
      gateA: { density: 0.9,  trend: 'increasing' },
      exitY: { density: 0.10, trend: 'stable'     },
    });

    const existing = {
      active:      true,
      congestedId: 'gateA',
      clearId:     'exitY',
      expiresAt:   9999999999999, // far future
    };

    const result = computeActivePerk(data, existing);
    expect(result.active).toBe(true);
    expect(result.expiresAt).toBe(9999999999999);
  });

  it('resets expiresAt when a different pair becomes active', () => {
    const now = Date.now();
    const data = makeCrowdData({
      gateB: { density: 0.9,  trend: 'increasing' },
      exitY: { density: 0.10, trend: 'stable'     },
    });

    const existing = {
      active:      true,
      congestedId: 'gateA', // different gate
      clearId:     'exitY',
      expiresAt:   9999999999999,
    };

    const result = computeActivePerk(data, existing);
    expect(result.active).toBe(true);
    // New expiry should be near now + 5 min
    expect(result.expiresAt).toBeGreaterThan(now);
    expect(result.expiresAt).not.toBe(9999999999999);
  });

  it('returns { active: false } for empty crowdData object', () => {
    const result = computeActivePerk({}, null);
    expect(result.active).toBe(false);
  });

  it('returns { active: false } for null crowdData', () => {
    const result = computeActivePerk(null, null);
    expect(result.active).toBe(false);
  });

  it('aiContext string includes the vendor name and clear zone', () => {
    const data = makeCrowdData({
      gateA: { density: 0.92, trend: 'increasing' },
      gateC: { density: 0.12, trend: 'stable'     },
    });
    const result = computeActivePerk(data, null);
    expect(result.aiContext).toContain(result.vendor);
    expect(result.aiContext).toContain(result.clearZone);
  });
});
