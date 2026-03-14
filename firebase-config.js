// firebase-config.js
// Sustituye estos valores por los de tu proyecto en Firebase Console:
// Project Settings → Your apps → Add app (Web) → firebaseConfig

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCWerk0posSYTxsd6rPgyNTXzEVX6ZNg1c",
  authDomain: "time-counters-fa822.firebaseapp.com",
  projectId: "time-counters-fa822",
  storageBucket: "time-counters-fa822.firebasestorage.app",
  messagingSenderId: "634639228488",
  appId: "1:634639228488:web:e6fa35c3e0d783874d827d",
  measurementId: "G-2DG0WKRL6X"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
