/**
 * PredictiveEngine.js
 * Calculates T+5 Minute density forecasts based on historical rate of arrival.
 */

export const calculateForecast = (history) => {
  if (!history || history.length < 2) return null;

  const latest = history[history.length - 1];
  const secondLatest = history[history.length - 2];
  
  // Locations we track
  const keys = ['gateA', 'gateB', 'gateC', 'exitX', 'exitY'];
  const forecast = {};

  keys.forEach(key => {
    const current = latest[key] || 0;
    const previous = secondLatest[key] || 0;
    
    // Simple linear extrapolation for T+5
    // Each history point is 4 seconds. T+5 mins = 300 seconds = 75 intervals.
    const delta = (current - previous);
    const trend = delta > 0 ? 1.2 : 0.8; // Bias toward growth/shrinkage
    
    // Predicted = Current + (Rate * Future_Intervals)
    // We'll use a slightly dampened predictor to avoid extreme spikes
    const rawPrediction = current + (delta * 15); // Predicting slightly ahead
    
    forecast[key] = {
      predictedValue: Math.max(0, Math.min(100, Math.round(rawPrediction))),
      trend: delta > 0 ? 'increasing' : (delta < 0 ? 'decreasing' : 'stable'),
      riskLevel: rawPrediction > 85 ? 'CRITICAL' : (rawPrediction > 65 ? 'WARNING' : 'LOW')
    };
  });

  return forecast;
};

export const getDensityColor = (density) => {
  if (density > 80) return 'text-red-500';
  if (density > 50) return 'text-yellow-500';
  return 'text-emerald-500';
};

export const getBgDensityColor = (density) => {
  if (density > 80) return 'bg-red-500/20 text-red-400 border-red-500/50';
  if (density > 50) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
  return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50';
};
