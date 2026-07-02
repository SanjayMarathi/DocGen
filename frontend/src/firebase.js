// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
const analytics = getAnalytics(app);
export const db = getFirestore(app);
