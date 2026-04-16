/**
 * FlowSync AI - Predictive Intelligence Layer
 * These functions are kept pure and framework-agnostic to enable optimal testability.
 */

/**
 * Calculates the T+5 Minute predicted density based on current saturation and incoming flow vectors.
 * @param {number} currentDensity - The current density float (0.0 to 1.0)
 * @param {string} trend - The current evaluated trend ('increasing' | 'stable' | 'decreasing')
 * @returns {number} Predicted density rendered as an integer percentage from 0 to 100
 */
export const calculateTPlus5 = (currentDensity, trend) => {
  let basePercentage = currentDensity * 100;
  
  if (trend === 'increasing' || trend === 'rising') {
    basePercentage *= 1.25; // 25% Increase vector
  } else if (trend === 'decreasing' || trend === 'falling') {
    basePercentage *= 0.85; // 15% Decrease vector
  }
  
  // Floor/Ceil hard stops for physical metrics (0-100)
  return Math.min(100, Math.max(0, Math.round(basePercentage)));
};

/**
 * Evaluates tactical grouping risk at a localized gate structure.
 * @param {number} groupSize - Number of concurrent group size input
 * @param {number} predictedDensity - The predicted integer percentage from calculateTPlus5
 * @returns {object|string} Tactical risk assessment payload
 */
export const calculateGroupRisk = (groupSize, predictedDensity) => {
  if (groupSize > 4 && predictedDensity > 75) {
    return { status: "High Risk", message: "Group likely to split. Route altered." };
  }
  return 'Safe';
};
