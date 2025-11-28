import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-analytics.js";
const firebaseConfig = {
  apiKey: "AIzaSyAXIoTE37SpCnsEbP7tEoddJYBfINuw0ZU",
  authDomain: "daniel-files.firebaseapp.com",
  projectId: "daniel-files",
  storageBucket: "daniel-files.firebasestorage.app",
  messagingSenderId: "283881473696",
  appId: "1:283881473696:web:f25e51850ee7d37520ebc5",
  measurementId: "G-GSEM73G3MR"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const analytics = getAnalytics(app);
export { db };