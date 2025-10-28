import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, onSnapshot, collection, addDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useState, useEffect, createContext } from 'react';
import { ArrowLeft, ShoppingCart, Heart, User, Sparkle, Camera, Save, Trash2, Search, MessageSquare, PlusCircle, CheckCircle, XCircle, Grid, Upload, DollarSign, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { auth } from "./firebase";
import LiquidEther from './LiquidEther';
import PrismaticBurst from './PrismaticBurst';
import Orb from './Orb';
import Aurora from './Aurora';
import AuthPage from './AuthPage';


// Global variables for Firebase configuration.
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// No Firebase config here — user will configure Firebase in a separate file/environment.
// Keep firebaseConfig empty so the app uses local fallback storage until configured.
const firebaseConfig = {};
const initialAuthToken = null;

// Context for sharing app state
const AppContext = createContext();

// Firebase initialization and authentication
const useFirebase = () => {
  const [auth, setAuth] = useState(null);
  const [db, setDb] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);  

  useEffect(() => {
    try {
      if (Object.keys(firebaseConfig).length > 0) {
        const app = initializeApp(firebaseConfig);
        const authInstance = getAuth(app);
        const dbInstance = getFirestore(app);
        setAuth(authInstance);
        setDb(dbInstance);
        console.debug('Firebase initialized with config:', firebaseConfig);

        const authenticate = async () => {
          try {
            if (initialAuthToken) {
              await signInWithCustomToken(authInstance, initialAuthToken);
            } else {
              await signInAnonymously(authInstance);
            }
            if (authInstance.currentUser) {
              setUserId(authInstance.currentUser.uid);
              console.debug('Firebase auth user id:', authInstance.currentUser.uid);
            }
          } catch (error) {
            console.error("Firebase Auth Error:", error);
          } finally {
            setIsAuthReady(true);
          }
        };

        authenticate();
      } else {
        console.error('Firebase config is not available. Please ensure it is correctly provided.');
        setIsAuthReady(true);
      }
    } catch (error) {
      console.error('Error initializing Firebase:', error);
      setIsAuthReady(true);
    }
  }, []);

  return { auth, db, userId, isAuthReady };
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


const App = () => {
  const { auth, db, userId, isAuthReady } = useFirebase();
  const dummyItems = [
    { id:101, category: 'Tops', imageUrl: "/mycloset_mock_imgs/tshirt.png", name: "Blue T-shirt" },
    { id:102, category: 'Tops', imageUrl:  "/mycloset_mock_imgs/chikan_kurti.png", name: "Chikan Kurti" },
    { id:103, category: 'Tops', imageUrl:  "/mycloset_mock_imgs/sweatshirt.png", name: "Chikan Kurti" },
    { id:104, category: 'Bottoms', imageUrl:  "/mycloset_mock_imgs/jeans.png", name: "Blue T-shirt" },
    { id:105, category: 'Bottoms', imageUrl:  "/mycloset_mock_imgs/denim_shorts.png", name: "Blue T-shirt" },
    { id:106, category: 'Footwear', imageUrl:  "/mycloset_mock_imgs/heels.png", name: "Blue T-shirt" },
    { id:107, category: 'Footwear', imageUrl:  "/mycloset_mock_imgs/nike_sneakers.png", name: "Blue T-shirt" },
    { id:108, category: 'Footwear', imageUrl:  "/mycloset_mock_imgs/converse.png", name: "Blue T-shirt" },
    { id:109, category: 'Tops', imageUrl:  "/mycloset_mock_imgs/winter_coat.png", name: "Chikan Kurti" },
    { id:110, category: 'Bottoms', imageUrl:  "/mycloset_mock_imgs/trouser.png", name: "Chikan Kurti" },
    { id:111, category: 'Bottoms', imageUrl:  "/mycloset_mock_imgs/adi.png", name: "Chikan Kurti" },
    { id:112, category: 'Tops', imageUrl:  "/mycloset_mock_imgs/leather_jacket.png", name: "Chikan Kurti" },
    { id:113, category: 'Bottoms', imageUrl:  "/mycloset_mock_imgs/palazzo.png", name: "Chikan Kurti" },
  ];
  const [screen, setScreen] = useState('login');
  const [closetItems, setClosetItems] = useState(dummyItems);
  // Marketplace products (moved here so UploadModal can add items)
  const [marketplaceProducts, setMarketplaceProducts] = useState([
    { id: 1, name: "Casual T-Shirt", price: 500, availability: "buy", imageUrl: "/mock_imgs/tshirt.png", category: "Tops", gender: "Unisex"},
    { id: 2, name: "Levi's Blue Jeans", price: 400, availability: "rent", imageUrl: "/mock_imgs/jeans.png", category: "Bottoms", gender: "Mens"},
    { id: 3, name: "Chikan Kurti", price: 700, availability: "buy", imageUrl: "/mock_imgs/chikan_kurti.png", category: "Tops", gender: "Womens" },
    { id: 4, name: "Leather Jacket", price: 300, availability: "rent", imageUrl: "/mock_imgs/leather_jacket.png", category: "Tops", gender: "Mens" },
    { id: 5, name: "Running Shoes", price: 1000, availability: "buy", imageUrl: "/mock_imgs/running_shoes.png", category: "Footwear", gender: "Unisex" },
    { id: 6, name: "Louboutin Heels", price: 3000, availability: "rent", imageUrl: "/mock_imgs/heels.png", category: "Footwear", gender: "Womens" },
    { id: 7, name: "Hoodie", price: 500, availability: "buy", imageUrl: "/mock_imgs/sweatshirt.png", category: "Tops", gender: "Unisex" },
    { id: 8, name: "Palazzo", price: 550, availability: "rent", imageUrl: "/mock_imgs/palazzo.png", category: "Bottoms", gender: "Womens"},
    { id: 9, name: "Prom Dress", price: 400, availability: "rent", imageUrl: "/mock_imgs/prom_dress.png", category: "Tops", gender: "Womens" },
    { id: 10, name: "Saree", price: 1175, availability: "buy", imageUrl: "/mock_imgs/saree.png", category: "Tops", gender: "Womens" },
    { id: 11, name: "Cargos", price: 450, availability: "buy", imageUrl: "/mock_imgs/cargos.png", category: "Bottoms", gender: "Unisex" },
    { id: 12, name: "Denim Shorts", price: 300, availability: "buy", imageUrl: "/mock_imgs/denim_shorts.png", category: "Bottoms", gender: "Womens"},
    { id: 14, name: "Bayern Munich Jersey - 125th Anniversary", price: 2700, availability: "buy", imageUrl: "/mock_imgs/bayern_jersey.png", category: "Tops", gender: "Unisex" },
    { id: 15, name: "Nike Travis Scott Mocha Lows", price: 2900, availability: "buy", imageUrl: "/mock_imgs/nike_sneakers.png", category: "Footwear", gender: "Unisex" },
    { id: 16, name: "Trench Coat", price: 1150, availability: "buy", imageUrl: "/mock_imgs/winter_coat.png", category: "Tops", gender: "Womens" },
    { id: 17, name: "Converse Chuck All Star", price: 2450, availability: "buy", imageUrl: "/mock_imgs/converse.png", category: "Footwear", gender: "Unisex" },
    { id: 18, name: "Formal Trousers", price: 655, availability: "buy", imageUrl: "/mock_imgs/trouser.png", category: "Bottoms", gender: "Mens" },
    { id: 19, name: "Slip-on Sneakers", price: 570, availability: "rent", imageUrl: "/mock_imgs/sneakers.png", category: "Footwear", gender: "Unisex" },
  ]);

  // Upload modal visibility
  const [isUploadModalVisible, setIsUploadModalVisible] = useState(false);
  const [savedOutfits, setSavedOutfits] = useState([]);
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
      const closetRef = collection(db, `artifacts/${appId}/users/${userId}/closet`);
      const savedOutfitsRef = collection(db, `artifacts/${appId}/users/${userId}/savedOutfits`);

      const unsubscribeCloset = onSnapshot(closetRef, (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.debug('Firestore closet snapshot received:', items);
        setClosetItems(items);
      }, (error) => {
        console.error("Error fetching closet items:", error);
      });

      const unsubscribeSavedOutfits = onSnapshot(savedOutfitsRef, (snapshot) => {
        const outfits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setSavedOutfits(outfits);
      }, (error) => {
        console.error("Error fetching saved outfits:", error);
      });

      return () => {
        unsubscribeCloset();
        unsubscribeSavedOutfits();
      };
    }
  }, [db, userId]);

  // Load locally persisted closet items when Firebase is not configured
  useEffect(() => {
    try {
      if (!db || !userId) {
        const stored = localStorage.getItem('local_closet_items');
        if (stored) {
          const parsedLocal = JSON.parse(stored);
          if (Array.isArray(parsedLocal) && parsedLocal.length > 0) {
            // Merge local uploads with dummy items so UI has content
            setClosetItems(parsedLocal.concat(dummyItems));
          }
        }
      }
    } catch (e) {
      console.error('Error loading local closet items:', e);
    }
  }, [db, userId]);

  const showToast = (message, type) => {
    setToastMessage(message);
    setToastType(type);
    setIsToastVisible(true);
    setTimeout(() => setIsToastVisible(false), 3000);
  };

  const handleLoginSignup = async () => {
    setScreen('dashboard');
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
    // If Firebase is configured, upload to Storage and save URL in Firestore
    const storage = getStorage();
    try {
      const storagePath = `closet/${userId}/${Date.now()}_${file.name}`;
      const fileRef = storageRef(storage, storagePath);
      const uploadTask = uploadBytesResumable(fileRef, file);

      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.debug('Upload progress:', progress);
        },
        (error) => {
          showToast('Error uploading image to Storage.', 'error');
          console.error('Error uploading file to Storage: ', error);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            console.debug('Upload complete, downloadURL:', downloadURL);
            const docRef = await addDoc(collection(db, `artifacts/${appId}/users/${userId}/closet`), {
              category,
              imageUrl: downloadURL,
              timestamp: serverTimestamp(),
            });
            console.debug('Firestore doc added:', docRef.id);
            showToast('Image uploaded successfully!', 'success');
          } catch (e) {
            showToast('Error saving image URL to database.', 'error');
            console.error('Error writing Firestore document: ', e);
          }
        }
      );
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
      await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/savedOutfits`, outfitId));
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
            <button
              onClick={() => setScreen('dashboard')}
              className="flex items-center space-x-2 px-4 py-2 bg-stone-800/50 rounded-full hover:bg-stone-700/50 transition-colors text-sm font-semibold lg:hidden glassy-button"
            >
              <User size={20} />
              <span className="hidden sm:inline">User ID</span>
            </button>
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

  const filteredItems = selectedFilter === "All"
    ? closetItems
    : closetItems.filter(item => item.category === selectedFilter);

  const onImageClick = (item) => {
  
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
                    {/* ❌ REMOVED THE OVERLAY DIV HERE ❌ */}
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
            <h3 className="text-xl font-bold text-stone-200">Outfit of the Day</h3>
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
              <label htmlFor="image-upload" className="w-full flex items-center justify-center space-x-2 text-white font-semibold py-3 rounded-lg shadow-lg cursor-pointer glassy-button-upload">
                <Camera size={20} />
                <span>Upload Image</span>
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    const uploadCategory = (selectedFilter && selectedFilter !== 'All') ? selectedFilter : 'Tops';
                    if (file) handleUploadImage(uploadCategory, file);
                  }}
                />
              </label>
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

    // In a real app, 'imageUrl' would be the URL returned from Firebase Storage.
    const newProduct = {
      id: generateId(), 
      name,
      price: parseInt(price),
      category,
      availability,
      gender,
      // Using the temporary local URL for immediate visual feedback in this demo
      imageUrl: imagePreviewUrl, 
    };

    onUpload(newProduct);

    // Reset form and close modal
    setForm({
      name: '',
      price: '',
      category: categories[0] || 'Tops',
      availability: 'buy',
      gender: 'Unisex',
      file: null,
      imagePreviewUrl: null,
    });
    // Clean up the URL after the item is uploaded and the form is closed/reset
    if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
    }
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
                    {/* favourite button removed as requested */}
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-stone-200">{product.name}</h3>
                    <p className="text-sm text-stone-400">{product.category}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-lg font-bold text-purple-600">₹{product.price}</span>
                      <button className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors glassy-button-marketplace ${
                        product.availability === "buy" ? "bg-purple-600/60 hover:bg-purple-700/60" : "bg-teal-500/60 hover:bg-teal-600/60"
                      }`}>
                        {product.availability === "buy" ? "Buy" : "Rent"}
                      </button>
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
      const handleMarketplaceUpload = (newProduct) => {
        // ensure id uniqueness
        if (!newProduct.id) newProduct.id = generateId();
        setMarketplaceProducts(prev => [newProduct, ...prev]);
        showToast('Item listed on marketplace!', 'success');
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