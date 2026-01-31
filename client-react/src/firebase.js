import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBopDiLsztGYVJ9Rk9bA_PC5aLSMJvRZzk",
  authDomain: "eprkavach.firebaseapp.com",
  projectId: "eprkavach",
  storageBucket: "eprkavach.firebasestorage.app",
  messagingSenderId: "839972586162",
  appId: "1:839972586162:web:670e2b8663158e18173fab",
  measurementId: "G-70GP22SH9C"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export { app, analytics };
