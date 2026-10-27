import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBNc-p35geotVsCXukU4VASimbTxfBfnh4",
  authDomain: "chikenfire-bdcf1.firebaseapp.com",
  projectId: "chikenfire-bdcf1",
  storageBucket: "chikenfire-bdcf1.firebasestorage.app",
  messagingSenderId: "27459712260",
  appId: "1:27459712260:web:811ba60830fa355005cc51",
  measurementId: "G-HVT9ZWDVHJ"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
