import React, { useReducer, useEffect, useMemo, useCallback, useContext, createContext } from "react";
import { predict, evaluate } from "./engine";

// ---------- Context ----------
const AppContext = createContext();
export const useApp = () => useContext(AppContext);

// ---------- Reducer ----------
const initialState = {
  history: [],
  prediction: null,
  lastPeriod: "",
  connected: false,
  error: null,
  loading: true,
  stats: { wins: 0, losses: 0, total: 0, streak: 0, maxStreak: 0 },
  predictionLog: [], // [{period, predicted, actual, correct}]
  settings: { refreshInterval: 3000, theme: 'dark' }
};

function appReducer(state, action) {
  switch (action.type) {
    case 'SET_HISTORY':
      return { ...state, history: action.payload, loading: false };
    case 'SET_PREDICTION':
      return { ...state, prediction: action.payload };
    case 'SET_LAST_PERIOD':
      return { ...state, lastPeriod: action.payload };
    case 'SET_CONNECTED':
      return { ...state, connected: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'ADD_RESULT':
      // पुराने रिजल्ट को लॉग में जोड़ें
      const newLog = [action.payload, ...state.predictionLog].slice(0, 50);
      // स्टैट्स अपडेट
      const { correct } = action.payload;
      const newStats = { ...state.stats };
      newStats.total += 1;
      if (correct) {
        newStats.wins += 1;
        newStats.streak += 1;
        if (newStats.streak > newStats.maxStreak) newStats.maxStreak = newStats.streak;
      } else {
        newStats.losses += 1;
        newStats.streak = 0;
      }
      return { ...state, predictionLog: newLog, stats: newStats };
    case 'SET_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };
    case 'RESET_STATS':
      return { ...state, stats: { wins: 0, losses: 0, total: 0, streak: 0, maxStreak: 0 }, predictionLog: [] };
    default:
      return state;
  }
}

// ---------- कस्टम हुक (localStorage) ----------
function useLocalStorage(key, initialValue) {
  const [stored, setStored] = React.useState(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch { return initialValue; }
  });
  const setValue = (value) => {
    try {
      const toStore = value instanceof Function ? value(stored) : value;
      setStored(toStore);
      localStorage.setItem(key, JSON.stringify(toStore));
    } catch {}
  };
  return [stored, setValue];
}

// ---------- App Component ----------
export default function App() {
  // ग्लोबल स्टेट
  const [state, dispatch] = useReducer(appReducer, initialState);
  const { history, prediction, lastPeriod, connected, error, loading, stats, predictionLog, settings } = state;

  // localStorage – सेटिंग्स और स्टैट्स सेव
  const [savedSettings, setSavedSettings] = useLocalStorage('nebula_settings', settings);
  const [savedStats, setSavedStats] = useLocalStorage('nebula_stats', stats);

  // जब settings बदलें तो localStorage अपडेट करें
  useEffect(() => {
    setSavedSettings(settings);
  }, [settings, setSavedSettings]);

  useEffect(() => {
    setSavedStats(stats);
  }, [stats, setSavedStats]);

  // ----- डेटा लोड करना -----
  const API = "/api/history";

  const loadData = useCallback(async () => {
    try {
      const r = await fetch(API, { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      const list = Array.isArray(data.list) ? data.list : [];
      dispatch({ type: 'SET_HISTORY', payload: list });
      dispatch({ type: 'SET_CONNECTED', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      if (list.length) {
        const latest = list[0];
        dispatch({ type: 'SET_LAST_PERIOD', payload: String(latest.issueNumber || '') });
        const newPred = predict(list);
        dispatch({ type: 'SET_PREDICTION', payload: newPred });

        // अगर पिछली भविष्यवाणी मौजूद है तो उसका मूल्यांकन करें
        if (prediction && prediction !== 'WAIT') {
          const result = evaluate(prediction, latest);
          if (result) {
            dispatch({
              type: 'ADD_RESULT',
              payload: {
                period: latest.issueNumber,
                predicted: { size: prediction.size, color: prediction.color },
                actual: { size: result.size, color: result.color },
                correct: result.isCorrect
              }
            });
          }
        }
      }
    } catch (e) {
      dispatch({ type: 'SET_CONNECTED', payload: false });
      dispatch({ type: 'SET_ERROR', payload: e.message });
      dispatch({ type: 'SET_LAST_PERIOD', payload: '' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [prediction]); // prediction डिपेंडेंसी – हर बार नई प्रेडिक्शन आने पर मूल्यांकन

  // पहली बार और इंटरवल पर लोड
  useEffect(() => {
    loadData();
    const id = setInterval(loadData, settings.refreshInterval);
    return () => clearInterval(id);
  }, [loadData, settings.refreshInterval]);

  // ----- टाइमर (सेकंड) -----
  const [seconds, setSeconds] = React.useState(60);
  useEffect(() => {
    const id = setInterval(() => {
      setSeconds(60 - new Date().getSeconds());
    }, 250);
    return () => clearInterval(id);
  }, []);

  // ----- अगला पीरियड -----
  const nextPeriod = useMemo(() => {
    try { return lastPeriod ? (BigInt(lastPeriod) + 1n).toString() : "—"; }
    catch { return "—"; }
  }, [lastPeriod]);

  // ----- लेटेस्ट रिजल्ट (ऑडिट के लिए) -----
  const latest = history[0];
  const auditResult = latest && prediction ? evaluate(prediction, latest) : null;

  // ----- थीम टॉगल -----
  const toggleTheme = () => {
    dispatch({ type: 'SET_SETTINGS', payload: { theme: settings.theme === 'dark' ? 'light' : 'dark' } });
  };

  // ----- स्टैट्स रीसेट -----
  const resetStats = () => dispatch({ type: 'RESET_STATS' });

  // ----- UI रेंडर -----
  return (
    <AppContext.Provider value={{ state, dispatch }}>
      <main className={`app ${settings.theme}`}>
        {/* हेडर */}
        <header className="topbar">
          <div>
            <div className="eyebrow">LIVE ANALYTICS ENGINE</div>
            <h1>NEBULA <span>ORACLE</span></h1>
          </div>
          <div className="header-controls">
            <button onClick={toggleTheme} className="theme-btn">
              {settings.theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <div className={`status ${connected ? "online" : ""}`}>
              <i /> {connected ? "SERVER ONLINE" : "OFFLINE"}
            </div>
          </div>
        </header>

        {/* हीरो सेक्शन */}
        <section className="hero">
          <div className="period">
            <small>NEXT PERIOD</small>
            <strong>{nextPeriod}</strong>
            <div className="timer">{String(Math.max(0, seconds)).padStart(2, "0")}s</div>
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
              <div className="conf-bar" style={{ width: `${prediction?.confidence ?? 0}%` }} />
            </div>
          </div>
        </section>

        {error && <div className="error">⚠️ {error}</div>}
        {loading && <div className="loading">⏳ Loading data...</div>}

        {/* लाइव रिजल्ट टेप */}
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

        {/* ग्रिड: ऑडिट + स्टैट्स + नोट्स */}
        <section className="grid">
          {/* ऑडिट */}
          <div className="panel">
            <div className="panel-head"><h2>Prediction Audit</h2><span>latest settlement</span></div>
            {auditResult ? (
              <div className="audit">
                <div><span>Period</span><b>{latest.issueNumber}</b></div>
                <div><span>Actual</span><b><Ball value={latest.number} /></b></div>
                <div><span>Size</span><b className={auditResult.sizeWin ? "win" : "loss"}>{auditResult.size} {auditResult.sizeWin ? "✓" : "×"}</b></div>
                <div><span>Colour</span><b className={auditResult.colorWin ? "win" : "loss"}>{auditResult.color} {auditResult.colorWin ? "✓" : "×"}</b></div>
                <div className="overall">{auditResult.isCorrect ? "✅ CORRECT" : "❌ INCORRECT"}</div>
              </div>
            ) : <p className="muted">Waiting for a complete live cycle.</p>}
          </div>

          {/* स्टैटिस्टिक्स */}
          <div className="panel">
            <div className="panel-head"><h2>Statistics</h2><button onClick={resetStats} className="reset-btn">↺ Reset</button></div>
            <div className="stats-grid">
              <div><label>Total</label><span>{stats.total}</span></div>
              <div><label>Wins</label><span className="win">{stats.wins}</span></div>
              <div><label>Losses</label><span className="loss">{stats.losses}</span></div>
              <div><label>Win %</label><span>{stats.total ? Math.round((stats.wins/stats.total)*100) : 0}%</span></div>
              <div><label>Streak</label><span>{stats.streak}</span></div>
              <div><label>Max Streak</label><span>{stats.maxStreak}</span></div>
            </div>
            {/* मिनी ट्रेंड बार – पिछले 10 परिणाम */}
            <div className="trend">
              {predictionLog.slice(0, 10).map((log, i) => (
                <span key={i} className={log.correct ? 'correct' : 'wrong'}>●</span>
              ))}
            </div>
          </div>

          {/* इंजन नोट्स */}
          <div className="panel">
            <div className="panel-head"><h2>Engine Notes</h2></div>
            <ul className="notes">
              {(prediction?.reasons || ["Waiting for live data"]).map((x, i) => <li key={i}>{x}</li>)}
            </ul>
            <div className="settings-mini">
              <label>Refresh: <select value={settings.refreshInterval} onChange={(e) => dispatch({ type: 'SET_SETTINGS', payload: { refreshInterval: Number(e.target.value) } })}>
                <option value={2000}>2s</option>
                <option value={3000}>3s</option>
                <option value={5000}>5s</option>
                <option value={10000}>10s</option>
              </select></label>
            </div>
          </div>
        </section>

        <footer>
          <span>NEBULA ORACLE • REAL-TIME DASHBOARD v2.0</span>
          <span>Predictions are heuristic analytics, not guaranteed outcomes.</span>
        </footer>
      </main>
    </AppContext.Provider>
  );
}

// ---------- Ball Component (स्थानीय) ----------
function Ball({ value }) {
  const n = Number(value);
  const color = [0, 5].includes(n) ? "violet" : n % 2 === 0 ? "red" : "green";
  return <span className={`ball ${color}`}>{Number.isFinite(n) ? n : "?"}</span>;
        }
