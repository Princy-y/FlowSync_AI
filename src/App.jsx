import React, { useState, useRef, useEffect, useCallback, lazy, Suspense } from 'react';
import { LiveCommandCenter } from './components/LiveCommandCenter';
import { FlowSyncAssistant } from './components/FlowSyncAssistant';
import { useStadiumData } from './context/StadiumContext';
import {
  LayoutDashboard, Users, Map, Settings, Search, Bell, Menu, X,
  ChevronRight, AlertTriangle, Tag, Zap, ToggleLeft, ToggleRight, Globe, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Human-readable label lookup for context keys ─────────────────────────────
const GATE_LABELS = {
  gateA: 'Gate A',
  gateB: 'Gate B',
  gateC: 'Gate C',
  exitX: 'Exit X',
  exitY: 'Exit Y',
};

// ─── Sidebar panel config ─────────────────────────────────────────────────────
const PANELS = {
  grid:     { label: 'Analytics',    icon: LayoutDashboard },
  people:   { label: 'Group Sync',   icon: Users           },
  search:   { label: 'Search Gates', icon: Search          },
  bell:     { label: 'Smart Alerts', icon: Bell            },
  settings: { label: 'Settings',     icon: Settings        },
};

// ─── Individual panel content components ──────────────────────────────────────

const MapPanel = () => (
  <div className="flex flex-col gap-4">
    <p className="text-xs text-slate-400 leading-relaxed">
      Live sensor overlay. Highlighted paths update every 4 seconds based on predictive flow vectors.
    </p>
    <div className="relative w-full aspect-[4/3] bg-slate-950/60 rounded-2xl border border-slate-700/40 overflow-hidden flex items-center justify-center">
      {/* Simple mock stadium map graphic */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:18px_18px]" />
      <div className="flex flex-col items-center gap-2 relative z-10">
        <span className="text-5xl">🏟️</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 animate-pulse">
          📍 Recommended Route Highlighted
        </span>
      </div>
      {/* Gate markers */}
      <span className="absolute top-4 left-4 text-[10px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 rounded-lg">Gate A</span>
      <span className="absolute top-4 right-4 text-[10px] font-black text-yellow-400 bg-yellow-500/10 border border-yellow-500/30 px-2 py-1 rounded-lg">Gate B</span>
      <span className="absolute bottom-4 left-4 text-[10px] font-black text-red-400 bg-red-500/10 border border-red-500/30 px-2 py-1 rounded-lg">Exit X</span>
      <span className="absolute bottom-4 right-4 text-[10px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 rounded-lg">Exit Y</span>
    </div>
    <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
      Live Stadium Map — Arena Center
    </div>
  </div>
);

const GridPanel = () => {
  const [analytics, setAnalytics] = useState(true);
  const [heatmap,   setHeatmap  ] = useState(false);
  const [forecast,  setForecast ] = useState(true);

  const Toggle = ({ label, value, onChange }) => (
    <div className="flex items-center justify-between py-3 border-b border-white/5">
      <span className="text-sm font-semibold text-slate-300">{label}</span>
      <button onClick={() => onChange(!value)} className="transition-all active:scale-95">
        {value
          ? <ToggleRight size={28} className="text-indigo-400" />
          : <ToggleLeft  size={28} className="text-slate-600"  />
        }
      </button>
    </div>
  );

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-slate-400 mb-2">Configure which analytics layers are active on the dashboard.</p>
      <Toggle label="Advanced Analytics" value={analytics} onChange={setAnalytics} />
      <Toggle label="Predictive Heatmap" value={heatmap}   onChange={setHeatmap}   />
      <Toggle label="T+5 Forecast Layer" value={forecast}  onChange={setForecast}  />
      <div className={`mt-4 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest border transition-all ${
        analytics ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300' : 'bg-slate-800/40 border-slate-700/30 text-slate-500'
      }`}>
        {analytics ? '✅ Analytics Engine: Active' : '⏸️ Analytics Engine: Paused'}
      </div>
    </div>
  );
};

const PeoplePanel = () => {
  const { crowdData } = useStadiumData();

  // Highest density across all gates/exits (0-1 float → percentage)
  const densities = Object.values(crowdData).map(g => g.density);
  const maxDensity = Math.max(...densities);
  const splitProbability = Math.round(maxDensity * 100);
  const splitRisk = splitProbability > 70 ? 'HIGH' : splitProbability > 40 ? 'MODERATE' : 'LOW';
  const riskColor = splitProbability > 70 ? 'text-red-400 animate-pulse' : splitProbability > 40 ? 'text-yellow-400' : 'text-emerald-400';

  // Find most congested gate name for the alert message
  const worstKey = Object.entries(crowdData).reduce((a, b) => b[1].density > a[1].density ? b : a)[0];
  const worstLabel = GATE_LABELS[worstKey];
  const worstPct = Math.round(crowdData[worstKey].density * 100);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-slate-400">Real-time group tracking based on live sensor data and predictive split analysis.</p>
      <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/40 space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Group Size</span>
          <span className="text-2xl font-black text-white">6 <span className="text-xs opacity-40">people</span></span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Split Risk</span>
          <span className={`text-lg font-black ${riskColor}`}>{splitRisk} {splitProbability > 70 ? '⚠️' : ''}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Split Probability</span>
          <span className={`text-lg font-black ${riskColor}`}>{splitProbability}%</span>
        </div>
      </div>
      <div className={`p-3 rounded-xl text-xs font-semibold leading-relaxed border ${
        splitProbability > 70
          ? 'bg-red-500/10 border-red-500/30 text-red-300'
          : splitProbability > 40
          ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300'
          : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
      }`}>
        👥 Most congested point: {worstLabel} at {worstPct}%.
        {splitProbability > 70 ? ` Rerouting away from ${worstLabel} recommended.` : ' Group integrity is nominal.'}
      </div>
    </div>
  );
};

const SearchPanel = () => {
  const { crowdData } = useStadiumData();
  const [query, setQuery] = useState('');

  // Build a sorted list of gates from live context (least congested first)
  const gates = Object.entries(crowdData)
    .map(([key, val]) => ({
      key,
      label: GATE_LABELS[key],
      pct: Math.round(val.density * 100),
      trend: val.trend,
    }))
    .sort((a, b) => a.pct - b.pct); // sort least → most congested

  const filtered = gates.filter(g =>
    g.label.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-4">
      <input
        type="text"
        placeholder="Find least crowded gate..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        className="w-full bg-slate-900/80 border border-slate-700/80 text-white px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 placeholder:text-slate-500"
      />
      <div className="flex flex-col gap-2">
        {filtered.map(g => {
          const color = g.pct > 70 ? 'text-red-400 border-red-500/30 bg-red-500/10'
                      : g.pct > 40 ? 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10'
                                   : 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
          return (
            <div key={g.key} className={`flex items-center justify-between px-4 py-3 rounded-xl border ${color}`}>
              <div>
                <span className="text-sm font-bold block">{g.label}</span>
                <span className="text-[10px] opacity-60 uppercase tracking-widest">{g.trend}</span>
              </div>
              <span className="text-sm font-black">{g.pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const BellPanel = () => {
  const { crowdData, activePerk } = useStadiumData();

  // Live congestion alerts — any gate/exit above 75% density
  const congestionAlerts = Object.entries(crowdData)
    .filter(([, val]) => val.density > 0.75)
    .map(([key, val]) => ({
      key,
      label: GATE_LABELS[key],
      pct: Math.round(val.density * 100),
      trend: val.trend,
    }));

  // Rising-trend warnings — between 55-75% and increasing
  const risingAlerts = Object.entries(crowdData)
    .filter(([, val]) => val.density > 0.55 && val.density <= 0.75 && val.trend === 'increasing')
    .map(([key, val]) => ({
      key,
      label: GATE_LABELS[key],
      pct: Math.round(val.density * 100),
    }));

  const hasAnyAlerts = congestionAlerts.length > 0 || risingAlerts.length > 0 || activePerk?.active;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-slate-400">Live alerts — auto-triggered from the FlowSync sensor engine.</p>

      {!hasAnyAlerts && (
        <div className="px-4 py-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-center">
          <p className="text-emerald-400 text-sm font-bold">✅ All Clear</p>
          <p className="text-xs text-slate-500 mt-1">No congestion detected at any gate or exit.</p>
        </div>
      )}

      {congestionAlerts.map(a => (
        <div key={a.key} className="flex items-start gap-3 px-4 py-3 rounded-xl border border-red-500/30 bg-red-500/10">
          <AlertTriangle size={14} className="text-red-400 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-slate-200 leading-snug">⚠️ Heavy Congestion at {a.label}</p>
            <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-widest">{a.pct}% density · {a.trend}</p>
          </div>
        </div>
      ))}

      {risingAlerts.map(a => (
        <div key={a.key} className="flex items-start gap-3 px-4 py-3 rounded-xl border border-orange-500/30 bg-orange-500/10">
          <Zap size={14} className="text-orange-400 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-slate-200 leading-snug">📈 Rising Trend at {a.label}</p>
            <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-widest">{a.pct}% density · increasing</p>
          </div>
        </div>
      ))}

      {activePerk?.active && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10">
          <Tag size={14} className="text-yellow-400 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-slate-200 leading-snug">🎁 {activePerk.vendor}: {activePerk.offer}</p>
            <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-widest">Near {activePerk.clearZone} · Live perk</p>
          </div>
        </div>
      )}
    </div>
  );
};

const SettingsPanel = () => {
  const [lang,  setLang ] = useState('English');
  const [route, setRoute] = useState('Fastest');

  const SelectField = ({ label, icon: Icon, value, onChange, options }) => (
    <div className="flex flex-col gap-2">
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
        <Icon size={12} className="text-indigo-400" /> {label}
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-slate-900/80 border border-slate-700/60 text-white px-4 py-3 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/40 cursor-pointer"
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      <SelectField
        label="Language"
        icon={Globe}
        value={lang}
        onChange={setLang}
        options={['English', 'Tamil', 'Hindi', 'Spanish', 'Mandarin', 'French']}
      />
      <SelectField
        label="⚡ Routing Mode"
        icon={Zap}
        value={route}
        onChange={setRoute}
        options={['Fastest', 'Family', 'Group', 'Elderly']}
      />
      <div className="mt-2 px-4 py-3 rounded-xl bg-slate-800/40 border border-slate-700/30 text-xs text-slate-400 leading-relaxed">
        These preferences sync with the FlowSync Assistant's Smart Mode and language output settings.
      </div>
    </div>
  );
};

// ─── Overlay Panel Shell ───────────────────────────────────────────────────────
const OverlayPanel = ({ panelKey, onClose }) => {
  const config   = PANELS[panelKey];
  const panelRef = useRef(null);
  const closeRef = useRef(null);

  if (!config) return null;

  const contentMap = {
    grid:     <GridPanel   />,
    people:   <PeoplePanel />,
    search:   <SearchPanel />,
    bell:     <BellPanel   />,
    settings: <SettingsPanel />,
  };

  // Auto-focus close button when panel opens (WCAG focus management)
  useEffect(() => { closeRef.current?.focus(); }, []);

  // Close on Escape key (WCAG 2.1 SC 2.1.2)
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Focus trap — keep Tab / Shift+Tab cycling inside the panel
  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const focusable = el.querySelectorAll(
      'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];
    const trap  = (e) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
      } else {
        if (document.activeElement === last)  { e.preventDefault(); first?.focus(); }
      }
    };
    el.addEventListener('keydown', trap);
    return () => el.removeEventListener('keydown', trap);
  }, []);

  return (
    <motion.div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label={config.label}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0   }}
      exit={{    opacity: 0, x: -20  }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="absolute top-0 left-0 h-full w-80 z-40 flex flex-col
        bg-slate-900/70 backdrop-blur-xl border-r border-slate-700/50
        shadow-2xl shadow-black/60"
    >
      {/* Panel header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-500/30">
            {React.createElement(config.icon, { size: 16, className: 'text-indigo-400' })}
          </div>
          <span className="text-sm font-black text-white uppercase tracking-wider">{config.label}</span>
        </div>
        <button
          ref={closeRef}
          onClick={onClose}
          aria-label={`Close ${config.label} panel`}
          className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800/60 transition-all active:scale-90"
        >
          <X size={16} />
        </button>
      </div>

      {/* Panel body */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        <Suspense fallback={
          <div className="flex items-center justify-center h-32 gap-2 text-slate-400">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-sm">Loading panel...</span>
          </div>
        }>
          {contentMap[panelKey]}
        </Suspense>
      </div>
    </motion.div>
  );
};

// ─── NavItem ──────────────────────────────────────────────────────────────────
const NavItem = ({ icon, panelKey, activePanel, onClick, active = false, tooltip }) => {
  const isOpen = activePanel === panelKey;
  return (
    <button
      id={`nav-${panelKey || 'dashboard'}`}
      onClick={onClick}
      aria-label={tooltip ?? panelKey ?? 'Dashboard'}
      aria-pressed={isOpen || active}
      className={`p-3 rounded-2xl transition-all duration-200 group relative active:scale-90 ${
        isOpen || active
          ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.2)]'
          : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/40'
      }`}
    >
      {icon}
      {/* Active indicator bar */}
      {(isOpen || active) && (
        <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-r-full" />
      )}
      {/* Tooltip */}
      {tooltip && (
        <div
          role="tooltip"
          className="absolute left-full ml-4 px-2.5 py-1.5 bg-slate-800 border border-slate-700/60 text-[10px] text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none uppercase font-bold tracking-widest z-50 shadow-xl"
        >
          {tooltip}
          <ChevronRight size={10} className="inline ml-1 opacity-50" />
        </div>
      )}
    </button>
  );
};

// ─── App ───────────────────────────────────────────────────────────────────────
function App() {
  const [activePanel, setActivePanel] = useState(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  // Stores the element that triggered the panel so focus can be restored on close
  const triggerRef = useRef(null);

  const togglePanel = useCallback((key, triggerEl) => {
    setActivePanel(prev => {
      if (prev === key) {
        setTimeout(() => triggerEl?.focus(), 50);
        return null;
      }
      triggerRef.current = triggerEl ?? null;
      return key;
    });
  }, []);

  const closePanel = useCallback(() => {
    setActivePanel(null);
    setTimeout(() => triggerRef.current?.focus(), 50);
  }, []);

  return (
    <div className="flex h-screen w-full bg-[#020617] text-slate-100 overflow-hidden font-inter">

      {/* ── Sidebar ── */}
      <aside className="hidden lg:flex w-20 flex-col items-center py-8 bg-slate-950 border-r border-slate-800/80 shrink-0 z-50 relative">
        {/* Logo */}
        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center mb-10 shadow-lg shadow-indigo-600/30">
          <Map size={24} className="text-white" />
        </div>

        {/* Nav icons */}
        <nav className="flex flex-col gap-6 flex-1">
          <NavItem icon={<LayoutDashboard size={20} />} active tooltip="Dashboard" />
          <NavItem icon={<Users  size={20} />} panelKey="people"   activePanel={activePanel} onClick={() => togglePanel('people')}   tooltip="Group Sync"   />
          <NavItem icon={<Search size={20} />} panelKey="search"   activePanel={activePanel} onClick={() => togglePanel('search')}   tooltip="Search Gates" />
          <NavItem icon={<Bell   size={20} />} panelKey="bell"     activePanel={activePanel} onClick={() => togglePanel('bell')}     tooltip="Smart Alerts" />
        </nav>

        <NavItem icon={<Settings size={20} />} panelKey="settings" activePanel={activePanel} onClick={() => togglePanel('settings')} tooltip="Settings" />
      </aside>

      {/* ── Main ── */}
      <main id="main-content" className="flex-1 flex flex-col min-w-0" aria-label="Stadium dashboard">

        {/* Header */}
        <header className="h-20 flex items-center justify-between px-8 bg-slate-950/40 backdrop-blur-md border-b border-white/5 shrink-0 relative z-10">
          <div className="flex items-center gap-4">
            <button
              id="mobile-menu-btn"
              aria-label="Open navigation menu"
              aria-expanded={mobileSidebarOpen}
              aria-controls="mobile-sidebar"
              className="lg:hidden p-2 text-slate-400 hover:text-white transition-colors"
              onClick={() => setMobileSidebarOpen(o => !o)}
            >
              <Menu size={24} />
            </button>
            <div className="flex flex-col">
              <h1 className="text-2xl font-black bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent tracking-tighter">
                FlowSync <span className="font-light opacity-60">AI</span>
              </h1>
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-indigo-500 -mt-1 ml-0.5">Stadium Operating System</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden sm:flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-800/20 border border-slate-700/30">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-widest text-slate-300">Live: Arena Center</span>
            </div>
            <div className="flex items-center gap-4 border-l border-white/10 pl-6">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-white tracking-tight leading-none uppercase">Senior Operator Princy</p>
                <span className="text-[10px] text-emerald-400 font-medium uppercase tracking-widest mt-1">Tier 1 Clearance</span>
              </div>
              <div className="w-10 h-10 rounded-full border-2 border-indigo-500/30 bg-indigo-500/10 flex items-center justify-center p-0.5 overflow-hidden">
                <img
                  src="https://api.dicebear.com/7.x/avataaars/svg?seed=Princy&backgroundColor=b6e3f4"
                  alt="Princy Avatar"
                  className="rounded-full"
                />
              </div>
            </div>
          </div>
        </header>

        {/* ── Split-screen content + overlay ── */}
        <div className="flex-1 flex flex-col lg:flex-row min-h-0 bg-slate-900/10 relative overflow-hidden">

          {/* Slide-out overlay panel — absolutely positioned, never disrupts grid */}
          <AnimatePresence>
            {activePanel && (
              <>
                {/* Dim backdrop — click to close */}
                <motion.div
                  key="backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 z-30 bg-black/20 backdrop-blur-[2px]"
                  onClick={closePanel}
                  aria-hidden="true"
                />
                <OverlayPanel
                  key="panel"
                  panelKey={activePanel}
                  onClose={closePanel}
                />
              </>
            )}
          </AnimatePresence>

          {/* Mobile sidebar drawer */}
          <AnimatePresence>
            {mobileSidebarOpen && (
              <>
                <motion.div
                  key="mobile-backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 bg-black/50 lg:hidden"
                  onClick={() => setMobileSidebarOpen(false)}
                  aria-hidden="true"
                />
                <motion.aside
                  id="mobile-sidebar"
                  key="mobile-sidebar"
                  initial={{ x: -80, opacity: 0 }}
                  animate={{ x: 0,   opacity: 1 }}
                  exit={{    x: -80, opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  aria-label="Mobile navigation"
                  className="fixed top-0 left-0 h-full w-20 z-50 flex flex-col items-center py-8 bg-slate-950 border-r border-slate-800/80 lg:hidden"
                >
                  <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center mb-10 shadow-lg shadow-indigo-600/30">
                    <Map size={24} className="text-white" />
                  </div>
                  <nav className="flex flex-col gap-6 flex-1">
                    <NavItem icon={<LayoutDashboard size={20} />} active tooltip="Dashboard" />
                    <NavItem icon={<Users  size={20} />} panelKey="people"   activePanel={activePanel} onClick={() => { togglePanel('people');   setMobileSidebarOpen(false); }} tooltip="Group Sync"   />
                    <NavItem icon={<Search size={20} />} panelKey="search"   activePanel={activePanel} onClick={() => { togglePanel('search');   setMobileSidebarOpen(false); }} tooltip="Search Gates" />
                    <NavItem icon={<Bell   size={20} />} panelKey="bell"     activePanel={activePanel} onClick={() => { togglePanel('bell');     setMobileSidebarOpen(false); }} tooltip="Smart Alerts" />
                  </nav>
                  <NavItem icon={<Settings size={20} />} panelKey="settings" activePanel={activePanel} onClick={() => { togglePanel('settings'); setMobileSidebarOpen(false); }} tooltip="Settings" />
                </motion.aside>
              </>
            )}
          </AnimatePresence>

          {/* Dashboard (Left) */}
          <section className="flex-1 overflow-y-auto px-4 sm:px-8 pb-8">
            <LiveCommandCenter />
          </section>

          {/* AI Assistant (Right) */}
          <aside className="w-full lg:w-[450px] xl:w-[500px] h-full p-4 lg:p-6 lg:border-l border-white/5 relative z-20">
            <FlowSyncAssistant />
          </aside>
        </div>
      </main>
    </div>
  );
}

export default App;
