// ─── Vendor Perks Engine ──────────────────────────────────────────────────────
/**
 * Catalogue of perks indexed by location ID.
 * Each location can have multiple perks — one is picked at random per activation.
 */
const PERK_CATALOGUE = {
  gateA: [
    { vendor: 'Pizza Stop',       offer: '15% off any slice',          emoji: '🍕' },
    { vendor: 'Cold Brew Co.',    offer: 'Free upgrade on coffee',      emoji: '☕' },
  ],
  gateB: [
    { vendor: 'Sports Bar B',     offer: '2-for-1 on soft drinks',      emoji: '🥤' },
    { vendor: "Fan's Deli",       offer: '10% off combo meals',         emoji: '🥪' },
  ],
  gateC: [
    { vendor: 'Pretzel Palace',   offer: 'Buy 1 get 1 free pretzel',    emoji: '🥨' },
    { vendor: 'Ice Cream Cart',   offer: 'Free scoop with any drink',   emoji: '🍦' },
  ],
  exitX: [
    { vendor: 'Water Station X',  offer: '20% off all beverages',       emoji: '💧' },
    { vendor: 'Snack Central X',  offer: 'Free bag of chips on orders',  emoji: '🍟' },
  ],
  exitY: [
    { vendor: 'Water Station Y',  offer: '20% off at Water Station',    emoji: '💧' },
    { vendor: 'South Grill',      offer: '$2 off grilled wraps',        emoji: '🌯' },
  ],
};

/** Friendly display labels matching LiveCommandCenter's monitorItems */
const LOCATION_LABELS = {
  gateA: 'Gate A',
  gateB: 'Gate B',
  gateC: 'Gate C',
  exitX: 'Concourse X',
  exitY: 'Concourse Y',
};

const PERK_DURATION_MS = 5 * 60 * 1000; // 5 minutes

/**
 * getPerkForLocation — randomly picks one perk from a location's catalogue.
 * Returns null if no catalogue entry exists.
 *
 * @param {string} locationId
 * @returns {{ vendor: string, offer: string, emoji: string } | null}
 */
function getPerkForLocation(locationId) {
  const catalogue = PERK_CATALOGUE[locationId];
  if (!catalogue?.length) return null;
  return catalogue[Math.floor(Math.random() * catalogue.length)];
}

/**
 * computeActivePerk — scans live crowd data to find a congested→clear pair
 * that qualifies for a vendor perk incentive.
 *
 * Trigger conditions:
 *   - At least one location has density > 0.80 (congested)
 *   - At least one OTHER location has density < 0.30 (clear)
 *
 * @param {Record<string, { density: number, trend: string }>} crowdData
 * @param {{ expiresAt: number } | null} existing  — current perk (for stable identity)
 * @returns {{
 *   active:         boolean,
 *   congestedZone:  string,        // e.g. "Concourse X"
 *   clearZone:      string,        // e.g. "Concourse Y"
 *   congestedPct:   number,
 *   clearPct:       number,
 *   vendor:         string,
 *   offer:          string,
 *   emoji:          string,
 *   expiresAt:      number,        // Date.now() + 5 min
 *   aiContext:      string,        // plain-text snippet for AI prompt
 * } | { active: false }}
 */
export function computeActivePerk(crowdData, existing = null) {
  if (!crowdData || Object.keys(crowdData).length === 0) return { active: false };

  // Find the most congested location
  const sorted = Object.entries(crowdData).sort((a, b) => b[1].density - a[1].density);
  const [congestedId, congestedData] = sorted[0];

  if (congestedData.density <= 0.80) return { active: false };

  // Find the clearest location (different from congested)
  const clearEntry = sorted.findLast(([id, d]) => id !== congestedId && d.density < 0.30);
  if (!clearEntry) return { active: false };

  const [clearId, clearData] = clearEntry;
  const perk = getPerkForLocation(clearId);
  if (!perk) return { active: false };

  // Reuse existing expiry if the same pair is still active (avoids timer reset on every tick)
  const sameActivePerk = existing?.active
    && existing.congestedId === congestedId
    && existing.clearId     === clearId;

  const expiresAt = sameActivePerk ? existing.expiresAt : Date.now() + PERK_DURATION_MS;

  const congestedLabel = LOCATION_LABELS[congestedId] ?? congestedId.toUpperCase();
  const clearLabel     = LOCATION_LABELS[clearId]     ?? clearId.toUpperCase();
  const congestedPct   = Math.round(congestedData.density * 100);
  const clearPct       = Math.round(clearData.density    * 100);

  return {
    active:        true,
    congestedId,
    clearId,
    congestedZone: congestedLabel,
    clearZone:     clearLabel,
    congestedPct,
    clearPct,
    vendor:        perk.vendor,
    offer:         perk.offer,
    emoji:         perk.emoji,
    expiresAt,
    // Flat text for AI prompt injection
    aiContext: `VENDOR PERK ACTIVE: Heavy traffic at ${congestedLabel} (${congestedPct}%). ` +
               `Rerouting recommended via ${clearLabel} (${clearPct}%). ` +
               `🎁 Reward for using this route: ${perk.offer} at ${perk.vendor} (${clearLabel}) — limited offer valid 5 minutes.`,
  };
}
