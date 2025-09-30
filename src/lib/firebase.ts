import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  "projectId": "studio-1611588196-30ff8",
  "appId": "1:47165992375:web:f3e88449950487dde7cc32",
  "apiKey": "AIzaSyB3mxPmSEmi-DxchEf_AZL4-3-fhUYYkKo",
  "authDomain": "studio-1611588196-30ff8.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "47165992375"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
