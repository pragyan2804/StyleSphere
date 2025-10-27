import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, onSnapshot, collection, addDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useState, useEffect, createContext } from 'react';
import { ArrowLeft, ShoppingCart, Heart, User, Sparkle, Camera, Save, Trash2, Search, MessageSquare, PlusCircle, CheckCircle, XCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

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
  <div className="flex items-center justify-between px-6 py-4 bg-stone-900/40 text-stone-200 shadow-sm sticky top-0 z-10 w-full rounded-b-xl backdrop-blur-md">
    <div className="flex items-center space-x-2">
      {onBack && (
        <button onClick={onBack} className="p-2 rounded-full hover:bg-stone-800/50 transition-colors glassy-button">
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
    // { id:111, category: 'Bottoms', imageUrl:  "/mycloset_mock_imgs/adi.png", name: "Chikan Kurti" },
    { id:112, category: 'Tops', imageUrl:  "/mycloset_mock_imgs/leather_jacket.png", name: "Chikan Kurti" },
    { id:113, category: 'Bottoms', imageUrl:  "/mycloset_mock_imgs/palazzo.png", name: "Chikan Kurti" },
  ];
  const [screen, setScreen] = useState('login');
  const [closetItems, setClosetItems] = useState(dummyItems);
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
    <div className="relative flex flex-col w-full h-screen bg-[#003153] text-stone-200">
      <div className="absolute inset-0 z-0"></div>
      <div className="absolute inset-0 radial-glow z-10"></div>
      <div className="flex flex-col flex-grow overflow-hidden z-20">
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
    <div className="flex items-center justify-center min-h-screen bg-[#003153] text-stone-200 p-4">
      <div className="w-full bg-stone-800/40 p-8 rounded-2xl shadow-2xl space-y-6 text-center lg:max-w-lg backdrop-blur-md">
        <h2 className="text-4xl font-bold tracking-wide">Welcome to <span className="font-fugaz text-purple-400">StyleSphere</span></h2>
        <p className="text-stone-400 text-lg">Your personal style curator</p>
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
        <div className="text-sm text-stone-500 mt-6">User ID: <span className="font-mono text-xs">{userId || 'Loading...'}</span></div>
      </div>
    </div>
  );

  const DashboardScreen = () => (
    <div className="flex-grow flex items-center justify-center p-8">
      <div className="flex flex-col md:flex-row gap-8 w-full max-w-5xl">
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex-1 aspect-square flex items-center justify-center p-12 rounded-2xl shadow-2xl cursor-pointer bg-stone-800/40 backdrop-blur-md glassy-card"
          onClick={() => setScreen('closet')}
        >
          <h2 className="text-4xl font-extrabold text-stone-200 px-6 py-3 rounded-xl shadow-lg relative z-10 text-center">
            My Closet
          </h2>
        </motion.div>
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex-1 aspect-square flex items-center justify-center p-12 rounded-2xl shadow-2xl cursor-pointer bg-stone-800/40 backdrop-blur-md glassy-card"
          onClick={() => setScreen('marketplace')}
        >
          <h2 className="text-4xl font-extrabold text-stone-200 px-6 py-3 rounded-xl shadow-lg relative z-10 text-center">
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
        <div className="flex-grow flex flex-col p-4 bg-stone-800/40 rounded-2xl shadow-xl overflow-hidden backdrop-blur-md glassy-card">
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
      
          <div className="flex-shrink-0 w-full lg:w-96 bg-stone-800/40 p-6 rounded-2xl shadow-xl flex flex-col items-center space-y-4 backdrop-blur-md glassy-card">
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
  
  const MarketplaceScreen = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategories, setSelectedCategories] = useState([]);
  
    const products = [
      { id: 1, name: "Casual T-Shirt", price: 25, availability: "buy", imageUrl: "https://placehold.co/400x400/3c3c3c/ffffff?text=T-Shirt", category: "Tops" },
      { id: 2, name: "Blue Jeans", price: 50, availability: "rent", imageUrl: "https://placehold.co/400x400/4c51bf/ffffff?text=Jeans", category: "Bottoms" },
      { id: 3, name: "Leather Jacket", price: 120, availability: "buy", imageUrl: "https://placehold.co/400x400/667eea/ffffff?text=Jacket", category: "Tops" },
      { id: 4, name: "Running Shoes", price: 85, availability: "buy", imageUrl: "https://placehold.co/400x400/e53e3e/ffffff?text=Shoes", category: "Footwear" },
      { id: 5, name: "Wool Beanie", price: 20, availability: "rent", imageUrl: "https://placehold.co/400x400/319795/ffffff?text=Beanie", category: "Head" },
      { id: 6, name: "Sweatshirt", price: 40, availability: "buy", imageUrl: "https://placehold.co/400x400/2f855a/ffffff?text=Sweatshirt", category: "Tops" },
      { id: 7, name: "Formal Trousers", price: 65, availability: "buy", imageUrl: "https://placehold.co/400x400/dd6b20/ffffff?text=Trousers", category: "Bottoms" },
      { id: 8, name: "Slip-on Sneakers", price: 70, availability: "rent", imageUrl: "https://placehold.co/400x400/b794f4/ffffff?text=Sneakers", category: "Footwear" },
      { id: 9, name: "Fedora Hat", price: 55, availability: "rent", imageUrl: "https://placehold.co/400x400/d53f8c/ffffff?text=Fedora", category: "Head" },
      { id: 10, name: "Winter Coat", price: 150, availability: "buy", imageUrl: "https://placehold.co/400x400/1a202c/ffffff?text=Coat", category: "Tops" },
    ];
  
    const categories = ["Head", "Tops", "Bottoms", "Footwear"];
  
    const handleCategoryChange = (category) => {
      setSelectedCategories(prev =>
        prev.includes(category)
          ? prev.filter(c => c !== category)
          : [...prev, category]
      );
    };
  
    const filteredProducts = products.filter(product => {
      const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(product.category);
      return matchesCategory;
    });
  
    return (
      <div className="flex-grow flex flex-col p-6 space-y-6">
        <div className="flex flex-col lg:flex-row flex-grow w-full space-y-4 lg:space-y-0 lg:space-x-6">
          <div className="flex-shrink-0 w-full lg:w-72 bg-stone-800/40 p-6 rounded-2xl shadow-lg backdrop-blur-md glassy-card">
            <h3 className="text-xl font-bold text-stone-200 mb-4">Filters</h3>
            <div className="space-y-4">
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
                    <input type="checkbox" className="rounded text-purple-600 glassy-checkbox" />
                    <span>Buy</span>
                  </label>
                  <label className="flex items-center space-x-2 text-stone-400">
                    <input type="checkbox" className="rounded text-purple-600 glassy-checkbox" />
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
                    <div className="absolute top-2 right-2 p-2 bg-stone-900/50 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 glassy-button">
                      <Heart size={20} className="text-stone-400 hover:text-red-500" />
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-stone-200">{product.name}</h3>
                    <p className="text-sm text-stone-400">{product.category}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-lg font-bold text-purple-600">${product.price}</span>
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
            <LoginSignupScreen />
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
