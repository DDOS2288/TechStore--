import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA5LihjIVjnL7mueGAgg29BG3mcpDh6mXc",
  authDomain: "techstore-22c1d.firebaseapp.com",
  projectId: "techstore-22c1d",
  storageBucket: "techstore-22c1d.firebasestorage.app",
  messagingSenderId: "196392160489",
  appId: "1:196392160489:web:bd16a79629791b3eb03478",
  measurementId: "G-F5PK0N4VCZ",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
