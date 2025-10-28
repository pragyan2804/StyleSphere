import { useState } from "react";
import { auth, setDocument } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import LiquidEther from "./LiquidEther"; // keep your effect import
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

// Stable constants to avoid re-creating objects/arrays each render which re-triggers LiquidEther
const LIQUIDETHER_COLORS = ["#5227FF", "#FF9FFC", "#B19EEF"];
const LIQUIDETHER_STYLE = { width: "100%", height: "100%" };

const LoginSignupScreen = ({ onAuthSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [user, setUser] = useState(null);
  const [userId, setUserId] = useState("");

  const shouldReduceMotion = useReducedMotion();

  // transition: ease-in as requested
  const panelTransition = { duration: shouldReduceMotion ? 0 : 0.35, ease: "easeIn" };

  const handleLogin = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      setUser(userCredential.user);
      setUserId(userCredential.user.uid);
      alert("Logged in successfully!");
      if (onAuthSuccess) onAuthSuccess();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleSignup = async () => {
    try {
      if (!fullName.trim()) {
        alert('Please enter your full name.');
        return;
      }
      const userCredential = await createUserWithEmailAndPassword(auth, signupEmail, signupPassword);
      // update displayName
      try {
        await updateProfile(userCredential.user, { displayName: fullName.trim() });
      } catch (err) {
        console.error('Failed to update profile:', err);
      }
      setUser(userCredential.user);
      setUserId(userCredential.user.uid);
      // Save user record in Firestore under collection `users` with doc id = uid
      try {
        await setDocument('users', userCredential.user.uid, {
          fullName: fullName.trim(),
          displayName: fullName.trim(),
          email: signupEmail,
          createdAt: new Date().toISOString(),
        });
      } catch (err) {
        console.error('Failed to save user to Firestore:', err);
      }
      alert("Account created successfully!");
      if (onAuthSuccess) onAuthSuccess();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setUserId("");
    alert("Logged out successfully!");
  };

  return (
    <div className="relative w-full min-h-screen">
      {/* LiquidEther background */}
      <div className="absolute inset-0 -z-10 bg-black">
        <LiquidEther
          colors={LIQUIDETHER_COLORS}
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
          style={LIQUIDETHER_STYLE}
        />
      </div>

      <div className="flex items-center justify-center min-h-screen relative z-10 p-4">
        <div className="w-full grid gap-6 grid-cols-1 place-items-center">
          {/* Heading */}
          <div className="col-span-full text-center">
            <h1 className="text-4xl font-bold tracking-wide">
              <span className="block">Welcome to</span>
              <span className="font-fugaz text-purple-500 text-7xl inline-block">StyleSphere</span>
            </h1>
          </div>

          <AnimatePresence mode="wait">
            {isLogin && !user && (
              <motion.div
                key="login"
                initial={{ x: "-100%", opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: "-100%", opacity: 0 }}
                transition={panelTransition}
                className="w-full p-8 rounded-2xl shadow-2xl space-y-6 text-center lg:max-w-lg mx-auto backdrop-blur-md"
              >
                <h2 className="text-2xl font-semibold text-stone-200 ">LOGIN</h2>
                <div className="space-y-4 pt-2 ">
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-5 py-3 rounded-lg border border-stone-700 bg-stone-900/50 text-stone-200 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow glassy-input"
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-5 py-3 rounded-lg border border-stone-700 bg-stone-900/50 text-stone-200 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow glassy-input"
                  />
                </div>
                <div className="space-y-4">
                  <button onClick={handleLogin} className="w-full text-white font-semibold py-3 rounded-lg transition-colors shadow-lg glassy-button-primary">Login</button>
                  <button onClick={() => { setIsLogin(false); }} className="w-full text-sm text-purple-500 font-semibold py-2 rounded-lg glassy-button-secondary">NEW USER? CREATE ACCOUNT</button>
                </div>
              </motion.div>
            )}

            {!isLogin && !user && (
              <motion.div
                key="signup"
                initial={{ x: "100%", opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: "100%", opacity: 0 }}
                transition={panelTransition}
                className="w-full p-8 rounded-2xl shadow-2xl space-y-6 text-center lg:max-w-lg mx-auto backdrop-blur-md"
              >
                <h2 className="text-2xl font-semibold text-stone-200">SIGN-UP</h2>
                <div className="space-y-4 pt-2">
                  <input
                    type="text"
                    placeholder="Full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-5 py-3 rounded-lg border border-stone-700 bg-stone-900/50 text-stone-200 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow glassy-input"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    className="w-full px-5 py-3 rounded-lg border border-stone-700 bg-stone-900/50 text-stone-200 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow glassy-input"
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    className="w-full px-5 py-3 rounded-lg border border-stone-700 bg-stone-900/50 text-stone-200 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow glassy-input"
                  />
                </div>
                <div className="space-y-4">
                  <button
                    onClick={handleSignup}
                    className="w-full text-white font-semibold py-3 rounded-lg transition-colors shadow-lg glassy-button-primary"
                  >
                    Create account
                  </button>
                  <button
                    onClick={() => { setIsLogin(true); }}
                    className="w-full text-sm text-purple-500 font-semibold py-2 rounded-lg glassy-button-secondary"
                  >
                    ALREADY HAVE AN ACCOUNT? LOGIN
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Logged-in panel */}
          {user && (
            <div className="col-span-full w-full p-8 rounded-2xl shadow-2xl space-y-6 text-center backdrop-blur-md">
              <h2 className="text-2xl font-semibold text-purple-400">Welcome, {user.displayName || user.email}</h2>
              <button
                onClick={handleLogout}
                className="mt-4 w-full text-white font-semibold py-3 rounded-lg bg-purple-600 hover:bg-purple-700 transition"
              >
                Logout
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default LoginSignupScreen;
