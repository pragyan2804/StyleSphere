// src/firebase.jsx

// ✅ Import required Firebase SDK modules (modular v9+)
import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported as isAnalyticsSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { 
  getFirestore, collection, getDocs, addDoc, doc, getDoc, setDoc 
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

// ✅ Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBSoI8_5GJDeo0QSmVBy7ppFvy_vmxl36c",
  authDomain: "stylesphere-17b5f.firebaseapp.com",
  projectId: "stylesphere-17b5f",
  storageBucket: "stylesphere-17b5f.appspot.com",
  messagingSenderId: "293277871690",
  appId: "1:293277871690:web:6c4d0355c4a35b627580b3",
  measurementId: "G-DE0F9S7LHM"
};


// ✅ Initialize Firebase App
const app = initializeApp(firebaseConfig);

// ✅ Initialize Analytics (only if supported, avoids errors on Node / SSR)
let analytics;
try {
  analytics = getAnalytics(app);
} catch (e) {
  analytics = null;
}

// ✅ Initialize core Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// ✅ Firestore utility helpers (optional but nice)
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
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

export async function setDocument(collectionName, id, data) {
  const dRef = doc(db, collectionName, id);
  await setDoc(dRef, data, { merge: true }); // merge:true avoids overwriting
  return id;
}

// ✅ Export app instance as default
export default app;
