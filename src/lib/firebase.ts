import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  projectId: "opportune-composite-dfjbn",
  appId: "1:746995823793:web:64ea9762800586057ade90",
  apiKey: "AIzaSyAv4MVyQ6X0g8PVT4DFQhpLmqrZOEjcda8",
  authDomain: "opportune-composite-dfjbn.firebaseapp.com",
  storageBucket: "opportune-composite-dfjbn.firebasestorage.app",
  messagingSenderId: "746995823793"
};

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

// Initialize Firestore with custom database ID from config
export const db = getFirestore(app, "ai-studio-buildestimate-e77fefb1-7c79-42d1-85af-41895eace9ef");
