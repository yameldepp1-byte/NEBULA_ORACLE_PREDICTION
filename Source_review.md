Source Review
The original supplied repository had missing frontend files, an invalid package manifest, a missing Vite entry HTML file, and an inconsistent Firebase import path.
This repository restructures those pieces into:
src/main.jsx
src/App.jsx
src/index.css
src/engine.js
src/services/firebase.js
server/index.js
index.html
valid package.json
The original source contained both live-history fetching and UI-only "scanning/hacking" simulations. The latter is not treated as proof of prediction capability.
No channel/join UI is included.
