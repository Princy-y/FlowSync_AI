<div align="center">

# FlowSync AI
**The Autonomous Stadium Operating System**

[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Google Gemini API](https://img.shields.io/badge/Gemini_AI-8E75B2?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)](https://vitejs.dev/)

*Predict congestion before it happens. Route crowds intelligently. Monetize the flow.*

</div>

---

## The Challenge
Static stadium systems fail during high-density crowd movement. When thousands exit simultaneously, delays can turn into dangerous congestion. Existing solutions react too late — they don’t predict or adapt in real time.

---

## The "Mic Drop" Capabilities

* **Predictive Decision Engine**  
  Forecasts crowd congestion at T+5 and T+10 minutes using trend analysis.

* **What-If Simulation Engine**  
  Allows users to simulate future scenarios and make proactive decisions.

* **Crowd Voting Intelligence**  
  Real-time, Waze-style crowd reporting system with confidence scoring.

* **Auto-ReRouting AI System**  
  Dynamically updates routes when congestion spikes — no user input required.

* **Personalized Smart Modes**  
  Adapts routing for Fastest, Family, Group, and Elderly users.
  
* **Smart Vendor Perks System**  
  Incentivizes safer routes using targeted discounts — turning safety into revenue.

* **Confidence & Trust Layer**  
  Prevents misleading data with smart validation and reliability indicators.

---

## Technical Architecture

FlowSync AI uses a **Hybrid Intelligence Model**:

- System Logic → Handles calculations, predictions, routing  
- AI (Gemini) → Provides human-like explanations and guidance  

### Hidden Context Payload

Each AI request includes structured live data:

- Gate densities  
- Trends (increasing/decreasing)  
- Risk levels  
- User mode  
- Language preference  

This ensures **accurate, context-aware responses** instead of generic AI output.

---

## The Stack

* **Frontend:** React (Vite)
* **Styling:** Tailwind CSS + Glassmorphism UI
* **AI Engine:** Google Gemini API (`gemini-3.1-flash-lite-preview`)
* **State Management:** React Context API + Hooks

---

## Quick Start
Clone the repository:
```bash
git clone https://github.com/Princy-y/FlowSync_AI.git
```
Install the dependencies:
```bash
cd FlowSync_AI
npm install
```
Create .env file:
```bash
VITE_GEMINI_API_KEY=your_api_key_here
```
Boot up the system:
```bash
npm run dev
```


