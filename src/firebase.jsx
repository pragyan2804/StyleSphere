// src/firebase.jsx

// Import the functions you need from the SDKs you need (modular v9+)
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore, collection, getDocs, addDoc, doc, getDoc, setDoc, query, where } from "firebase/firestore";

// Your web app's Firebase configuration
// Note: For production it's better to use environment variables instead of committing keys.
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
let analytics;
try {
  // Analytics may fail in some environments (e.g., SSR), so guard it
  analytics = getAnalytics(app);
} catch (e) {
  // ignore analytics errors in non-browser or restricted environments
  analytics = null;
}

// Exports for auth and firestore
export const auth = getAuth(app);
export const db = getFirestore(app);

// Small convenience helpers (optional) to keep import sites simple
export async function getCollection(collectionName) {
  const colRef = collection(db, collectionName);
  const snapshot = await getDocs(colRef);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addDocument(collectionName, data) {
  const colRef = collection(db, collectionName);
  const docRef = await addDoc(colRef, data);
  return docRef.id;
}

export async function getDocument(collectionName, id) {
  const dRef = doc(db, collectionName, id);
  const snapshot = await getDoc(dRef);
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() };
}

// Set (create or overwrite) a document with a specific id in a collection
export async function setDocument(collectionName, id, data) {
  const dRef = doc(db, collectionName, id);
  await setDoc(dRef, data);
  return id;
}

export default app;
