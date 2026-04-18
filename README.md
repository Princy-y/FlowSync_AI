<div align="center">
  
# FlowSync AI — Predictive Stadium Management System


[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Google Gemini API](https://img.shields.io/badge/Gemini_AI-8E75B2?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)](https://vitejs.dev/)

> An AI-powered crowd flow intelligence platform for stadium operators, built with React 19, Vite, Google Gemini API, and a real-time predictive simulation engine.
</div>
---

## Features

| Feature | Description |
|---|---|
| **Gemini AI Assistant** | Context-aware chat powered by Google Gemini 2.0 Flash — answers crowd queries in real time |
| **Live Sensor Dashboard** | 4-second polling simulation for 5 gates/exits with density, trend, and T+5 forecasts |
| **What-If Simulator** | Predictive scenario engine — compares crowd conditions at T+0, T+5, T+10 minutes |
| **Group Sync Risk** | Evaluates splitting risk for groups of varying sizes against live crowd pressure |
| **Auto-Reroute Engine** | Automatically detects congestion and triggers rerouting alerts with UI notifications |
| **Vendor Perks System** | Incentive-based crowd redistribution — unlocks time-limited vendor offers near clear zones |
| **Crowd Voting** | Attendees can report congestion levels; confidence-tiered votes enhance AI recommendations |
| **Smart Modes** | Four routing profiles: Fastest, Family, Group, Elderly — each tunes the AI's advice |
| **Smart Alerts Panel** | Live congestion alerts and rising-trend warnings surfaced from sensor data |

---

## Architecture

```
flowsync-ai/
├── src/
│   ├── components/         # UI components (panels, cards, chat)
│   │   ├── FlowSyncAssistant.jsx   # Gemini-powered AI chat interface
│   │   ├── SmartStrategyPanel.jsx  # Strategy, group sync, exit recommendations
│   │   ├── WhatIfSimulator.jsx     # Predictive scenario comparison engine
│   │   ├── LiveCommandCenter.jsx   # Main dashboard grid
│   │   ├── GateCard.jsx            # Individual gate/exit crowd card
│   │   └── DensityCard.jsx         # Compact density display
│   ├── context/
│   │   └── StadiumContext.jsx      # Global state: crowd data, votes, perks, messages
│   ├── logic/              # Pure, framework-agnostic business logic
│   │   ├── PredictiveEngine.js     # calculateTPlus5, calculateGroupRisk
│   │   ├── vendorPerks.js          # Perk trigger & catalogue logic
│   │   └── geminiApi.js            # Gemini prompt builder & API caller
│   ├── hooks/
│   │   └── useAutoReroute.js       # Auto-reroute detection hook
│   ├── engine/
│   │   └── PredictiveEngine.js     # Linear extrapolation forecast engine (T+5 history)
│   └── tests/              # Vitest unit test suites
│       ├── crowdInsight.test.js
│       ├── predictiveEngine.test.js
│       ├── vendorPerks.test.js
│       └── whatIfSimulator.test.js
├── .env.example            # Environment variable template
├── Dockerfile              # Container deployment config
└── vitest.config.js        # Test runner configuration
```

---

## Getting Started

### Prerequisites
- Node.js 18+  
- A Google Gemini API key → [Get one here](https://aistudio.google.com/app/apikey)

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/Princy-y/FlowSync_AI.git
cd FlowSync_AI

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
# Edit .env and add your Gemini API key

# 4. Start the dev server
npm run dev
```

### Environment Variables

```env
VITE_GEMINI_API_KEY=your_api_key_here
```

> **Security Note**: For production deployments, proxy Gemini API calls through a backend serverless function (e.g. Vercel Edge Functions) to avoid exposing the API key in the client bundle.

---

## Testing

```bash
# Run all unit tests
npm test

# Run tests once (CI mode)
npm run test:run

# Generate coverage report
npm run coverage
```

**Test coverage includes:**
- `getCrowdInsight` & `getConfidence` (StadiumContext helpers)
- `calculateTPlus5` & `calculateGroupRisk` (PredictiveEngine)
- `computeActivePerk` (VendorPerks — trigger, expiry, shape)
- `predictScenario` & `evalGroupRisk` (WhatIfSimulator logic)
- React component integration tests (FlowSyncAssistant, SmartStrategyPanel)

---

## Google Services Used

| Service | Usage |
|---|---|
| **Google Gemini 2.0 Flash** (`@google/generative-ai`) | AI chat, what-if strategy summaries, multi-language responses |
| **Google Fonts (Inter)** | Typography — loaded via `<link preconnect>` in `index.html` |
| **DiceBear Avatars API** | Operator avatar generation |

---

## Security Considerations

- API key loaded via `VITE_GEMINI_API_KEY` environment variable — never hardcoded
- `.env` excluded from version control via `.gitignore`
- User input sanitized (whitespace collapse, 400-char limit) before API calls
- Prompt injection protection: user message stripped of control characters before system prompt injection
- Per-session vote anti-spam via `votedLocations` Set
- Rate limiting on chat form via `isThinking` state lock + 3-second cooldown

---

## Docker Deployment

```bash
docker build -t flowsync-ai .
docker run -p 3000:80 -e VITE_GEMINI_API_KEY=your_key flowsync-ai
```

---

## Tech Stack

- **Frontend**: React 19, Vite 8
- **Styling**: Tailwind CSS v4, Framer Motion
- **AI**: Google Gemini 2.0 Flash (`@google/generative-ai`)
- **Icons**: Lucide React
- **Testing**: Vitest, @testing-library/react, jsdom
- **Linting**: ESLint 9 with react-hooks plugin

---

## 📄 License

MIT © Princy y
=======
