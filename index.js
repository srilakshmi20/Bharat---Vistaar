require("dotenv").config();

const http = require("http");
const express = require("express");
const cors = require("cors");
const { createConsentStore } = require("./src/identity/consentStore");
const { requireConsent } = require("./src/identity/middleware");
const { createUnifiedGateway } = require("./src/gateway/unifiedGateway");
const { createVoiceBroker } = require("./src/interaction/voiceBroker");
const { DEFAULT_SCOPES, SUPPORTED_LANGUAGES } = require("./src/constants");

const app = express();
const port = Number(process.env.PORT || 4000);
const consentStore = createConsentStore();
const gateway = createUnifiedGateway();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : "*",
  })
);
app.use(express.json({ limit: "1mb" }));

app.get("/", (req, res) => {
  res.json({
    service: "Bharat-VISTAAR API",
    version: "1.0.0",
    architecture: "4-layer Intelligent Bridge (InDEA 2.0 aligned)",
    endpoints: "/api/v1/gateway/overview",
  });
});

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    timestamp: new Date().toISOString(),
    layerStatus: {
      interaction: "up",
      networkAndSecurity: "up",
      coreIntelligence: "up",
      dataFoundation: "up",
    },
  });
});

app.get("/api/v1/gateway/overview", (req, res) => {
  res.json({
    name: "Bharat-VISTAAR Unified Gateway",
    supportedLanguages: SUPPORTED_LANGUAGES,
    identityProvider: "AgriStack-style Federated Farmer ID + consent token",
    realtimeSources: ["IMD", "Agmarknet", "NPSS"],
    staticSources: ["AgriStack", "Soil Health Card", "ICAR Practices"],
    intelligencePipelines: [
      "Yield Intelligence (RicEns-Net style ensemble)",
      "Market Intelligence (SVMD-CNN-BiLSTM-A style pipeline)",
      "Risk Intelligence (AHP-XGBoost hybrid scoring)",
    ],
    scopeCatalog: DEFAULT_SCOPES,
  });
});

app.post("/api/v1/identity/consent", (req, res) => {
  const { farmerId, scopes, validHours, channel } = req.body || {};

  if (!farmerId || typeof farmerId !== "string") {
    return res.status(400).json({ error: "farmerId is required" });
  }

  const consent = consentStore.issueConsent({
    farmerId,
    scopes: Array.isArray(scopes) && scopes.length ? scopes : DEFAULT_SCOPES,
    validHours: Number.isFinite(validHours) ? validHours : 12,
    channel: channel || "web-dashboard",
  });

  return res.status(201).json({
    consentToken: consent.token,
    consent,
  });
});

app.post("/api/v1/identity/verify", (req, res) => {
  const { token, requiredScopes = [] } = req.body || {};
  const verification = consentStore.verifyConsent({ token, requiredScopes });
  return res.json(verification);
});

app.get(
  "/api/v1/data/realtime",
  requireConsent(consentStore, ["realtime_feeds"]),
  (req, res) => {
    const data = gateway.getRealtimeSnapshot({
      district: req.query.district,
      crop: req.query.crop,
    });
    return res.json(data);
  }
);

app.get(
  "/api/v1/data/registries/:farmerId",
  requireConsent(consentStore, ["static_registries"]),
  (req, res) => {
    if (req.consent.farmerId !== req.params.farmerId) {
      return res.status(403).json({
        error:
          "Consent token does not allow access to registries for this farmerId",
      });
    }

    const registries = gateway.getRegistries({
      farmerId: req.params.farmerId,
      crop: req.query.crop,
    });
    return res.json(registries);
  }
);

app.post(
  "/api/v1/intelligence/yield",
  requireConsent(consentStore, ["yield_model"]),
  (req, res) => {
    const payload = {
      ...req.body,
      farmerId: req.body?.farmerId || req.consent.farmerId,
    };
    return res.json(gateway.runYield(payload));
  }
);

app.post(
  "/api/v1/intelligence/market",
  requireConsent(consentStore, ["market_model"]),
  (req, res) => {
    const payload = {
      ...req.body,
      farmerId: req.body?.farmerId || req.consent.farmerId,
    };
    return res.json(gateway.runMarket(payload));
  }
);

app.post(
  "/api/v1/intelligence/risk",
  requireConsent(consentStore, ["risk_model"]),
  (req, res) => {
    const payload = {
      ...req.body,
      farmerId: req.body?.farmerId || req.consent.farmerId,
    };
    return res.json(gateway.runRisk(payload));
  }
);

const advisoryScopes = [
  "realtime_feeds",
  "static_registries",
  "yield_model",
  "market_model",
  "risk_model",
];

app.post(
  "/api/v1/gateway/advisory",
  requireConsent(consentStore, advisoryScopes),
  (req, res) => {
    const payload = {
      ...req.body,
      farmerId: req.body?.farmerId || req.consent.farmerId,
    };
    return res.json(gateway.generateAdvisory(payload));
  }
);

app.post(
  "/api/v1/interaction/text-dashboard",
  requireConsent(consentStore, advisoryScopes),
  (req, res) => {
    const payload = {
      ...req.body,
      farmerId: req.body?.farmerId || req.consent.farmerId,
    };
    return res.json(gateway.generateAdvisory(payload));
  }
);

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err, req, res, next) => {
  console.error(err);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: err.message || "Internal server error",
  });
});

const server = http.createServer(app);
const voiceBroker = createVoiceBroker({
  consentStore,
  gateway,
  bhashini: {
    enabled: process.env.BHASHINI_ENABLED,
    wsUrl: process.env.BHASHINI_WS_URL,
    apiKey: process.env.BHASHINI_API_KEY,
    serviceId: process.env.BHASHINI_SERVICE_ID,
    pipelineId: process.env.BHASHINI_PIPELINE_ID,
    socketIoPath: process.env.BHASHINI_SOCKET_IO_PATH,
    taskType: process.env.BHASHINI_TASK_TYPE,
    samplingRate: process.env.BHASHINI_SAMPLING_RATE,
    audioFormat: process.env.BHASHINI_AUDIO_FORMAT,
    responseFrequencyInSecs: process.env.BHASHINI_RESPONSE_FREQUENCY_IN_SECS,
    responseTaskSequenceDepth:
      process.env.BHASHINI_RESPONSE_TASK_SEQUENCE_DEPTH,
    startEventName: process.env.BHASHINI_EVENT_START,
    audioEventName: process.env.BHASHINI_EVENT_AUDIO,
    stopEventName: process.env.BHASHINI_EVENT_STOP,
    readyEventName: process.env.BHASHINI_EVENT_READY,
    responseEventName: process.env.BHASHINI_EVENT_RESPONSE,
    messageEventName: process.env.BHASHINI_EVENT_MESSAGE,
    abortEventName: process.env.BHASHINI_EVENT_ABORT,
    terminateEventName: process.env.BHASHINI_EVENT_TERMINATE,
    audioPayloadField: process.env.BHASHINI_AUDIO_PAYLOAD_FIELD,
    includeLegacyAudioFields: process.env.BHASHINI_INCLUDE_LEGACY_AUDIO_FIELDS,
    autoStartStream: process.env.BHASHINI_AUTO_START_STREAM,
    autoAdvisoryOnResponse: process.env.BHASHINI_AUTO_ADVISORY_ON_RESPONSE,
    connectTimeoutMs: process.env.BHASHINI_CONNECT_TIMEOUT_MS,
  },
});

server.on("upgrade", (request, socket, head) => {
  if (!voiceBroker.handleUpgrade(request, socket, head)) {
    socket.destroy();
  }
});

server.listen(port, () => {
  console.log(`Bharat-VISTAAR backend listening on port ${port}`);
});
