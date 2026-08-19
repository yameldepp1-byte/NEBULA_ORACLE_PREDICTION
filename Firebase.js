// src/services/firebase.js

import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCbPZZ994J0vwLOCnaWRHI9UJ51UzzeDbA",
  authDomain: "dragon-ai-prediction.firebaseapp.com",
  databaseURL: "https://dragon-ai-prediction-default-rtdb.firebaseio.com",
  projectId: "dragon-ai-prediction",
  storageBucket: "dragon-ai-prediction.firebasestorage.app",
  messagingSenderId: "778136454169",
  appId: "1:778136454169:web:55795ad3adcc8df1901688",
  measurementId: "G-S5KN78613R"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Analytics
const analytics = getAnalytics(app);

// Realtime Database
const db = getDatabase(app);

export {
  app,
  analytics,
  db
};
