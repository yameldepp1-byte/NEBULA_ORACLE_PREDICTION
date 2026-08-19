import React, { useEffect, useMemo, useState } from "react";
import { predict, evaluate } from "./engine";

const API = "/api/history";

function Ball({ value }) {
  const n = Number(value);
  const color = [0,5].includes(n) ? "violet" : n % 2 === 0 ? "red" : "green";
  return <span className={`ball ${color}`}>{Number.isFinite(n) ? n : "?"}</span>;
}

export default function App() {
  const [history, setHistory] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [lastPeriod, setLastPeriod] = useState("");
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
  const [seconds, setSeconds] = useState(60);
  const [stats, setStats] = useState({ wins: 0, losses: 0, total: 0 });

  async function load() {
    try {
      const r = await fetch(API, { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      const list = Array.isArray(data.list) ? data.list : [];
      setHistory(list);
      setConnected(true);
      setError("");

      if (list.length) {
        const latest = list[0];
        setLastPeriod(String(latest.issueNumber || ""));
        setPrediction(predict(list));
      }
    } catch (e) {
      setConnected(false);
      setError("Live server unavailable. Start the backend with npm run dev.");
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      const now = new Date();
      setSeconds(60 - now.getSeconds());
    }, 250);
    return () => clearInterval(id);
  }, []);

  const nextPeriod = useMemo(() => {
    try { return lastPeriod ? (BigInt(lastPeriod) + 1n).toString() : "—"; }
    catch { return "—"; }
  }, [lastPeriod]);

  const latest = history[0];
  const result = latest && prediction ? evaluate(prediction, latest) : null;

  return (
    <main className="app">
      <header className="topbar">
        <div>
          <div className="eyebrow">LIVE ANALYTICS ENGINE</div>
          <h1>NEBULA <span>ORACLE</span></h1>
        </div>
        <div className={`status ${connected ? "online" : ""}`}>
          <i /> {connected ? "SERVER ONLINE" : "OFFLINE"}
        </div>
      </header>

      <section className="hero">
        <div className="period">
          <small>NEXT PERIOD</small>
          <strong>{nextPeriod}</strong>
          <div className="timer">{String(Math.max(0, seconds)).padStart(2,"0")}s</div>
        </div>

        <div className="prediction">
          <small>MODEL SIGNAL</small>
          <div className="signals">
            <div><label>SIZE</label><strong>{prediction?.size || "WAIT"}</strong></div>
            <div><label>COLOUR</label><strong>{prediction?.color || "WAIT"}</strong></div>
          </div>
          <div className="confidence">
            <span>Confidence</span>
            <b>{prediction?.confidence ?? 0}%</b>
          </div>
        </div>
      </section>

      {error && <div className="error">{error}</div>}

      <section className="panel">
        <div className="panel-head">
          <h2>Live Results</h2>
          <span>{history.length} records</span>
        </div>
        <div className="tape">
          {history.slice(0, 20).map((x, i) => (
            <div className="result" key={`${x.issueNumber}-${i}`}>
              <Ball value={x.number} />
              <span>{String(x.issueNumber || "").slice(-6)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="grid">
        <div className="panel">
          <div className="panel-head"><h2>Prediction Audit</h2><span>latest settlement</span></div>
          {result ? (
            <div className="audit">
              <div><span>Period</span><b>{latest.issueNumber}</b></div>
              <div><span>Actual</span><b><Ball value={latest.number} /></b></div>
              <div><span>Size</span><b className={result.sizeWin ? "win" : "loss"}>{result.size} {result.sizeWin ? "✓" : "×"}</b></div>
              <div><span>Colour</span><b className={result.colorWin ? "win" : "loss"}>{result.color} {result.colorWin ? "✓" : "×"}</b></div>
            </div>
          ) : <p className="muted">Waiting for a complete live cycle.</p>}
        </div>

        <div className="panel">
          <div className="panel-head"><h2>Engine Notes</h2></div>
          <ul className="notes">
            {(prediction?.reasons || ["Waiting for live data"]).map((x, i) => <li key={i}>{x}</li>)}
          </ul>
        </div>
      </section>

      <footer>
        <span>NEBULA ORACLE • REAL-TIME DASHBOARD</span>
        <span>Predictions are heuristic analytics, not guaranteed outcomes.</span>
      </footer>
    </main>
  );
}
