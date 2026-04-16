import React, { memo } from 'react';
import { useStadiumData } from '../context/StadiumContext';
import { GateCard } from './GateCard';
import { Navigation } from 'lucide-react';
import { SmartStrategyPanel } from './SmartStrategyPanel';



const LiveCommandCenterComponent = () => {
  const { crowdData, reportCrowd } = useStadiumData();

  const monitorItems = [
    { id: 'gateA', label: 'Gate A Access' },
    { id: 'gateB', label: 'Gate B Access' },
    { id: 'gateC', label: 'Gate C Access' },
    { id: 'exitX', label: 'Concourse X Exit' },
    { id: 'exitY', label: 'Concourse Y Exit' },
  ];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 h-full pt-6">
      {/* Left: Live Crowd Monitor (Spans 3 Columns on Large Screens) */}
      <div className="xl:col-span-3 flex flex-col gap-5 h-full">
        <div className="flex items-center gap-3 px-2">
          <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-500/30 shadow-lg">
            <Navigation className="text-emerald-400" size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight leading-tight">Live Crowd Monitor</h2>
            <p className="text-[10px] text-emerald-400/80 font-bold uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Real-time Sensor Sync
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 auto-rows-max overflow-y-auto custom-scrollbar pb-4 pr-2">
          {monitorItems.map(item => (
            <GateCard 
              key={item.id}
              id={item.id}
              label={item.label}
              density={crowdData[item.id].density}
              trend={crowdData[item.id].trend}
              predicted_density={crowdData[item.id].predicted_density}
              onReport={reportCrowd}
            />
          ))}
        </div>
      </div>

      {/* Center: Smart Strategy Panel (Spans 2 Columns on Large Screens) */}
      <div className="xl:col-span-2 h-full">
        <SmartStrategyPanel />
      </div>
    </div>
  );
};

export const LiveCommandCenter = memo(LiveCommandCenterComponent);
