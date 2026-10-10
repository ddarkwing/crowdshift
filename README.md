# CrowdShift — AI Climate Operations & Resilience Platform
### ForgeHacks 2026 · AI + Climate

**Tagline:** From climate signal to operational action.  
**Human-friendly pitch:** Weather tells you what will happen. CrowdShift tells you what to do.

CrowdShift converts climate forecasts, official warnings, venue context, crowd exposure and available resources into explainable operational risk, an AI-ranked action plan, what-if simulations, response tasks, communications and post-event learning.

---

## Start

Requires **Node.js 18+**. No npm packages are required.

```bash
npm start
```

Open:

```text
http://127.0.0.1:8080
```

Routes:

- `/` — mission landing page
- `/tool` — full CrowdShift platform

Development mode:

```bash
npm run dev
```

On macOS you can also double-click `Start CrowdShift.command`.

---

## Optional live ActionCast AI

CrowdShift works without an AI key by using a clearly labeled deterministic fallback plan.

For a real ForgeHacks sponsor integration:

1. Copy `.env.example` to `.env`
2. Add your Featherless API key

```text
FEATHERLESS_API_KEY=...
FEATHERLESS_MODEL=Qwen/Qwen2.5-7B-Instruct
```

3. Start with:

```bash
node --env-file=.env server.js
```

or edit the package script if you want `.env` loaded automatically.

Featherless is called only from the Node backend, so the browser never receives the secret.

---

# Product modules

## 1. CrowdShift Atlas
Cinematic Europe climate command view:
- 2026 heatwave scenario
- live Europe API mode
- countries and cities
- animated heat corridor
- atmospheric flow
- risk columns
- priority event intelligence
- safe-window finder
- time simulation

## 2. Climate Watch
- operational warning signals
- MeteoAlarm Belgium Atom feed
- official warning context
- capacity-conflict warnings
- “What changed?” delta view

## 3. Event Twin
Digital operational model for Forge Summer Festival:
- Main Stage
- Stage B
- Kids Zone
- Hall C
- water points
- response teams
- cooling infrastructure
- animated crowd flow
- zone-level climate/crowd/resource inspection

## 4. RiskGraph
Transparent deterministic risk model:
- Environmental: 40%
- Exposure: 25%
- Resources: 25%
- Official warning: 10%

The LLM **does not calculate the risk score**.

## 5. ActionCast AI
Inputs:
- deterministic risk state
- current environmental data
- venue capacity
- crowd exposure
- resources
- budget
- operator constraints
- retrieved guidance

Output:
- ranked actions
- cost
- risk reduction
- confidence
- evidence IDs
- projected risk

## 6. Guidance Retrieval
A small local guidance library is retrieved before ActionCast planning.
The build intentionally uses lightweight lexical retrieval instead of pretending to have a vector database.

Sources represented in the library:
- WHO heat / mass-gathering guidance
- WMO forecast-to-action principles
- Copernicus European climate context
- MeteoAlarm official warning context
- CrowdShift operational rules

## 7. Scenario Lab
Counterfactual interventions:
- open Hall C
- add water points
- add shade
- add response teams
- shift Kids Program

Recomputes:
- operational risk
- cost
- resource capacity
- resilience score
- budget state

## 8. Response Hub
- accountable tasks
- acknowledgement workflow
- Operations message
- Staff instructions
- Visitor alert
- Parent update
- SMS

## 9. Reports
Illustrative post-event intelligence:
- peak risk
- time in high risk
- actions taken
- response time
- modeled risk reduction
- resilience score before/after
- next-event recommendations

## 10. Evidence Center
- architecture
- source health
- guidance library
- decision audit trail

---

# Live APIs

## Open-Meteo Forecast API
Used for:
- temperature
- apparent temperature
- relative humidity
- wind
- weather code
- live European city sample
- Brussels conditions

## Open-Meteo Air Quality / CAMS
Used for:
- European AQI
- PM2.5
- UV index

## MeteoAlarm Belgium Atom Feed
Used for official warning context.

If any external feed is unavailable, the Node backend returns a **clearly labeled resilient fallback** rather than breaking the demo.

## Featherless AI
OpenAI-compatible chat completions for ActionCast planning.

---

# Recommended 2–3 minute judge flow

1. **Atlas** — play the 2026 heatwave timeline.
2. Hover France / Belgium, show Brussels priority event.
3. Toggle **Live Europe** briefly to prove real API integration.
4. Open **Climate Watch** to show official + operational warning context.
5. Open **Event Twin** — explain Climate × Crowd × Resources.
6. Click **Why 82?** — show deterministic RiskGraph.
7. Open **ActionCast AI** and generate a plan.
8. Show retrieved evidence and budget-aware actions.
9. Open **Scenario Lab**, click **Use recommended combination**.
10. Apply the scenario.
11. Show **Response Hub** acknowledgement + communications.
12. Finish on **Evidence Center** architecture.

---

# Hackathon honesty

- The **Heatwave 2026** mode is a reproducible visual scenario inspired by the extreme European heat context of 2026. It is not presented as a pixel-perfect live meteorological field.
- **Live Europe** is the real API mode.
- RiskGraph is deterministic.
- ActionCast is generative AI when a Featherless key is configured; otherwise the UI explicitly uses the deterministic fallback.
- The post-event report is illustrative demo data.

---

# Architecture

```text
Open-Meteo Weather ─┐
CAMS / AQI ─────────┼──> Context Engine ──> RiskGraph
MeteoAlarm ─────────┘                         │
Venue / Crowd / Resources ───────────────────┘
                                              │
                               Guidance Retrieval
                                              │
                                      ActionCast AI
                                              │
                                      Scenario Engine
                                              │
                                      Human Operator
                                              │
                           Response Hub + Audit + Report
```

---

# Files

```text
server.js
package.json
.env.example
data/
  event.json
  guidance.json
public/
  index.html
  styles.css
  app.js
```

No build step and no external JavaScript framework are required, which keeps the submission reliable and easy for judges to run.


## Landing additions
This version adds a narrative landing page that introduces CrowdShift, the prevention mission, the builder profile for Alex Corse, the European heat-resilience focus, and the path into the full tool.


# Final visualization runtime

This publish build uses the visual libraries for real runtime rendering:

- **Globe.gl 2.46.2** — interactive Earth hero on `/`.
- **MapLibre GL JS 6.13.0** — real interactive geographic Europe map on `/tool`.
- **deck.gl 9.4 beta** — GPU HeatmapLayer, HexagonLayer, ArcLayer, ScatterplotLayer and TextLayer.
- **NASA EOSDIS GIBS** — optional MODIS Terra true-color Earth-observation raster toggle.
- **Open-Meteo** — live European weather without an API key.
- **CAMS via Open-Meteo** — live AQI/PM2.5/UV without an API key.
- **MeteoAlarm Atom** — official warning context without an API key.
- **Featherless AI** — the only secret key needed for a live ActionCast LLM call.

The JavaScript visualization libraries are loaded from their public browser CDN distributions because the source archives supplied for MapLibre/deck.gl/globe.gl are development repositories and do not contain prebuilt `dist` bundles. A fully self-contained SVG fallback remains underneath the map, so a CDN outage does not create a blank judge demo.

## Keys

No key is required for the map, deck.gl, NASA GIBS, Open-Meteo or the MeteoAlarm feed used by this build.

For live ActionCast AI only:

```bash
cp .env.example .env
```

Then set:

```text
FEATHERLESS_API_KEY=YOUR_KEY
FEATHERLESS_MODEL=Qwen/Qwen2.5-7B-Instruct
```

Restart with `npm start`.
