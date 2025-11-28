import React, { useState, useEffect, useRef, createContext } from 'react';
import { signInWithCustomToken, signInAnonymously, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, collection, addDoc, serverTimestamp, deleteDoc, setDoc, query, orderBy, updateDoc } from 'firebase/firestore';
import { ArrowLeft, ArrowRight, ShoppingCart, Heart, User, Sparkle, Camera, Save, Trash2, Search, MessageSquare, PlusCircle, CheckCircle, XCircle, Grid, Upload, DollarSign, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';


// ✅ Use your properly exported Firebase services
import { auth as fbAuth, db as fbDb } from './firebase';

import LiquidEther from './LiquidEther';
import PrismaticBurst from './PrismaticBurst';
import Orb from './Orb';
import Aurora from './Aurora';
import AuthPage from './AuthPage';



// Global variables for Firebase configuration.
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// Single source of truth for marketplace collection path used across the app
const MARKETPLACE_COLLECTION = `marketplace/${appId}/marketplace`;

// No Firebase config here — user will configure Firebase in a separate file/environment.
// Keep firebaseConfig empty so the app uses local fallback storage until configured.
const firebaseConfig = {};
const initialAuthToken = null;

// Context for sharing app state
const AppContext = createContext();

// Firebase initialization and authentication
// Use the already-initialized exports from src/firebase.jsx (fbAuth, fbDb)
const useFirebase = () => {
  const [auth, setAuth] = useState(null);
  const [db, setDb] = useState(null);
  const [userId, setUserId] = useState(null);
  const [user, setUser] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    try {
      if (fbAuth && fbDb) {
        setAuth(fbAuth);
        setDb(fbDb);
        console.debug('Firebase initialized via src/firebase exports');

        // Monitor auth state so we can display user displayName/email in the UI
        const unsubscribe = onAuthStateChanged(fbAuth, (u) => {
          setUser(u || null);
          setUserId(u ? u.uid : null);
          setIsAuthReady(true);
        });

        // Try to ensure there is a user (anonymous fallback)
        const ensureAuth = async () => {
          try {
            if (initialAuthToken) {
              try {
                await signInWithCustomToken(fbAuth, initialAuthToken);
              } catch (e) {
                console.error('Custom token sign-in failed:', e);
              }
            } else if (!fbAuth.currentUser) {
              try {
                await signInAnonymously(fbAuth);
              } catch (e) {
                if (e && e.code === 'auth/admin-restricted-operation') {
                  console.warn('Anonymous sign-in is disabled for this Firebase project. Continuing without auth.');
                } else {
                  console.error('Anonymous sign-in failed:', e);
                }
              }
            }
          } catch (err) {
            console.error('Error ensuring auth:', err);
          }
        };

        ensureAuth();

        return () => unsubscribe();
      } else {
        console.error('Firebase config is not available. Please ensure it is correctly provided.');
        setIsAuthReady(true);
      }
    } catch (error) {
      console.error('Error initializing Firebase:', error);
      setIsAuthReady(true);
    }
  }, []);

  return { auth, db, userId, user, isAuthReady };
};

const Header = ({ title, onBack, rightButtons }) => (
  <div className="flex items-center justify-between px-6 py-4 w-full">
    <div className="flex items-center space-x-2">
      {onBack && (
        <button onClick={onBack} className="p-2 rounded-full hover:bg-stone-800/10 transition-colors">
          <ArrowLeft size={24} className="text-stone-300" />
        </button>
      )}
      <h1 className="text-2xl font-bold tracking-wide">
        <span className="font-fugaz text-stone-200">{title}</span>
      </h1>
    </div>
    <div className="flex items-center space-x-4">
      {rightButtons}
    </div>
  </div>
);

// Small profile menu shown in the top-right of closet/marketplace screens
const ProfileMenu = ({ user, onLogout }) => {
  const [open, setOpen] = useState(false);
  const [profilePic, setProfilePic] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const menuRef = React.useRef(null);
  const displayText = user?.displayName || user?.email || (user?.uid ? (user.uid.length > 8 ? user.uid.slice(0,8) + '...' : user.uid) : 'Guest');

  // Fetch profile picture from Firestore when user changes
  useEffect(() => {
    if (user?.uid && fbDb) {
      const userDocRef = doc(fbDb, `users/${user.uid}`);
      const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          setProfilePic(docSnap.data()?.profilePicture || null);
        }
      });
      return () => unsubscribe();
    } else {
      setProfilePic(null);
    }
  }, [user?.uid]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleProfilePicChange = async (event) => {
    const file = event.target.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    if (isUploading) return;

    setIsUploading(true);
    try {
      // Upload to Cloudinary first
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'wardrobe_unsigned');
      formData.append('folder', `stylesphere/profiles/${user.uid}`);

      const resp = await fetch('https://api.cloudinary.com/v1_1/dgngmm6nt/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error('Upload failed');

      const imageUrl = data.secure_url;

      // Save the Cloudinary URL to Firestore
      if (user?.uid && fbDb) {
        const userDocRef = doc(fbDb, `users/${user.uid}`);
        await setDoc(userDocRef, {
          profilePicture: imageUrl,
          updatedAt: serverTimestamp()
        }, { merge: true });
      }
    } catch (error) {
      console.error('Error updating profile picture:', error);
      showToast('Failed to update profile picture', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="relative z-50" ref={menuRef}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center space-x-3 px-4 py-3 rounded-full hover:bg-stone-800/20 transition-colors glassy-button z-50 pointer-events-auto"
        title="Profile"
      >
        {profilePic ? (
          <img src={profilePic} alt="Profile" className="w-8 h-8 rounded-full object-cover border-2 border-stone-600" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-stone-700 flex items-center justify-center border-2 border-stone-600">
            <User size={18} className="text-stone-300" />
          </div>
        )}
        <span className="hidden sm:inline text-base font-serif text-stone-200">{displayText}</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-3 w-72 bg-stone-800/90 border border-stone-700 rounded-xl shadow-lg p-4 z-50 backdrop-blur-md pointer-events-auto">
          <div className="flex items-center space-x-4 mb-4">
            <div className="relative group">
              <label htmlFor="profile-pic-upload" className="cursor-pointer block">
                {profilePic ? (
                  <img src={profilePic} alt="Profile" className="w-16 h-16 rounded-full object-cover border-2 border-stone-600 group-hover:opacity-80 transition-opacity" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-stone-700 flex items-center justify-center border-2 border-stone-600 group-hover:bg-stone-600 transition-colors">
                    <User size={24} className="text-stone-300" />
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera size={20} className="text-white" />
                </div>
              </label>
              <input
                id="profile-pic-upload"
                type="file"
                accept="image/*"
                onChange={handleProfilePicChange}
                className="hidden"
              />
            </div>
            <div className="flex-1">
              <div className="text-lg font-serif text-stone-200 mb-1">Signed in as</div>
              <div className="text-lg text-stone-200 font-serif truncate">{user?.displayName || user?.email || user?.uid || 'Anonymous'}</div>
            </div>
          </div>
          <button
            onClick={() => { setOpen(false); onLogout && onLogout(); }}
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
          >
            <span className="font-serif">Logout</span>
          </button>
        </div>
      )}
    </div>
  );
};

const App = () => {
  const { auth, db, userId, user, isAuthReady } = useFirebase();
  const [screen, setScreen] = useState('login');
  const [closetItems, setClosetItems] = useState([]);  // Initialize as empty array
  // Marketplace products (moved here so UploadModal can add items)
  // Start with an empty marketplace; items are added by user uploads and Firestore sync.
  const [marketplaceProducts, setMarketplaceProducts] = useState([]);

  // Upload modal visibility
  const [isUploadModalVisible, setIsUploadModalVisible] = useState(false);
  // Edit modal visibility and currently editing item
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  // Closet edit modal visibility and currently editing closet item
  const [isEditClosetModalVisible, setIsEditClosetModalVisible] = useState(false);
  const [editingClosetItem, setEditingClosetItem] = useState(null);
  // Closet upload modal visibility
  const [isClosetUploadModalVisible, setIsClosetUploadModalVisible] = useState(false);
  const [savedOutfits, setSavedOutfits] = useState([]);
  const lastGeneratedFingerprintRef = useRef(null);
  const [generatedOutfit, setGeneratedOutfit] = useState(null);
  const [generatedIndex, setGeneratedIndex] = useState(0);
  const [selectedOutfitItems, setSelectedOutfitItems] = useState({
    Tops: null,
    Bottoms: null,
    Footwear: null,
  });
  //const [currentCategory, setCurrentCategory] = useState('Head'); no use as of
  const [isToastVisible, setIsToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success'); // 'success' or 'error'

  useEffect(() => {
    if (db && userId) {
      // Create a reference to the user's specific closet collection
      const closetRef = collection(db, `users/${userId}/closet`);
      const savedOutfitsRef = collection(db, `users/${userId}/savedOutfits`);

      const unsubscribeCloset = onSnapshot(closetRef, (snapshot) => {
        // Only map items that belong to the current user
        const items = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          userId: userId, // Add userId to each item for verification
          ...doc.data() 
        }));
        console.debug('Firestore closet items loaded:', items);
        setClosetItems(items); // Set the closet items directly from Firestore
      }, (error) => {
        console.error("Error fetching closet items:", error);
      });

      const unsubscribeSavedOutfits = onSnapshot(savedOutfitsRef, (snapshot) => {
        const outfits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setSavedOutfits(outfits);
      }, (error) => {
        console.error("Error fetching saved outfits:", error);
      });

      // Listen to generated outfit document
      const generatedOutfitsRef = collection(db, `users/${userId}/generatedOutfits`);
      const unsubscribeGenerated = onSnapshot(doc(generatedOutfitsRef, 'recommended'), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setGeneratedOutfit(data);
          // reset index to first recommendation whenever data changes
          setGeneratedIndex(0);
        }
      }, (error) => {
        console.warn("Note: No generated outfit yet, that's okay:", error);
      });

      return () => {
        unsubscribeCloset();
        unsubscribeSavedOutfits();
        unsubscribeGenerated();
      };
    }
  }, [db, userId]);

  // Subscribe to the global marketplace collection so all users see items after refresh
  useEffect(() => {
    if (!db) return;
    try {
  const marketplaceRef = collection(db, MARKETPLACE_COLLECTION);
  const q = query(marketplaceRef, orderBy('timestamp', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        console.debug('Marketplace snapshot received:', items.length);
        setMarketplaceProducts(items);
      }, (err) => {
        console.error('Error listening to marketplace collection:', err);
      });

      return () => unsubscribe();
    } catch (e) {
      console.error('Marketplace subscription error:', e);
    }
  }, [db]);

  // Load locally persisted closet items when Firebase is not configured
  useEffect(() => {
    try {
      if (!db || !userId) {
        // When no Firebase, load from localStorage
        const stored = localStorage.getItem('local_closet_items');
        if (stored) {
          const parsedLocal = JSON.parse(stored);
          if (Array.isArray(parsedLocal) && parsedLocal.length > 0) {
            setClosetItems(parsedLocal);
          } else {
            setClosetItems([]); // Show empty closet if no local items
          }
        } else {
          setClosetItems([]); // Show empty closet if no local storage
        }
      }
      // When Firebase is available, items will be loaded from Firestore subscription
    } catch (e) {
      console.error('Error loading local closet items:', e);
      setClosetItems([]); // Fallback to empty closet on error
    }
  }, [db, userId]);

  // Auto-generate up to 3 random combinations (Tops + Bottoms + Footwear)
  // and store them under `users/{userId}/generatedOutfits/recommended`.
  useEffect(() => {
    console.log('Auto-generate effect triggered. db:', !!db, 'userId:', userId, 'closetItems count:', closetItems?.length || 0);

    if (!db || !userId) {
      console.log('Skipping: no db or userId');
      return;
    }
    
    if (!Array.isArray(closetItems) || closetItems.length === 0) {
      console.log('Skipping: closetItems not ready or empty');
      return;
    }

    const tops = closetItems.filter(i => i.category === 'Tops');
    const bottoms = closetItems.filter(i => i.category === 'Bottoms');
    const footwear = closetItems.filter(i => i.category === 'Footwear');

    console.log('Filtered items - Tops:', tops.length, 'Bottoms:', bottoms.length, 'Footwear:', footwear.length);

    if (tops.length === 0 || bottoms.length === 0 || footwear.length === 0) {
      console.log('Skipping: missing category items');
      return; // not enough items to form a full outfit
    }

    // fingerprint to avoid re-writing for identical closet state
    const fingerprint = [...tops, ...bottoms, ...footwear].map(i => i.id).sort().join('|');
    console.log('Current fingerprint:', fingerprint);
    console.log('Last saved fingerprint:', lastGeneratedFingerprintRef.current);
    
    if (lastGeneratedFingerprintRef.current === fingerprint) {
      console.log('Skipping: same fingerprint as before');
      return;
    }

    const generateCombos = async () => {
      try {
        const combos = [];
        const seen = new Set();
        const maxCombos = 3;
        const totalPossible = tops.length * bottoms.length * footwear.length;

        const makeKey = (t, b, f) => `${t.id}|${b.id}|${f.id}`;
        while (combos.length < maxCombos && seen.size < totalPossible) {
          const t = tops[Math.floor(Math.random() * tops.length)];
          const b = bottoms[Math.floor(Math.random() * bottoms.length)];
          const f = footwear[Math.floor(Math.random() * footwear.length)];
          const key = makeKey(t, b, f);
          if (seen.has(key)) continue;
          seen.add(key);
          combos.push({
            items: [
              { id: t.id, category: 'Tops', imageUrl: t.imageUrl },
              { id: b.id, category: 'Bottoms', imageUrl: b.imageUrl },
              { id: f.id, category: 'Footwear', imageUrl: f.imageUrl },
            ]
          });
        }

        console.log('Generated combos:', combos.length, combos);

        // Persist in Firestore as a collection document
        const generatedOutfitsRef = collection(db, `users/${userId}/generatedOutfits`);
        await setDoc(doc(generatedOutfitsRef, 'recommended'), {
          combos,
          fingerprint,
          timestamp: serverTimestamp(),
        }, { merge: true });

        lastGeneratedFingerprintRef.current = fingerprint;
        console.log('✅ Auto-generated outfits saved successfully for user', userId);
      } catch (err) {
        console.error('❌ Error generating/saving outfits:', err);
      }
    };

    generateCombos();
  }, [closetItems, db, userId]);

  // When generatedOutfit or generatedIndex changes, update selectedOutfitItems
  useEffect(() => {
    if (!generatedOutfit || !Array.isArray(generatedOutfit.combos) || generatedOutfit.combos.length === 0) {
      setSelectedOutfitItems({ Tops: null, Bottoms: null, Footwear: null });
      return;
    }
    const idx = Math.max(0, Math.min(generatedIndex, generatedOutfit.combos.length - 1));
    const combo = generatedOutfit.combos[idx];
    const outfitObj = { Tops: null, Bottoms: null, Footwear: null };
    if (combo?.items) combo.items.forEach(item => outfitObj[item.category] = item);
    setSelectedOutfitItems(outfitObj);
  }, [generatedOutfit, generatedIndex]);

  const showToast = (message, type) => {
    setToastMessage(message);
    setToastType(type);
    setIsToastVisible(true);
    setTimeout(() => setIsToastVisible(false), 3000);
  };

  const handleLoginSignup = async () => {
    setScreen('dashboard');
  };

  const handleLogout = async () => {
    try {
      if (auth) {
        await signOut(auth);
      }
      setScreen('login');
      showToast('Logged out successfully.', 'success');
    } catch (e) {
      console.error('Logout failed:', e);
      showToast('Logout failed.', 'error');
    }
  };

  const handleUploadImage = async (category, file) => {
    console.debug('handleUploadImage called with category, file:', category, file);
    // If Firebase isn't configured, save locally to localStorage and update state
    if (!db || !userId) {
      try {
        const reader = new FileReader();
        reader.onload = (e) => {
          const imageUrl = e.target.result;
          const newItem = {
            id: `local-${Date.now()}`,
            category,
            imageUrl,
            name: file.name,
          };
          // persist local uploads separately
          const prevLocal = JSON.parse(localStorage.getItem('local_closet_items') || '[]');
          const updatedLocal = [newItem, ...prevLocal];
          localStorage.setItem('local_closet_items', JSON.stringify(updatedLocal));
          // update UI immediately
          setClosetItems(prev => [newItem, ...(Array.isArray(prev) ? prev : [])]);
          showToast('Image saved locally.', 'success');
        };
        reader.readAsDataURL(file);
      } catch (err) {
        console.error('Error saving image locally:', err);
        showToast('Error saving image locally.', 'error');
      }
      return;
    }
    // If Firebase is configured, upload to Cloudinary and save the returned URL in Firestore
    try {
      // Cloudinary unsigned upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'wardrobe_unsigned');
      // Optional: store under a per-user folder in Cloudinary
      formData.append('folder', `stylesphere/closet/${userId}`);

      const resp = await fetch('https://api.cloudinary.com/v1_1/dgngmm6nt/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await resp.json();
      if (!resp.ok) {
        console.error('Cloudinary upload failed:', data);
        showToast('Error uploading image to Cloudinary.', 'error');
        return;
      }

      const imageUrl = data.secure_url || data.url;
      const publicId = data.public_id;
      console.debug('Cloudinary upload success:', imageUrl, publicId);

      try {
        const docRef = await addDoc(collection(db, `users/${userId}/closet`), {
          category,
          imageUrl,
          cloudinary_public_id: publicId || null,
          timestamp: serverTimestamp(),
          userId: userId, // Add userId to document for ownership verification
          private: true, // Mark as private by default
        });
        console.debug('Firestore doc added:', docRef.id);
        showToast('Image uploaded successfully!', 'success');
      } catch (e) {
        showToast('Error saving image URL to database.', 'error');
        console.error('Error writing Firestore document: ', e);
      }
    } catch (err) {
      showToast('Error uploading image.', 'error');
      console.error('handleUploadImage unexpected error:', err);
    }
  };

  const handleSaveOutfit = async () => {
    if (!db || !userId) {
      showToast("Database not initialized. Please try again.", "error");
      return;
    }
    const outfitItems = Object.values(selectedOutfitItems).filter(item => item !== null);
    if (outfitItems.length < 4) {
      showToast("Please select one item from each category to save an outfit.", "error");
      return;
    }
    try {
      await addDoc(collection(db, `artifacts/${appId}/users/${userId}/savedOutfits`), {
        items: outfitItems,
        timestamp: serverTimestamp(),
      });
      showToast("Outfit saved successfully!", "success");
      setScreen('savedOutfits');
    } catch (e) {
      showToast("Error saving outfit.", "error");
      console.error("Error adding document: ", e);
    }
  };

  // Cycle through generated recommendations
  const prevGenerated = () => {
    if (!generatedOutfit?.combos?.length) return;
    setGeneratedIndex(i => {
      const len = generatedOutfit.combos.length;
      return ((i - 1) + len) % len;
    });
  };
  const nextGenerated = () => {
    if (!generatedOutfit?.combos?.length) return;
    setGeneratedIndex(i => {
      const len = generatedOutfit.combos.length;
      return (i + 1) % len;
    });
  };

  const handleDeleteClosetItem = async (item) => {
    if (!window.confirm('Are you sure you want to delete this item from your closet?')) return;

    // If Firebase isn't configured, remove from localStorage fallback
    if (!db || !userId) {
      try {
        const prevLocal = JSON.parse(localStorage.getItem('local_closet_items') || '[]');
        const updatedLocal = prevLocal.filter(i => i.id !== item.id);
        localStorage.setItem('local_closet_items', JSON.stringify(updatedLocal));
        // Also remove from current UI state
        setClosetItems(prev => Array.isArray(prev) ? prev.filter(i => i.id !== item.id) : prev);
        showToast('Item removed from local closet.', 'success');
      } catch (e) {
        console.error('Error removing local closet item:', e);
        showToast('Error removing item.', 'error');
      }
      return;
    }

    try {
      // Attempt to delete Firestore document
      await deleteDoc(doc(db, `users/${userId}/closet`, item.id));

      // Try to delete file from Storage if imageUrl points to our storage
      // Note: uploaded images are stored on Cloudinary (unsigned).
      // We do NOT delete Cloudinary assets from the client because unsigned uploads
      // can't be deleted securely from the browser (requires API secret).
      // So here we only remove the Firestore document. If you want to remove
      // Cloudinary assets, build a secure server-side endpoint that calls the
      // Cloudinary Admin API using your API key/secret and accepts the
      // `cloudinary_public_id` stored in the document.

      showToast("Item deleted.", "success");
    } catch (e) {
      console.error('Error deleting closet item:', e);
      showToast('Error deleting item.', 'error');
    }
  };

  const handleEditClosetItem = async (updated) => {
    // If Firebase isn't configured, update localStorage fallback
    if (!db || !userId) {
      try {
        const prevLocal = JSON.parse(localStorage.getItem('local_closet_items') || '[]');
        const updatedLocal = prevLocal.map(i => i.id === updated.id ? { ...i, category: updated.category } : i);
        localStorage.setItem('local_closet_items', JSON.stringify(updatedLocal));
        // Also update current UI state
        setClosetItems(prev => Array.isArray(prev) ? prev.map(i => i.id === updated.id ? { ...i, category: updated.category } : i) : prev);
        showToast('Category updated.', 'success');
      } catch (e) {
        console.error('Error updating local closet item:', e);
        showToast('Error updating item.', 'error');
      }
      return;
    }

    try {
      // Update Firestore document with new category
      const itemRef = doc(db, `users/${userId}/closet`, updated.id);
      await updateDoc(itemRef, {
        category: updated.category,
        timestamp: serverTimestamp(),
      });
      showToast('Category updated.', 'success');
    } catch (e) {
      console.error('Error updating closet item:', e);
      showToast('Error updating item.', 'error');
    }
  };

  const handleRemoveOutfit = () => {
    setSelectedOutfitItems({
      Head: null,
      Tops: null,
      Bottoms: null,
      Footwear: null,
    });
    showToast("Outfit removed.", "success");
  };

  const handleRemoveSavedOutfit = async (outfitId) => {
    if (!db || !userId) {
      showToast("Database not initialized. Please try again.", "error");
      return;
    }
    try {
      await deleteDoc(doc(db, `users/${userId}/savedOutfits`, outfitId));
      showToast("Outfit deleted successfully!", "success");
    } catch (e) {
      showToast("Error deleting outfit.", "error");
      console.error("Error removing document: ", e);
    }
  };

  const getRandomOutfit = () => {
    const headwear = closetItems.filter(item => item.category === 'Head');
    const tops = closetItems.filter(item => item.category === 'Tops');
    const bottoms = closetItems.filter(item => item.category === 'Bottoms');
    const footwear = closetItems.filter(item => item.category === 'Footwear');

    const randomHead = headwear[Math.floor(Math.random() * headwear.length)];
    const randomTop = tops[Math.floor(Math.random() * tops.length)];
    const randomBottom = bottoms[Math.floor(Math.random() * bottoms.length)];
    const randomFootwear = footwear[Math.floor(Math.random() * footwear.length)];

    setSelectedOutfitItems({
      Head: randomHead,
      Tops: randomTop,
      Bottoms: randomBottom,
      Footwear: randomFootwear,
    });
  };

  const MainLayout = ({ children }) => (
    <div className="relative flex flex-col w-full h-screen bg-transparent text-stone-200">
      {/* top-right upload button removed (upload action moved above Filters in Marketplace) */}
      <div className="absolute inset-0 -z-10 bg-black overflow-hidden" >
        <Orb
        hoverIntensity={0.5}
        rotateOnHover={true}
        hue={0}
        forceHoverState={false}
      />
      </div>
      <div className="flex flex-col flex-grow overflow-hidden z-0">
        <Header
          title="StyleSphere"
          onBack={screen !== 'dashboard' ? () => setScreen('dashboard') : null}
          rightButtons={
            screen === 'dashboard' ? (
              <ProfileMenu user={user} onLogout={handleLogout} />
            ) : (
              <button
                onClick={() => setScreen('dashboard')}
                className="flex items-center space-x-2 px-4 py-2 bg-stone-800/50 rounded-full hover:bg-stone-700/50 transition-colors text-sm font-semibold lg:hidden glassy-button"
              >
                <User size={20} />
                <span className="hidden sm:inline">User ID</span>
              </button>
            )
          }
        />
        <main className="flex-grow overflow-y-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );

const LoginSignupScreen = () => (
    <div className="relative w-full min-h-screen">
    {/* LiquidEther background with absolute positioning */}
    <div className="absolute inset-0 -z-10 bg-black">
      <LiquidEther
        colors={['#5227FF', '#FF9FFC', '#B19EEF']}
        mouseForce={70}
        cursorSize={100}
        isViscous={false}
        viscous={80}
        iterationsViscous={32}
        iterationsPoisson={32}
        resolution={0.5}
        isBounce={false}
        autoDemo={true}
        autoSpeed={0.5}
        autoIntensity={2.2}
        takeoverDuration={0.1}
        autoResumeDelay={1000}
        autoRampDuration={0.6}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
    <div className="flex items-center justify-center min-h-screen relative z-10 p-4">
      <div className="w-full p-8 rounded-2xl shadow-2xl space-y-6 text-center lg:max-w-lg backdrop-blur-md">
        <h1 className="text-4xl font-bold tracking-wide">
          Welcome to{' '}
          <span className="font-fugaz text-purple-500 text-7xl inline-block">
            StyleSphere
          </span>
        </h1>
        <div className="space-y-4 pt-4">
          <input
            type="email"
            placeholder="Email"
            className="w-full px-5 py-3 rounded-lg border border-stone-700 bg-stone-900/50 text-stone-200 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow glassy-input"
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full px-5 py-3 rounded-lg border border-stone-700 bg-stone-900/50 text-stone-200 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow glassy-input"
          />
        </div>
        <div className="space-y-4">
          <button
            onClick={handleLoginSignup}
            className="w-full text-white font-semibold py-3 rounded-lg transition-colors shadow-lg glassy-button-primary"
          >
            Login
          </button>
          <button
            onClick={handleLoginSignup}
            className="w-full text-sm text-purple-500 font-semibold py-2 rounded-lg glassy-button-secondary"
          >
            NEW USER? CLICK HERE!
          </button>
        </div>
        <div className="text-sm text-stone-500 mt-6">
          User ID: <span className="font-mono text-xs">{userId || 'Loading...'}</span>
        </div>
      </div>
    </div>
  </div>
);




  const DashboardScreen = () => (
  <div className="absolute inset-0 w-full h-screen flex items-center justify-center">
    <div className="flex gap-12 z-10">
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="w-96 h-96 p-8 rounded-2xl shadow-2xl text-center backdrop-blur-md flex items-center justify-center"
        onClick={() => setScreen('closet')}
      >
        <h2 className="text-4xl font-extrabold text-stone-200">
          My Closet
        </h2>
      </motion.div>

      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="w-96 h-96 p-8 rounded-2xl shadow-2xl text-center backdrop-blur-md flex items-center justify-center"
        onClick={() => setScreen('marketplace')}
      >
        <h2 className="text-4xl font-extrabold text-stone-200">
          Marketplace
        </h2>
      </motion.div>
    </div>
  </div>
);


  const ClosetScreen = () => {
  const categories = ["Tops", "Bottoms", "Footwear"];
  const [selectedFilter, setSelectedFilter] = useState("All");

  // Filter items by both category and user ownership
  const filteredItems = selectedFilter === "All"
    ? closetItems.filter(item => item.userId === userId) // Only show user's own items
    : closetItems.filter(item => item.category === selectedFilter && item.userId === userId);  const onImageClick = (item) => {
  
    showToast(`Clicked on ${item.category} item!`, "success");
  };

  return (
    <div className="flex flex-grow w-full overflow-hidden p-6">
      <div className="flex flex-col lg:flex-row flex-grow w-full space-y-4 lg:space-y-0 lg:space-x-6">
        <div className="flex-grow flex flex-col p-4 rounded-2xl shadow-xl overflow-hidden backdrop-blur-md">
          <div className="flex overflow-x-auto space-x-2 pb-4 no-scrollbar">
            <button
              onClick={() => setSelectedFilter("All")}
              className={`px-6 py-2 rounded-full font-medium transition-colors whitespace-nowrap glassy-category-button ${
                selectedFilter === "All"
                  ? "bg-purple-600/60 text-white shadow-lg"
                  : "text-stone-300 hover:bg-stone-600/40"
              }`}
            >
              All
            </button>
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedFilter(category)}
                className={`px-6 py-2 rounded-full font-medium transition-colors whitespace-nowrap glassy-category-button ${
                  selectedFilter === category
                    ? "bg-purple-600/60 text-white shadow-lg"
                    : "text-stone-300 hover:bg-stone-600/40"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
          <div className="flex-grow overflow-y-auto">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-2">
                {filteredItems.length > 0 ? (
                filteredItems.map(item => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                    className="relative group rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer glassy-item"
                    onClick={() => onImageClick(item)}
                  >
                    <img
                      src={item.imageUrl}
                      alt={item.category}
                      className="w-full h-48 object-cover object-center"
                    />
                    {/* edit and delete buttons - shown on hover */}
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingClosetItem(item); setIsEditClosetModalVisible(true); }}
                      className="absolute top-2 left-2 bg-black/40 p-2 rounded-full text-stone-200 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
                      title="Edit category"
                    >
                      <Sparkle size={16} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteClosetItem(item); }}
                      className="absolute top-2 right-2 bg-black/40 p-2 rounded-full text-stone-200 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </motion.div>
                ))
                ) : (
                <div className="col-span-full text-center p-8 text-stone-500 text-lg">
                  No items in this category. Upload something!
                </div>
                )}
            </div>
          </div>
        </div>
      
          <div className="flex-shrink-0 w-full lg:w-96 p-6 rounded-2xl shadow-xl flex flex-col items-center space-y-4 backdrop-blur-md">
            <div className="w-full">
              <div className="flex items-center justify-between w-full mb-3">
                <button onClick={prevGenerated} className="p-2 rounded-full bg-black/30 hover:bg-black/50 mr-3">
                  <ArrowLeft size={18} />
                </button>
                <h3 className="text-xl font-bold text-stone-200 flex-1 text-center px-3">Recommended Outfits for the Day</h3>
                <div className="flex items-center space-x-2 ml-3">
                  <span className="text-sm text-stone-400">{generatedOutfit?.combos ? `${generatedIndex+1}/${generatedOutfit.combos.length}` : '0/0'}</span>
                  <button onClick={nextGenerated} className="p-2 rounded-full bg-black/30 hover:bg-black/50">
                    <ArrowRight size={18} />
                  </button>
                </div>
              </div>
              <div className="w-full space-y-3">
                {categories.map(category => (
                  <div key={category} className="flex flex-col items-center p-3 bg-stone-700/50 rounded-lg shadow-md glassy-card">
                    <p className="font-semibold text-sm text-stone-400">{category}</p>
                    <img
                      src={selectedOutfitItems[category]?.imageUrl || `https://placehold.co/150x150/292524/a8a29e?text=${category}`}
                      alt={`${category} item`}
                      className="w-24 h-24 object-cover object-center mt-2 rounded-md"
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="w-full space-y-3 pt-4">
              <button
                onClick={handleSaveOutfit}
                className="w-full flex items-center justify-center space-x-2 text-white font-semibold py-3 rounded-lg shadow-lg glassy-button-primary"
              >
                <Save size={20} />
                <span>Save Outfit</span>
              </button>
              <button
                onClick={handleRemoveOutfit}
                className="w-full flex items-center justify-center space-x-2 text-white font-semibold py-3 rounded-lg shadow-lg glassy-button-danger"
              >
                <Trash2 size={20} />
                <span>Remove Outfit</span>
              </button>
              <button
                onClick={() => setIsClosetUploadModalVisible(true)}
                className="w-full flex items-center justify-center space-x-2 text-white font-semibold py-3 rounded-lg shadow-lg glassy-button-upload"
              >
                <Camera size={20} />
                <span>Upload Image</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  const SavedOutfitsScreen = () => (
    <div className="flex-grow p-6">
      <div className="w-full">
        {savedOutfits.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {savedOutfits.map((outfit) => (
              <motion.div
                key={outfit.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-stone-800/40 rounded-2xl shadow-xl p-6 flex flex-col items-center space-y-4 backdrop-blur-md glassy-card"
              >
                <div className="flex flex-wrap justify-center gap-4">
                  {outfit.items.map((item, index) => (
                    <div key={index} className="flex flex-col items-center">
                      <img
                        src={item.imageUrl}
                        alt={item.category}
                        className="w-24 h-24 object-cover object-center rounded-lg shadow-md"
                      />
                      <span className="text-xs font-medium text-stone-400 mt-1">{item.category}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => handleRemoveSavedOutfit(outfit.id)}
                  className="p-3 text-white rounded-full shadow-lg glassy-button-danger"
                >
                  <Trash2 size={20} />
                </button>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center text-stone-500 text-lg mt-10">
            You haven't saved any outfits yet.
          </div>
        )}
      </div>
    </div>
  );
  
  // --- UTILITIES ---

// 1. Unique ID generator (essential for new items)
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2);

// 2. Mock Toast Notification (temporary replacement for the 'showToast' prop)
const mockShowToast = (message, type = 'info') => {
  // We use console logging as a temporary notification method
  console.log(`[TOAST ${type.toUpperCase()}]: ${message}`);
  // In a real app, this would update a global UI component
  alert(`${type.toUpperCase()}: ${message}`); // Using alert as a quick visible fallback in case console isn't checked
};

// --- UPLOAD MODAL COMPONENT ---

// Simple modal for uploading directly into the user's closet (file + category)
const UploadClosetModal = ({ isVisible, onClose, onUpload, categories }) => {
  const [file, setFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [category, setCategory] = useState(categories && categories[0] ? categories[0] : 'Tops');

  useEffect(() => {
    if (!isVisible) {
      // cleanup when modal closes
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
      setFile(null);
      setImagePreviewUrl(null);
      setCategory(categories && categories[0] ? categories[0] : 'Tops');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible]);

  const handleFileChangeCloset = (e) => {
    const f = e.target.files[0];
    if (f && f.type.startsWith('image/')) {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
      const url = URL.createObjectURL(f);
      setFile(f);
      setImagePreviewUrl(url);
    } else {
      setFile(null);
      setImagePreviewUrl(null);
      mockShowToast('Please select a valid image file.', 'error');
    }
  };

  const handleSubmitCloset = (e) => {
    e.preventDefault();
    if (!file) {
      mockShowToast('Select an image to upload.', 'error');
      return;
    }
    // Call parent handler with (category, file)
    onUpload(category, file);
    onClose();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-stone-800 p-6 rounded-xl w-full max-w-md shadow-2xl border border-purple-700/50">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Camera size={20} />
            <span>Upload to My Closet</span>
          </h2>
          <button onClick={onClose} className="p-2 text-stone-400 hover:text-white rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmitCloset} className="space-y-4">
          <div className="flex flex-col">
            <label className="text-stone-300 mb-1 font-medium">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="p-3 rounded-lg bg-stone-700 text-white border border-stone-600 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-colors appearance-none"
            >
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>

          <div className="flex flex-col items-center border border-dashed border-stone-600 p-4 rounded-lg">
            <label htmlFor="closet-file-upload" className="text-yellow-400 cursor-pointer flex items-center space-x-2 hover:text-yellow-300 transition-colors">
              <Camera size={18} />
              <span className="font-semibold">Choose Image</span>
            </label>
            <input id="closet-file-upload" type="file" accept="image/*" onChange={handleFileChangeCloset} className="hidden" />
            {imagePreviewUrl ? (
              <img src={imagePreviewUrl} alt="Preview" className="mt-3 w-32 h-32 object-cover rounded-md shadow-md" />
            ) : (
              <p className="text-sm text-stone-500 mt-2">No image selected</p>
            )}
          </div>

          <div className="flex space-x-2">
            <button type="submit" className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 rounded-lg">Upload</button>
            <button type="button" onClick={onClose} className="flex-1 bg-stone-700 hover:bg-stone-600 text-white font-semibold py-3 rounded-lg">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Edit modal for updating existing marketplace items
const EditItemModal = ({ isVisible, onClose, item, onSave }) => {
  const [form, setForm] = useState({
    name: item?.name || '',
    price: item?.price || '',
    category: item?.category || 'Tops',
    availability: item?.availability || 'buy',
    gender: item?.gender || 'Unisex',
    file: null,
    imagePreviewUrl: item?.imageUrl || null,
  });

  useEffect(() => {
    setForm({
      name: item?.name || '',
      price: item?.price || '',
      category: item?.category || 'Tops',
      availability: item?.availability || 'buy',
      gender: item?.gender || 'Unisex',
      file: null,
      imagePreviewUrl: item?.imageUrl || null,
    });
  }, [item]);

  if (!isVisible) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      if (form.imagePreviewUrl && form.imagePreviewUrl.startsWith && form.imagePreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(form.imagePreviewUrl);
      }
      const url = URL.createObjectURL(file);
      setForm(prev => ({ ...prev, file, imagePreviewUrl: url }));
    } else {
      mockShowToast('Please select a valid image file.', 'error');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const updated = {
      ...item,
      name: form.name,
      price: Number(form.price) || null,
      category: form.category,
      availability: form.availability,
      gender: form.gender,
      file: form.file,
      imagePreviewUrl: form.imagePreviewUrl,
    };
    onSave(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-stone-800 p-6 rounded-xl w-full max-w-lg shadow-2xl border border-purple-700/50">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Edit Item</h2>
          <button onClick={onClose} className="p-2 text-stone-400 hover:text-white rounded-full transition-colors"><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col">
            <label className="text-stone-300 mb-1 font-medium">Product Name</label>
            <input name="name" value={form.name} onChange={handleChange} className="p-3 rounded-lg bg-stone-700 text-white" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <input name="price" type="number" value={form.price} onChange={handleChange} className="p-3 rounded-lg bg-stone-700 text-white" required />
            <select name="availability" value={form.availability} onChange={handleChange} className="p-3 rounded-lg bg-stone-700 text-white">
              <option value="buy">Buy</option>
              <option value="rent">Rent</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <select name="category" value={form.category} onChange={handleChange} className="p-3 rounded-lg bg-stone-700 text-white">
              <option>Tops</option>
              <option>Bottoms</option>
              <option>Footwear</option>
            </select>
            <select name="gender" value={form.gender} onChange={handleChange} className="p-3 rounded-lg bg-stone-700 text-white">
              <option>Unisex</option>
              <option>Mens</option>
              <option>Womens</option>
            </select>
          </div>
          <div className="flex flex-col items-center border border-dashed border-stone-600 p-4 rounded-lg">
              <label htmlFor="edit-file-upload" className="text-yellow-400 cursor-pointer flex items-center space-x-2">
                <Camera size={18} />
                <span className="font-semibold">Change Image</span>
              </label>
              <input id="edit-file-upload" type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            {form.imagePreviewUrl ? <img src={form.imagePreviewUrl} alt="Preview" className="mt-3 w-32 h-32 object-cover rounded-md" /> : <p className="text-sm text-stone-500">No image</p>}
          </div>
          <div className="flex space-x-2">
            <button type="submit" className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 rounded-lg">Save</button>
            <button type="button" onClick={onClose} className="flex-1 bg-stone-700 hover:bg-stone-600 text-white font-semibold py-3 rounded-lg">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Modal for editing closet item category
const EditClosetItemModal = ({ isVisible, onClose, item, onSave }) => {
  const [category, setCategory] = useState(item?.category || 'Tops');
  const categories = ['Tops', 'Bottoms', 'Footwear'];

  useEffect(() => {
    setCategory(item?.category || 'Tops');
  }, [item]);

  if (!isVisible) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...item, category });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-stone-800 p-6 rounded-xl w-full max-w-md shadow-2xl border border-purple-700/50">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Edit Item Category</h2>
          <button onClick={onClose} className="p-2 text-stone-400 hover:text-white rounded-full transition-colors"><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="mb-4">
            <img src={item?.imageUrl} alt="Item preview" className="w-full h-40 object-cover rounded-lg mb-4" />
          </div>
          <div className="flex flex-col">
            <label className="text-stone-300 mb-2 font-medium">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="p-3 rounded-lg bg-stone-700 text-white border border-stone-600 focus:border-purple-500 focus:outline-none"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div className="flex space-x-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-stone-700 hover:bg-stone-600 text-white rounded-lg font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const UploadModal = ({ isVisible, onClose, onUpload, categories }) => {
  const [form, setForm] = useState({
    name: '',
    price: '',
    category: categories[0] || 'Tops',
    availability: 'buy',
    gender: 'Unisex',
    file: null,
    imagePreviewUrl: null,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };
  
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      // Clean up previous object URL to free memory
      if (form.imagePreviewUrl) {
        URL.revokeObjectURL(form.imagePreviewUrl);
      }
      const url = URL.createObjectURL(file);
      setForm(prev => ({ ...prev, file, imagePreviewUrl: url }));
    } else {
      setForm(prev => ({ ...prev, file: null, imagePreviewUrl: null }));
      mockShowToast("Please select a valid image file.", "error");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const { name, price, category, availability, gender, imagePreviewUrl } = form;

    if (!name || !price || !imagePreviewUrl) {
      mockShowToast("Please fill all required fields and select an image.", "error");
      return;
    }

    // In a real app, we pass the File as well so the handler can upload it.
    const newProduct = {
      id: generateId(),
      name,
      price: parseInt(price),
      category,
      availability,
      gender,
      // Use local preview URL for immediate UI feedback
      imageUrl: imagePreviewUrl,
      // Pass the original File so the uploader can POST it to Cloudinary
      file: form.file,
    };

    onUpload(newProduct);

    // Reset form and close modal. Do NOT revoke the object URL here because
    // the marketplace preview may still use it until Cloudinary URL replaces it.
    setForm({
      name: '',
      price: '',
      category: categories[0] || 'Tops',
      availability: 'buy',
      gender: 'Unisex',
      file: null,
      imagePreviewUrl: null,
    });
    onClose();
  };

  if (!isVisible) return null;

  // Backdrop and Modal Content
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-stone-800 p-6 rounded-xl w-full max-w-lg shadow-2xl border border-purple-700/50">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
            <Upload className="text-yellow-400" size={24} />
            <span>List Item for Marketplace</span>
          </h2>
          <button onClick={onClose} className="p-2 text-stone-400 hover:text-white rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div className="flex flex-col">
            <label htmlFor="productName" className="text-stone-300 mb-1 font-medium">Product Name</label>
            <input
              id="productName"
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              className="p-3 rounded-lg bg-stone-700 text-white border border-stone-600 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-colors"
              placeholder="e.g., Vintage Denim Jacket"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col">
              <label htmlFor="price" className="text-stone-300 mb-1 font-medium">Price (₹)</label>
              <input
                id="price"
                type="number"
                name="price"
                value={form.price}
                onChange={handleChange}
                className="p-3 rounded-lg bg-stone-700 text-white border border-stone-600 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-colors"
                placeholder="e.g., 999"
                min="1"
                required
              />
            </div>
            
            <div className="flex flex-col">
              <label htmlFor="availability" className="text-stone-300 mb-1 font-medium">Availability</label>
              <select
                id="availability"
                name="availability"
                value={form.availability}
                onChange={handleChange}
                className="p-3 rounded-lg bg-stone-700 text-white border border-stone-600 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-colors appearance-none"
              >
                <option value="buy">Buy</option>
                <option value="rent">Rent</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col">
              <label htmlFor="category" className="text-stone-300 mb-1 font-medium">Category</label>
              <select
                id="category"
                name="category"
                value={form.category}
                onChange={handleChange}
                className="p-3 rounded-lg bg-stone-700 text-white border border-stone-600 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-colors appearance-none"
              >
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            
            <div className="flex flex-col">
              <label htmlFor="gender" className="text-stone-300 mb-1 font-medium">Gender</label>
              <select
                id="gender"
                name="gender"
                value={form.gender}
                onChange={handleChange}
                className="p-3 rounded-lg bg-stone-700 text-white border border-stone-600 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-colors appearance-none"
              >
                <option value="Unisex">Unisex</option>
                <option value="Mens">Mens</option>
                <option value="Womens">Womens</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col items-center border border-dashed border-stone-600 p-4 rounded-lg">
            <label htmlFor="file-upload" className="text-yellow-400 cursor-pointer flex items-center space-x-2 hover:text-yellow-300 transition-colors">
              <Camera size={20} />
              <span className="font-semibold">Choose Product Image</span>
            </label>
            <input
              id="file-upload"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              required
            />
            {form.imagePreviewUrl ? (
              <img 
                src={form.imagePreviewUrl} 
                alt="Product Preview" 
                className="mt-3 w-32 h-32 object-cover rounded-md shadow-md"
              />
            ) : (
              <p className="text-sm text-stone-500 mt-2">No image selected</p>
            )}
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center space-x-2 text-white font-bold py-3 rounded-lg shadow-lg bg-yellow-600 hover:bg-yellow-700 transition-colors"
          >
            <DollarSign size={20} />
            <span>List Item for {form.availability === 'buy' ? 'Sale' : 'Rent'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};


  const MarketplaceScreen = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [selectedAvailability, setSelectedAvailability] = useState([]);
    const [selectedGenders, setSelectedGenders] = useState([]);
    
  
    // products moved to parent state: marketplaceProducts
  
    const categories = ["Tops", "Bottoms", "Footwear"];
    const genders = ["Mens", "Womens", "Unisex"];

    // If there are no uploaded marketplace products yet, show a simple empty state
    if (!Array.isArray(marketplaceProducts) || marketplaceProducts.length === 0) {
      return (
        <div className="flex-grow flex items-center justify-center p-6">
          <div className="text-center space-y-4">
            <p className="text-stone-400 text-lg">No products found</p>
            <button
              onClick={() => setIsUploadModalVisible(true)}
              className="inline-flex items-center px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-semibold transition-colors"
            >
              <PlusCircle size={18} />
              <span className="ml-2">Upload item</span>
            </button>
          </div>
        </div>
      );
    }
  
    const handleCategoryChange = (category) => {
      setSelectedCategories(prev =>
        prev.includes(category)
          ? prev.filter(c => c !== category)
          : [...prev, category]
      );
    };
    const handleAvailabilityChange = (availability) => {
      setSelectedAvailability(prev => 
        prev.includes(availability) ? prev.filter(a => a !== availability) : [...prev, availability]
      );
    };
    const handleGenderChange = (gender) => {
        setSelectedGenders(prev => 
            prev.includes(gender)
                ? prev.filter(g => g !== gender)
                : [...prev, gender]
        );
    };

  const filteredProducts = marketplaceProducts.filter(product => {
      const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(product.category);
      const matchesAvailability = selectedAvailability.length === 0 || selectedAvailability.includes(product.availability);
      
      // ⭐ UPDATED FILTER LOGIC FOR GENDER ⭐
      // No filter is applied if selectedGenders is empty.
      const matchesGender = selectedGenders.length === 0 || selectedGenders.includes(product.gender);

      // All filters must match
    return matchesCategory && matchesAvailability && matchesGender;
    });

    return (
      <div className="flex-grow flex flex-col p-6 space-y-6">
        <div className="flex flex-col lg:flex-row flex-grow w-full space-y-4 lg:space-y-0 lg:space-x-6">
          <div className="flex-shrink-0 w-full lg:w-72 p-6 rounded-2xl shadow-lg backdrop-blur-md">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-white-400 mb-2">Upload items</h3>
              
              <button
                onClick={() => setIsUploadModalVisible(true)}
                className="w-full flex items-center justify-center space-x-2 bg-yellow-500 hover:bg-yellow-600 text-white py-2 rounded-lg font-semibold transition-colors duration-200"
              >
                <PlusCircle size={18} />
                <span>Upload item</span>
              </button>

            </div>
            <h3 className="text-xl font-bold text-stone-200 mb-4">Filters</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-stone-300 mb-2">Gender</h4>
                <div className="space-y-2">
                  {genders.map(g => (
                    <label key={g} className="flex items-center space-x-2 text-stone-400">
                        <input
                            type="checkbox"
                            checked={selectedGenders.includes(g)}
                            onChange={() => handleGenderChange(g)}
                            className="rounded text-purple-600 glassy-checkbox" 
                        />
                        <span>{g}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-stone-300 mb-2">Category</h4>
                <div className="space-y-2">
                  {categories.map(cat => (
                    <label key={cat} className="flex items-center space-x-2 text-stone-400">
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(cat)}
                        onChange={() => handleCategoryChange(cat)}
                        className="rounded text-purple-600 focus:ring-purple-500 glassy-checkbox"
                      />
                      <span>{cat}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-stone-300 mb-2">Availability</h4>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 text-stone-400">
                    <input 
                      type="checkbox" 
                      // 1. Bind 'checked' state
                      checked={selectedAvailability.includes('buy')} 
                      // 2. Bind 'onChange' handler
                      onChange={() => handleAvailabilityChange('buy')} 
                      className="rounded text-purple-600 glassy-checkbox" 
                    />
                    <span>Buy</span>
                  </label>
                  <label className="flex items-center space-x-2 text-stone-400">
                    <input 
                      type="checkbox" 
                      // 1. Bind 'checked' state
                      checked={selectedAvailability.includes('rent')} 
                      // 2. Bind 'onChange' handler
                      onChange={() => handleAvailabilityChange('rent')} 
                      className="rounded text-purple-600 glassy-checkbox" 
                    />
                    <span>Rent</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
          <div className="flex-grow grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 overflow-y-auto">
            {filteredProducts.length > 0 ? (
              filteredProducts.map(product => (
                <div key={product.id} className="bg-stone-800/40 rounded-2xl shadow-xl overflow-hidden group backdrop-blur-md glassy-card">
                  <div className="relative overflow-hidden">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-64 object-cover object-center transform group-hover:scale-105 transition-transform duration-300"
                    />
                            {/* owner-only controls */}
                            {userId && product.ownerId === userId && (
                              <div className="absolute top-3 right-3 flex items-center space-x-2">
                                <button onClick={() => { setEditingItem(product); setIsEditModalVisible(true); }} className="p-2 bg-black/40 hover:bg-black/50 rounded-full text-stone-200">
                                  <Save size={18} />
                                </button>
                                <button onClick={() => handleDeleteMarketplaceItem(product)} className="p-2 bg-black/40 hover:bg-red-600 rounded-full text-red-300">
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-stone-200">{product.name}</h3>
                    <p className="text-sm text-stone-400">{product.category}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-lg font-bold text-purple-600">₹{product.price}</span>
                      {/* Show Buy/Rent only for users who are NOT the owner */}
                      {userId && product.ownerId !== userId && (
                        <button
                          onClick={() => handlePurchase(product)}
                          className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors glassy-button-marketplace ${
                            product.availability === "buy" ? "bg-purple-600/60 hover:bg-purple-700/60" : "bg-teal-500/60 hover:bg-teal-600/60"
                          }`}
                        >
                          {product.availability === "buy" ? "Buy" : "Rent"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center p-8 text-stone-500 text-lg">
                No products found.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };
  
      // Upload modal instance (global within App)
      const handleMarketplaceUpload = async (newProduct) => {
        // ensure id uniqueness
        if (!newProduct.id) newProduct.id = generateId();

        // Require Firebase DB and a user before proceeding — no local fallback.
        if (!db || !userId) {
          showToast('Unable to upload: no database or user available. Please sign in.', 'error');
          console.error('handleMarketplaceUpload: missing db or user', { db, userId });
          return;
        }

        let imageUrl = newProduct.imageUrl || null;
        let cloudinaryPublicId = null;
        try {

          // convert dataURL -> Blob helper
          const dataURLtoBlob = (dataurl) => {
            const arr = dataurl.split(',');
            const mime = arr[0].match(/:(.*?);/)[1];
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) {
              u8arr[n] = bstr.charCodeAt(n);
            }
            return new Blob([u8arr], { type: mime });
          };

          const hasFile = !!newProduct.file;
          const hasDataUrl = !!imageUrl && imageUrl.startsWith && imageUrl.startsWith('data:');

          if (hasFile || hasDataUrl) {
            const formData = new FormData();
            if (hasFile) formData.append('file', newProduct.file);
            else formData.append('file', dataURLtoBlob(imageUrl), `${newProduct.name || 'upload'}.jpg`);

            formData.append('upload_preset', 'wardrobe_unsigned');
            // store marketplace uploads under a dedicated folder; Cloudinary will auto-create this folder on first upload
            formData.append('folder', `stylesphere/marketplace/${userId}`);

            const resp = await fetch('https://api.cloudinary.com/v1_1/dgngmm6nt/upload', {
              method: 'POST',
              body: formData,
            });

            const data = await resp.json();
                  if (!resp.ok || !data?.secure_url) {
                    console.error('Cloudinary marketplace upload failed:', data);
                    throw new Error('Cloudinary upload failed');
                  }

                  // Use only Cloudinary secure URL (do NOT persist local/object URLs)
                  imageUrl = data.secure_url;
                  cloudinaryPublicId = data.public_id;
                  console.debug('Cloudinary marketplace upload success:', imageUrl, cloudinaryPublicId);
          } else {
            // No file/dataURL provided — abort to avoid storing local preview URLs
            throw new Error('No image provided for marketplace upload');
          }

          // Persist product metadata + image URL to Firestore under artifacts/{appId}/marketplace
          const docRef = await addDoc(collection(db, MARKETPLACE_COLLECTION), {
            ownerId: userId,
            name: newProduct.name,
            price: Number(newProduct.price) || null,
            category: newProduct.category,
            availability: newProduct.availability,
            gender: newProduct.gender,
            imageUrl,
            cloudinary_public_id: cloudinaryPublicId || null,
            timestamp: serverTimestamp(),
          });

          // Firestore write succeeded. We rely on the snapshot listener to populate marketplaceProducts
          showToast('Item listed on marketplace!', 'success');
          console.debug('handleMarketplaceUpload: saved to Firestore, docRef.id=', docRef.id);
        } catch (err) {
          console.error('Error saving marketplace item to Firestore:', err);
          // If Firestore write failed, inform the user — no local fallback is performed.
          if (imageUrl && imageUrl.startsWith && imageUrl.startsWith('http')) {
            showToast('Image uploaded but saving to database failed. Please try again.', 'error');
          } else {
            showToast('Failed to upload item. Please try again.', 'error');
          }
        }
      };

    // Delete marketplace item (owner only)
    const handleDeleteMarketplaceItem = async (product) => {
      if (!db || !userId) {
        showToast('Not signed in.', 'error');
        return;
      }
      if (product.ownerId !== userId) {
        showToast('You are not allowed to delete this item.', 'error');
        return;
      }
      if (!window.confirm('Delete this marketplace item? This cannot be undone.')) return;
      try {
    await deleteDoc(doc(db, MARKETPLACE_COLLECTION, product.id));
        showToast('Item deleted.', 'success');
        // Note: Cloudinary asset deletion requires a server-side call to the Admin API using your API secret.
      } catch (e) {
        console.error('Error deleting marketplace item:', e);
        showToast('Failed to delete item.', 'error');
      }
    };

    // Update marketplace item (owner only). If file provided, upload to Cloudinary then update doc.
    const handleUpdateMarketplaceItem = async (updated) => {
      if (!db || !userId) {
        showToast('Not signed in.', 'error');
        return;
      }
      if (updated.ownerId && updated.ownerId !== userId) {
        showToast('You are not allowed to edit this item.', 'error');
        return;
      }
      try {
        let imageUrl = updated.imageUrl || null;
        let cloudinaryPublicId = updated.cloudinary_public_id || null;

        const dataURLtoBlob = (dataurl) => {
          const arr = dataurl.split(',');
          const mime = arr[0].match(/:(.*?);/)[1];
          const bstr = atob(arr[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          while (n--) u8arr[n] = bstr.charCodeAt(n);
          return new Blob([u8arr], { type: mime });
        };

        if (updated.file) {
          const formData = new FormData();
          formData.append('file', updated.file);
          formData.append('upload_preset', 'wardrobe_unsigned');
          formData.append('folder', `stylesphere/marketplace/${userId}`);
          const resp = await fetch('https://api.cloudinary.com/v1_1/dgngmm6nt/upload', { method: 'POST', body: formData });
          const data = await resp.json();
          if (!resp.ok || !data?.secure_url) {
            console.error('Cloudinary upload failed during edit:', data);
            throw new Error('Cloudinary upload failed');
          }
          imageUrl = data.secure_url;
          cloudinaryPublicId = data.public_id;
        }

        // update Firestore doc
    if (!updated?.id) throw new Error('Missing item id for update');
    const itemRef = doc(db, MARKETPLACE_COLLECTION, updated.id);
        await updateDoc(itemRef, {
          name: updated.name,
          price: Number(updated.price) || null,
          category: updated.category,
          availability: updated.availability,
          gender: updated.gender,
          imageUrl,
          cloudinary_public_id: cloudinaryPublicId || null,
          timestamp: serverTimestamp(),
        });
        showToast('Item updated.', 'success');
      } catch (e) {
        console.error('Error updating marketplace item:', e);
        if (e?.code === 'permission-denied') {
          showToast('Permission denied: you are not allowed to edit this item.', 'error');
        } else if (e?.message && e.message.includes('Missing item id')) {
          showToast('Update failed: missing item id.', 'error');
        } else {
          showToast('Failed to update item.', 'error');
        }
      }
    };

    // --- Razorpay demo integration (client-only sandbox) ---
    // Note: For production, create orders server-side and use the order_id value here.
    const loadRazorpayScript = () => {
      return new Promise((resolve, reject) => {
        if (window.Razorpay) return resolve(true);
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => reject(new Error('Razorpay script failed to load'));
        document.body.appendChild(script);
      });
    };

    const handlePurchase = async (product) => {
      try {
        if (!userId) {
          showToast('Please sign in to purchase or rent an item.', 'error');
          return;
        }

        await loadRazorpayScript();

        const amount = (Number(product.price) || 0) * 100; // paise

        const options = {
          key: 'rzp_test_1DP5mmOlF5G5ag', // Razorpay test key (demo)
          amount: amount,
          currency: 'INR',
          name: 'StyleSphere',
          description: `${product.availability === 'rent' ? 'Rent' : 'Buy'}: ${product.name}`,
          image: product.imageUrl || undefined,
          handler: function (response) {
            // Successful payment callback (client-only). In production, verify payment on server.
            console.debug('Razorpay payment success response:', response);
            showToast('Payment successful! Thank you.', 'success');
            // Optionally record the transaction in Firestore (demo: store minimal record)
            try {
              if (db && userId) {
                // Store demo transaction under the buyer's user document as requested
                addDoc(collection(db, `users/${userId}/transaction`), {
                  productId: product.id,
                  productName: product.name,
                  buyerId: userId,
                  sellerId: product.ownerId || null,
                  amount: Number(product.price) || 0,
                  currency: 'INR',
                  paymentId: response.razorpay_payment_id,
                  method: 'razorpay_test_client',
                  timestamp: serverTimestamp(),
                }).catch(e => console.warn('Failed to save demo transaction:', e));
              }
            } catch (e) {
              console.warn('Transaction recording skipped:', e);
            }
          },
          prefill: {
            name: user?.displayName || '',
            email: user?.email || '',
          },
          // allow user to close modal before entering optional fields like phone
          modal: {
            ondismiss: function() {
              showToast('Payment cancelled or closed.', 'error');
            }
          },
          notes: {
            product_id: product.id,
            product_name: product.name,
          },
          theme: { color: '#6D28D9' },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } catch (err) {
        console.error('Error opening Razorpay checkout:', err);
        showToast('Unable to open payment gateway. Please try again later.', 'error');
      }
    };
  
  return (
    <AppContext.Provider value={{ setScreen, showToast, isAuthReady, userId }}>
      <div className="App font-sans antialiased text-stone-200 h-screen overflow-hidden">
        <style dangerouslySetInnerHTML={{ __html: `
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Fugaz+One&display=swap');
          body { font-family: 'Inter', sans-serif; }
          .font-fugaz { font-family: 'Fugaz One', cursive; }
          .no-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .no-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          .radial-glow {
            background: radial-gradient(circle at center, rgba(255, 255, 255, 0.15) 0%, transparent 70%);
          }
          .glassy-button {
            background: rgba(100, 116, 139, 0.2);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08);
            transition: all 0.3s ease-in-out;
          }
          .glassy-button:hover {
            background: rgba(100, 116, 139, 0.3);
            box-shadow: 0 8px 12px rgba(0, 0, 0, 0.2), 0 2px 6px rgba(0, 0, 0, 0.1);
            transform: translateY(-2px);
          }
          .glassy-button-primary {
            background: linear-gradient(145deg, rgba(147, 51, 234, 0.8) 0%, rgba(126, 34, 206, 0.8) 100%);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.15);
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08);
            transition: all 0.3s ease-in-out;
          }
          .glassy-button-primary:hover {
            background: linear-gradient(145deg, rgba(147, 51, 234, 0.9) 0%, rgba(126, 34, 206, 0.9) 100%);
            box-shadow: 0 8px 12px rgba(0, 0, 0, 0.2), 0 2px 6px rgba(0, 0, 0, 0.1);
            transform: translateY(-2px);
          }
          .glassy-button-danger {
            background: linear-gradient(145deg, rgba(239, 68, 68, 0.8) 0%, rgba(220, 38, 38, 0.8) 100%);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.15);
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08);
            transition: all 0.3s ease-in-out;
          }
          .glassy-button-danger:hover {
            background: linear-gradient(145deg, rgba(239, 68, 68, 0.9) 0%, rgba(220, 38, 38, 0.9) 100%);
            box-shadow: 0 8px 12px rgba(0, 0, 0, 0.2), 0 2px 6px rgba(0, 0, 0, 0.1);
            transform: translateY(-2px);
          }
          .glassy-button-upload {
            background: linear-gradient(145deg, rgba(59, 130, 246, 0.8) 0%, rgba(37, 99, 235, 0.8) 100%);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.15);
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08);
            transition: all 0.3s ease-in-out;
          }
          .glassy-button-upload:hover {
            background: linear-gradient(145deg, rgba(59, 130, 246, 0.9) 0%, rgba(37, 99, 235, 0.9) 100%);
            box-shadow: 0 8px 12px rgba(0, 0, 0, 0.2), 0 2px 6px rgba(0, 0, 0, 0.1);
            transform: translateY(-2px);
          }
          .glassy-button-marketplace {
             background: rgba(147, 51, 234, 0.6);
             border: 1px solid rgba(255, 255, 255, 0.15);
             backdrop-filter: blur(10px);
             transition: all 0.3s ease-in-out;
          }
          .glassy-button-marketplace:hover {
             background: rgba(147, 51, 234, 0.8);
             transform: scale(1.05);
          }
          .glassy-card {
            background: rgba(64, 64, 64, 0.4);
            border: 1px solid rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
            transition: all 0.3s ease-in-out;
          }
          .glassy-item {
            background: rgba(64, 64, 64, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            transition: all 0.3s ease-in-out;
          }
          .glassy-category-button {
            background: rgba(64, 64, 64, 0.4);
            border: 1px solid rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .glassy-category-button:hover {
            background: rgba(64, 64, 64, 0.6);
          }
          .glassy-input {
            background: rgba(64, 64, 64, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
          }
        `}} />
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="https://unpkg.com/lucide-react@latest/dist/umd/lucide-react.js"></script>
        {isAuthReady ? (
          screen === 'login' ? (
            <AuthPage onAuthSuccess={() => setScreen('dashboard')} />
          ) : (
            <MainLayout>
              {(() => {
                switch (screen) {
                  case 'dashboard':
                    return <DashboardScreen />;
                  case 'closet':
                    return <ClosetScreen />;
                  case 'savedOutfits':
                    return <SavedOutfitsScreen />;
                  case 'marketplace':
                    return <MarketplaceScreen />;
                  default:
                    return <DashboardScreen />;
                }
              })()}
            </MainLayout>
          )
        ) : (
          <div className="flex items-center justify-center h-screen text-stone-500 text-2xl animate-pulse bg-stone-950">
            Loading...
          </div>
        )}
        {/* Upload modal rendered at app root so it's accessible from anywhere */}
        <UploadModal
          isVisible={isUploadModalVisible}
          onClose={() => setIsUploadModalVisible(false)}
          onUpload={handleMarketplaceUpload}
          categories={["Tops", "Bottoms", "Footwear"]}
        />
        <EditItemModal
          isVisible={isEditModalVisible}
          onClose={() => { setIsEditModalVisible(false); setEditingItem(null); }}
          item={editingItem}
          onSave={handleUpdateMarketplaceItem}
        />
        <EditClosetItemModal
          isVisible={isEditClosetModalVisible}
          onClose={() => { setIsEditClosetModalVisible(false); setEditingClosetItem(null); }}
          item={editingClosetItem}
          onSave={handleEditClosetItem}
        />
        {/* Closet upload modal rendered at app root */}
        <UploadClosetModal
          isVisible={isClosetUploadModalVisible}
          onClose={() => setIsClosetUploadModalVisible(false)}
          onUpload={(category, file) => {
            // Use existing handler that supports local fallback and Firebase
            handleUploadImage(category, file);
          }}
          categories={["Tops", "Bottoms", "Footwear"]}
        />
        <AnimatePresence>
          {isToastVisible && (
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-lg font-medium flex items-center space-x-2 z-50 transition-all duration-300 ${
                toastType === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
              }`}
            >
              {toastType === 'success' ? <CheckCircle size={20} /> : <XCircle size={20} />}
              <span>{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppContext.Provider>
  );
};

export default App;