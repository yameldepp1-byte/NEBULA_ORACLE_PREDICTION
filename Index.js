import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import { WebSocketServer } from "ws";

const app = express();
const server = http.createServer(app);
const PORT = Number(process.env.PORT || 8787);
const HISTORY_URL = process.env.HISTORY_URL ||
  "https://draw.ar-lottery01.com/WinGo/WinGo_1M/GetHistoryIssuePage.json";

app.use(cors());
app.use(express.json());

let cache = { list: [], updatedAt: 0, error: null };

async function fetchHistory() {
  try {
    const r = await fetch(`${HISTORY_URL}?t=${Date.now()}`, {
      headers: { "user-agent": "NEBULA-ORACLE/2.0" }
    });
    if (!r.ok) throw new Error(`upstream HTTP ${r.status}`);
    const json = await r.json();
    const list = Array.isArray(json?.data?.list) ? json.data.list : [];
    if (!list.length) throw new Error("empty history");
    cache = { list, updatedAt: Date.now(), error: null };
    broadcast({ type: "history", ...cache });
  } catch (e) {
    cache.error = e.message;
    broadcast({ type: "error", error: e.message });
  }
}

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    updatedAt: cache.updatedAt,
    records: cache.list.length,
    upstream: HISTORY_URL
  });
});

app.get("/api/history", (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.json(cache);
});

const wss = new WebSocketServer({ server, path: "/ws" });
function broadcast(payload) {
  const msg = JSON.stringify(payload);
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(msg);
  }
}
wss.on("connection", socket => {
  socket.send(JSON.stringify({ type: "history", ...cache }));
});

setInterval(fetchHistory, 3000);
fetchHistory();

server.listen(PORT, () => {
  console.log(`NEBULA ORACLE server: http://localhost:${PORT}`);
});
