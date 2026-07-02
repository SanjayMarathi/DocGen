import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBHAjGWD8XKFwW2gZ4IbuihW32FL9jGEpQ",
  authDomain: "docgen-ffcd5.firebaseapp.com",
  projectId: "docgen-ffcd5",
  storageBucket: "docgen-ffcd5.firebasestorage.app",
  messagingSenderId: "766256565896",
  appId: "1:766256565896:web:be4a2458effcaa09e7593d",
  measurementId: "G-LV9S6FH8Q1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;
export const db = getFirestore(app);
