// firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB_HZpcU6kDm-cRRcO0KAm-Rvpx9aZ0m-M",
  authDomain: "wily-f4673.firebaseapp.com",
  projectId: "wily-f4673",
  storageBucket: "wily-f4673.firebasestorage.app",
  messagingSenderId: "1078413249961",
  appId: "1:1078413249961:web:56691ec98ae05df2e0c8b8"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
