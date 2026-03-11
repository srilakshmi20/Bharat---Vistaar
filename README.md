# Bharat-VISTAAR

Bharat-VISTAAR (Virtually Integrated System to Access Agricultural Resources) is implemented as a federated Digital Public Infrastructure (DPI) prototype with a full 4-layer architecture.

## Implemented Architecture

1. Layer 1: Interaction
- Voice assistant channel (`/ws/voice`) for low-latency duplex conversation.
- Text + XAI dashboard in React for farmer-facing, explainable recommendations.

2. Layer 2: Network and Security
- Unified API Gateway in Express (`/api/v1/*`).
- Federated identity and consent token flow (`/api/v1/identity/consent`).

3. Layer 3: Core Intelligence
- Yield Intelligence (`RicEns-Net` style ensemble simulation).
- Market Intelligence (`SVMD-CNN-BiLSTM-A` style simulation).
- Risk Intelligence (`AHP-XGBoost` hybrid scoring simulation).

4. Layer 4: Data Foundation
- Real-time feed simulation: IMD weather, Agmarknet prices, NPSS pest alerts.
- Static registries: AgriStack-style profile, Soil Health Card, ICAR practices.

## Project Structure

```text
backend/
  index.js
  src/
    data/
    gateway/
    identity/
    intelligence/
    interaction/
    xai/
frontend/
  src/
    components/
```

## Prerequisites

- Node.js 18+ and npm 9+.

## Setup

### 1) Install dependencies

```bash
npm run install:all
```

or install manually:

```bash
npm install --prefix backend
npm install --prefix frontend
```

### 2) Run backend + frontend

```bash
npm run dev
```

This starts:
- Backend at `http://localhost:4000`
- Frontend at `http://localhost:3000`

## Environment

Backend environment example: `backend/.env.example`

```env
PORT=4000
CORS_ORIGIN=http://localhost:3000
BHASHINI_ENABLED=false
BHASHINI_WS_URL=wss://dhruva-api.bhashini.gov.in
BHASHINI_API_KEY=
BHASHINI_SERVICE_ID=
BHASHINI_TASK_TYPE=asr
BHASHINI_SAMPLING_RATE=8000
BHASHINI_AUDIO_FORMAT=wav
BHASHINI_RESPONSE_FREQUENCY_IN_SECS=2
BHASHINI_RESPONSE_TASK_SEQUENCE_DEPTH=1
BHASHINI_EVENT_START=start
BHASHINI_EVENT_AUDIO=audio
BHASHINI_EVENT_STOP=stop
BHASHINI_EVENT_READY=ready
BHASHINI_EVENT_RESPONSE=response
```

Create a real backend env file:

```powershell
Copy-Item backend\.env.example backend\.env
```

Frontend environment example: `frontend/.env.example`

```env
REACT_APP_API_BASE=http://localhost:4000
REACT_APP_WS_BASE=ws://localhost:4000
```

## Main API Endpoints

- `GET /health`
- `GET /api/v1/gateway/overview`
- `POST /api/v1/identity/consent`
- `POST /api/v1/identity/verify`
- `GET /api/v1/data/realtime`
- `GET /api/v1/data/registries/:farmerId`
- `POST /api/v1/intelligence/yield`
- `POST /api/v1/intelligence/market`
- `POST /api/v1/intelligence/risk`
- `POST /api/v1/gateway/advisory`
- `POST /api/v1/interaction/text-dashboard`

WebSocket:
- `ws://localhost:4000/ws/voice?token=<consent_token>`

## Bhashini Realtime Integration

### 1) Enable integration

In `backend/.env`:

```env
BHASHINI_ENABLED=true
BHASHINI_API_KEY=<your_bhashini_key>
BHASHINI_SERVICE_ID=<your_asr_service_id>
BHASHINI_WS_URL=wss://dhruva-api.bhashini.gov.in
```

### 2) Start project

```bash
npm run dev
```

### 3) Use GUI realtime mic stream

1. Open `http://localhost:3000`.
2. Issue consent token.
3. Open voice panel.
4. Click `Start Mic Stream`, speak, then click `Stop Mic`.
5. Live transcript appears from Bhashini response events.
6. Advisory is auto-generated from transcript when enabled.

### 4) Voice socket message contract

Client -> backend:
- `config`
- `start_bhashini_stream`
- `audio_chunk` (base64 PCM16 frames)
- `audio_end`
- `utterance` (mock/text fallback)

Backend -> client:
- `bhashini_status`
- `bhashini_ready`
- `transcript`
- `bhashini_error`
- `advisory`

If your Bhashini tenant uses different event names/payload fields, tune via env:
- `BHASHINI_EVENT_*`
- `BHASHINI_AUDIO_PAYLOAD_FIELD`
- `BHASHINI_INCLUDE_LEGACY_AUDIO_FIELDS`

## Demo Flow

1. Open frontend at `http://localhost:3000`.
2. Issue a consent token for a farmer ID (example: `FRM1001`).
3. Configure crop, district, sowing date, acreage, and loan amount.
4. Generate advisory from the unified gateway.
5. Use voice panel to ask market/yield/risk questions.

## One-Command Smoke Test

Run backend API smoke checks (health, consent, advisory, authorization):

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\smoke-test.ps1
```

Optional dependency install before checks:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\smoke-test.ps1 -InstallDeps
```

## Notes

- Models are deterministic simulation engines to represent architecture behavior.
- Interfaces are designed for replacing simulated connectors with live government/research APIs.
- InDEA 2.0 alignment is reflected through federated identity, consent-based access, and interoperable contracts.
