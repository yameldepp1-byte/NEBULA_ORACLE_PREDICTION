NEBULA ORACLE
A complete React/Vite real-time analytics dashboard with a small Node/Express data proxy and optional WebSocket stream.
Run
npm install
npm run dev
Open the Vite URL shown by the terminal.
For server-only:
npm run dev:server
Health check:
http://localhost:8787/health
Environment
Copy .env.example to .env and set the upstream history URL if required.
Firebase values should be supplied through Vite environment variables if Firebase persistence is enabled. Do not commit secrets or private service-account credentials.
Architecture
Browser → Node API proxy → upstream history feed
Browser can also connect to /ws for live updates.
The prediction engine is deliberately heuristic and its confidence is an analytical score, not a guarantee of future random outcomes.
Important
The upstream result provider can change, block requests, or become unavailable. The backend exposes an error state instead of pretending the feed is live.
