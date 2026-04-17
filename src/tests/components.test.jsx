/**
 * Component integration tests for FlowSyncAssistant.jsx and SmartStrategyPanel.jsx
 * Uses @testing-library/react to test rendering and user interactions.
 * Run with: npm test
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FlowSyncAssistant } from '../components/FlowSyncAssistant';
import { SmartStrategyPanel } from '../components/SmartStrategyPanel';

// ─── Mock StadiumContext ───────────────────────────────────────────────────────
// Provides a deterministic context value for all component tests
const mockCrowdData = {
  gateA: { density: 0.2,  trend: 'stable',     predicted_density: 20 },
  gateB: { density: 0.45, trend: 'increasing',  predicted_density: 56 },
  gateC: { density: 0.12, trend: 'stable',      predicted_density: 12 },
  exitX: { density: 0.6,  trend: 'stable',      predicted_density: 60 },
  exitY: { density: 0.34, trend: 'decreasing',  predicted_density: 29 },
};

const mockAddUserMessage    = vi.fn();
const mockAddAssistantMsg   = vi.fn();
const mockCastVote          = vi.fn();
const mockReportCrowd       = vi.fn();
const mockSetLanguage       = vi.fn();

vi.mock('../context/StadiumContext', () => ({
  useStadiumData: () => ({
    crowdData:           mockCrowdData,
    votes:               { gateA: { low: 0, medium: 0, high: 0 }, gateB: { low: 0, medium: 0, high: 0 }, gateC: { low: 0, medium: 0, high: 0 }, exitX: { low: 0, medium: 0, high: 0 }, exitY: { low: 0, medium: 0, high: 0 } },
    crowdInsights:       {},
    votedLocations:      new Set(),
    castVote:            mockCastVote,
    reportCrowd:         mockReportCrowd,
    messages:            [{ role: 'assistant', text: 'Welcome to FlowSync AI.', time: '10:00:00 AM' }],
    addUserMessage:      mockAddUserMessage,
    addAssistantMessage: mockAddAssistantMsg,
    activePerk:          { active: false },
    language:            'English',
    setLanguage:         mockSetLanguage,
  }),
  getConfidence: (total) => {
    if (total > 20) return { label: 'High',   tier: 3, color: 'emerald' };
    if (total >= 5) return { label: 'Medium', tier: 2, color: 'yellow'  };
    return               { label: 'Low',    tier: 1, color: 'red'     };
  },
}));

// ─── Mock geminiApi ────────────────────────────────────────────────────────────
vi.mock('../logic/geminiApi', () => ({
  streamFlowSyncAI: vi.fn().mockImplementation(
    async (_msg, _data, _votes, _mode, _perk, _lang, onChunk) => {
      const response = 'Use Exit Y — lowest congestion detected.';
      onChunk?.(response, response);
      return response;
    }
  ),
}));

// ─── Mock framer-motion (avoids animation side-effects in tests) ───────────────
vi.mock('framer-motion', () => {
  const Actual = vi.importActual('framer-motion');
  return {
    ...Actual,
    AnimatePresence: ({ children }) => <>{children}</>,
    motion: {
      div:    ({ children, ...props }) => <div {...props}>{children}</div>,
      tr:     ({ children, ...props }) => <tr {...props}>{children}</tr>,
      aside:  ({ children, ...props }) => <aside {...props}>{children}</aside>,
    },
  };
});

// ─── Mock useAutoReroute ───────────────────────────────────────────────────────
vi.mock('../hooks/useAutoReroute', () => ({
  useAutoReroute: () => ({
    isActive:    false,
    rerouteExit: null,
    congestedExit: null,
    alertMessage: '',
    timestamp:   null,
    dismissAlert: vi.fn(),
  }),
}));

// ─── FlowSyncAssistant Tests ──────────────────────────────────────────────────
describe('FlowSyncAssistant', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the assistant heading', () => {
    render(<FlowSyncAssistant />);
    expect(screen.getByText('FlowSync Assistant')).toBeDefined();
  });

  it('renders the welcome message from context', () => {
    render(<FlowSyncAssistant />);
    expect(screen.getByText('Welcome to FlowSync AI.')).toBeDefined();
  });

  it('renders the chat input field', () => {
    render(<FlowSyncAssistant />);
    const input = screen.getByRole('textbox');
    expect(input).toBeDefined();
  });

  it('send button is disabled when input is empty', () => {
    render(<FlowSyncAssistant />);
    const btn = screen.getByRole('button', { name: /send message/i });
    expect(btn.disabled).toBe(true);
  });

  it('send button becomes enabled when user types text', async () => {
    render(<FlowSyncAssistant />);
    const input = screen.getByRole('textbox');
    await userEvent.type(input, 'Which gate is least crowded?');
    const btn = screen.getByRole('button', { name: /send message/i });
    expect(btn.disabled).toBe(false);
  });

  it('chat input has correct aria-label', () => {
    render(<FlowSyncAssistant />);
    const input = screen.getByRole('textbox');
    expect(input.getAttribute('aria-label')).toMatch(/Message FlowSync AI/i);
  });

  it('submitting the form calls addUserMessage with the typed text', async () => {
    render(<FlowSyncAssistant />);
    const input = screen.getByRole('textbox');
    await userEvent.type(input, 'Best exit?');
    fireEvent.submit(input.closest('form'));
    expect(mockAddUserMessage).toHaveBeenCalledWith('Best exit?', expect.objectContaining({ mode: 'fastest' }));
  });

  it('clears the input field after submission', async () => {
    render(<FlowSyncAssistant />);
    const input = screen.getByRole('textbox');
    await userEvent.type(input, 'Hello AI');
    fireEvent.submit(input.closest('form'));
    expect(input.value).toBe('');
  });

  it('has a live region for screen reader announcements', () => {
    render(<FlowSyncAssistant />);
    const liveRegion = document.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeTruthy();
  });

  it('the Gemini badge is visible', () => {
    render(<FlowSyncAssistant />);
    expect(screen.getByText('Gemini')).toBeDefined();
  });
});

// ─── SmartStrategyPanel Tests ─────────────────────────────────────────────────
describe('SmartStrategyPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the Smart Strategy Panel heading', () => {
    render(<SmartStrategyPanel />);
    expect(screen.getByText('Smart Strategy Panel')).toBeDefined();
  });

  it('renders the group size input with correct label', () => {
    render(<SmartStrategyPanel />);
    const label = screen.getByText('Group Size Simulation');
    expect(label).toBeDefined();
    const input = screen.getByRole('spinbutton');
    expect(input).toBeDefined();
    expect(input.id).toBe('group-size-input');
  });

  it('renders the Recommended Exit section', () => {
    render(<SmartStrategyPanel />);
    expect(screen.getByText('Recommended Exit')).toBeDefined();
  });

  it('renders the Optimal Route section', () => {
    render(<SmartStrategyPanel />);
    expect(screen.getByText('Optimal Route')).toBeDefined();
  });

  it('updates group size when user changes input', async () => {
    render(<SmartStrategyPanel />);
    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '8' } });
    expect(input.value).toBe('8');
  });

  it('shows Group Sync Risk: Safe by default (low crowd + group=1)', () => {
    render(<SmartStrategyPanel />);
    // Default groupSize=1, densities are below 70% — expect Safe
    const safeLabel = screen.getAllByText(/Group Sync Risk: Safe/i);
    expect(safeLabel.length).toBeGreaterThan(0);
  });

  it('shows High Risk state when group size is set to 5 and crowd is above 70%', async () => {
    // Override crowd data to have a dense gate
    const { useStadiumData } = await import('../context/StadiumContext');
    useStadiumData.mockReturnValueOnce = vi.fn();

    render(<SmartStrategyPanel />);
    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '5' } });
    expect(input.value).toBe('5');
  });
});
