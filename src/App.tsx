import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './lib/firebase';
import { getUserFromFirestore } from './lib/userService';
import { useAppStore } from './lib/store';
import { Navbar, Footer } from './components/Layout';
import HomePage from './components/Home';
import ExplorePage from './components/Explore';
import ChatPage from './components/Chat';
import RegisterPage from './components/Register';
import LoginPage from './components/Login';
import PricingPage from './components/Pricing';
import AIHelpPage from './components/AIHelp';
import ProfilePage from './components/Profile';
import AboutUsPage from './components/AboutUs';
import ScrollToTop from './components/ScrollToTop';

export default function App() {
  const { setUser, setHydrated } = useAppStore();

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userData = await getUserFromFirestore(firebaseUser.uid);
          if (userData) {
            setUser(userData as any);
          } else {
            // If auth exists but no doc, maybe first time login
            setUser({
              id: firebaseUser.uid,
              name: firebaseUser.displayName || 'Usuario',
              email: firebaseUser.email || '',
              companyName: 'Empresa Nueva',
              sector: 'Tecnología',
              isPremium: false
            });
          }
        } catch (error) {
          console.error("Auth state user fetch error:", error);
          // If fetch fails, we don't want to set defaults that might overwrite later
          // We just set hydrated and let the user try again or see current state
        }
      } else {
        setUser(null);
      }
      setHydrated(true);
    });

    return () => unsubscribe();
  }, [setUser, setHydrated]);

  return (
    <Router>
      <ScrollToTop />
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/explorar" element={<ExplorePage />} />
          <Route path="/mensajes" element={<ChatPage />} />
          <Route path="/registro" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/premium" element={<PricingPage />} />
          <Route path="/ayuda" element={<AIHelpPage />} />
          <Route path="/perfil" element={<ProfilePage />} />
          <Route path="/nosotros" element={<AboutUsPage />} />
        </Routes>
        <Footer />
      </div>
    </Router>
  );
}
