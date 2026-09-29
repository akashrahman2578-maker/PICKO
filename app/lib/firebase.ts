import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDZopUAUiqMG729N68eMZSKmyHjYZTeWpU",
  authDomain: "picko-shop-web.firebaseapp.com",
  projectId: "picko-shop-web",
  storageBucket: "picko-shop-web.firebasestorage.app",
  messagingSenderId: "186759838694",
  appId: "1:186759838694:web:f58fbe87f8e51aa278f427",
  measurementId: "G-V91SBSV8DW",
};

const app =
  getApps().length === 0
    ? initializeApp(firebaseConfig)
    : getApps()[0];

export const auth = getAuth(app);

export const db = getFirestore(app);