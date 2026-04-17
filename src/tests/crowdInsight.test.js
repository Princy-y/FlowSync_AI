/**
 * Unit tests for StadiumContext helpers: getCrowdInsight & getConfidence
 * Run with: npm test
 */
import { describe, it, expect } from 'vitest';
import { getCrowdInsight, getConfidence } from '../context/StadiumContext';

// ─── getConfidence ────────────────────────────────────────────────────────────
describe('getConfidence', () => {
  it('returns Low confidence for 0 votes', () => {
    const result = getConfidence(0);
    expect(result.label).toBe('Low');
    expect(result.tier).toBe(1);
    expect(result.color).toBe('red');
  });

  it('returns Low confidence for 4 votes (below threshold)', () => {
    const result = getConfidence(4);
    expect(result.label).toBe('Low');
    expect(result.tier).toBe(1);
  });

  it('returns Medium confidence for exactly 5 votes', () => {
    const result = getConfidence(5);
    expect(result.label).toBe('Medium');
    expect(result.tier).toBe(2);
    expect(result.color).toBe('yellow');
  });

  it('returns Medium confidence for 20 votes (upper boundary)', () => {
    const result = getConfidence(20);
    expect(result.label).toBe('Medium');
    expect(result.tier).toBe(2);
  });

  it('returns High confidence for 21 votes (above 20)', () => {
    const result = getConfidence(21);
    expect(result.label).toBe('High');
    expect(result.tier).toBe(3);
    expect(result.color).toBe('emerald');
  });

  it('returns High confidence for large vote counts', () => {
    const result = getConfidence(999);
    expect(result.label).toBe('High');
    expect(result.tier).toBe(3);
  });
});

// ─── getCrowdInsight ──────────────────────────────────────────────────────────
describe('getCrowdInsight', () => {
  it('returns No Reports when all votes are 0', () => {
    const result = getCrowdInsight({ low: 0, medium: 0, high: 0 });
    expect(result.level).toBe('No Reports');
    expect(result.percentage).toBe(0);
    expect(result.totalVotes).toBe(0);
    expect(result.color).toBe('slate');
  });

  it('handles missing vote keys gracefully (nullish coalescing)', () => {
    const result = getCrowdInsight({});
    expect(result.level).toBe('No Reports');
    expect(result.totalVotes).toBe(0);
  });

  it('returns Clear / Free when low votes dominate', () => {
    const result = getCrowdInsight({ low: 8, medium: 1, high: 1 });
    expect(result.level).toBe('Clear / Free');
    expect(result.color).toBe('emerald');
    expect(result.totalVotes).toBe(10);
    expect(result.percentage).toBe(80);
  });

  it('returns Moderate when medium votes dominate', () => {
    const result = getCrowdInsight({ low: 1, medium: 8, high: 1 });
    expect(result.level).toBe('Moderate');
    expect(result.color).toBe('yellow');
  });

  it('returns Crowded when high votes dominate', () => {
    const result = getCrowdInsight({ low: 1, medium: 1, high: 10 });
    expect(result.level).toBe('Crowded');
    expect(result.color).toBe('red');
  });

  it('correctly computes vote percentages', () => {
    const result = getCrowdInsight({ low: 5, medium: 3, high: 2 });
    expect(result.percentages.low).toBe(50);
    expect(result.percentages.medium).toBe(30);
    expect(result.percentages.high).toBe(20);
    expect(result.totalVotes).toBe(10);
  });

  it('includes confidence nested in the result', () => {
    const result = getCrowdInsight({ low: 25, medium: 5, high: 0 });
    expect(result.confidence).toBeDefined();
    expect(result.confidence.label).toBe('High');  // 30 total votes → High
  });

  it('percentage dominance is determined by vote count, not just presence', () => {
    // Even split: low=5, medium=5 — low and medium are equal; reduce picks last max
    const result = getCrowdInsight({ low: 5, medium: 5, high: 0 });
    // Both are 50%; reduce will pick whichever wins the tie (implementation detail)
    expect(['Clear / Free', 'Moderate']).toContain(result.level);
  });
});
