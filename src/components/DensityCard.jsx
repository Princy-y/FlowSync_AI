import React from 'react';
import { TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react';
import { getBgDensityColor } from '../engine/PredictiveEngine';

export const DensityCard = ({ label, current, forecast }) => {
  const isIncreasing = forecast?.trend === 'increasing';
  const isDecreasing = forecast?.trend === 'decreasing';
  const riskClass = getBgDensityColor(current);

  return (
    <div className={`p-5 rounded-2xl border backdrop-blur-md transition-all duration-500 shadow-lg ${riskClass}`}>
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-sm font-medium opacity-80 uppercase tracking-wider">{label}</h3>
        <div className="flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full bg-white/10">
          {isIncreasing && <TrendingUp size={12} className="text-red-400" />}
          {isDecreasing && <TrendingDown size={12} className="text-emerald-400" />}
          {!isIncreasing && !isDecreasing && <Minus size={12} className="opacity-50" />}
          {forecast?.trend.toUpperCase() || 'STABLE'}
        </div>
      </div>
      
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-bold tracking-tighter">{current}%</span>
        <span className="text-xs opacity-60">live density</span>
      </div>

      {forecast && (
        <div className="mt-4 pt-3 border-t border-white/10">
          <div className="flex items-center justify-between text-xs">
            <span className="opacity-70 font-medium">T+5 Min Forecast</span>
            <span className={`font-bold ${forecast.predictedValue > 80 ? 'text-red-400 animate-pulse' : 'opacity-90'}`}>
              {forecast.predictedValue}%
            </span>
          </div>
          <div className="w-full h-1 bg-white/10 rounded-full mt-2 overflow-hidden">
            <div 
              className={`h-full transition-all duration-700 ${forecast.predictedValue > 80 ? 'bg-red-400' : 'bg-emerald-400/60'}`}
              style={{ width: `${forecast.predictedValue}%` }}
            />
          </div>
          {forecast.riskLevel === 'CRITICAL' && (
            <div className="mt-2 flex items-center gap-1.5 text-[10px] text-red-500 font-bold uppercase animate-pulse">
              <AlertCircle size={10} />
              Crowd Congestion Risk
            </div>
          )}
        </div>
      )}
    </div>
  );
};
