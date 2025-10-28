// src/firebase.js

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth"; // add this for authentication

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBSoI8_5GJDeo0QSmVBy7ppFvy_vmxl36c",
  authDomain: "stylesphere-17b5f.firebaseapp.com",
  projectId: "stylesphere-17b5f",
  storageBucket: "stylesphere-17b5f.firebasestorage.app",
  messagingSenderId: "293277871690",
  appId: "1:293277871690:web:6c4d0355c4a35b627580b3",
  measurementId: "G-DE0F9S7LHM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Firebase Authentication and export it for use
export const auth = getAuth(app);
export default app;
