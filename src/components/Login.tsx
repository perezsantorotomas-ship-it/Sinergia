import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Mail, Lock, ChevronRight, Zap, LogIn, Github } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAppStore } from '../lib/store';
import { Logo } from './Logo';
import { auth } from '../lib/firebase';
import { getUserFromFirestore, saveUserToFirestore } from '../lib/userService';
import { 
  signInWithEmailAndPassword,
  signInWithPopup, 
  GoogleAuthProvider, 
  setPersistence, 
  browserLocalPersistence, 
  browserSessionPersistence,
  sendPasswordResetEmail
} from 'firebase/auth';

export default function LoginPage() {
  const navigate = useNavigate();
  const setUser = useAppStore((state) => state.setUser);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  // Handle GitHub OAuth success message
  React.useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data?.provider === 'github') {
        const githubUser = event.data.user;
        setLoading(true);
        try {
          // In a real app with firebase admin, we'd mint a custom token.
          // For now, we search for a user by email, or create a guest session.
          // Since the user wants "GitUp" login, we'll try to find them or register them.
          const existingData = await getUserFromFirestore(githubUser.id || githubUser.email);
          if (existingData) {
            setUser(existingData as any);
            navigate('/explorar');
          } else {
            // Check if they already have an account by email
            const emailUser = await getUserFromFirestore(githubUser.email);
            if (emailUser) {
               setUser(emailUser as any);
               navigate('/explorar');
            } else {
               // First time login - create account
               const newUserData = {
                 id: githubUser.id || `github_${Date.now()}`,
                 name: githubUser.name || githubUser.email.split('@')[0],
                 email: githubUser.email || '',
                 avatarUrl: githubUser.avatar,
                 companyName: 'Empresa vía GitHub',
                 sector: 'Tecnología',
                 isPremium: false,
                 githubId: githubUser.id
               };
               setUser(newUserData);
               await saveUserToFirestore(newUserData);
               navigate('/explorar');
            }
          }
        } catch (error) {
          console.error("Error processing GitHub login:", error);
          alert("Error al procesar el inicio de sesión con GitHub.");
        } finally {
          setLoading(false);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleGithubLogin = async () => {
    try {
      const origin = window.location.origin;
      const response = await fetch(`/api/auth/github/url?origin=${encodeURIComponent(origin)}`);
      if (!response.ok) throw new Error('Error al obtener URL de GitHub');
      const { url } = await response.json();
      
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      window.open(url, 'github_oauth', `width=${width},height=${height},left=${left},top=${top}`);
    } catch (error) {
      console.error("Error initiating GitHub login:", error);
      alert("No se pudo iniciar la conexión con GitHub.");
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userData = await getUserFromFirestore(user.uid);
      if (userData) {
        setUser(userData as any);
      } else {
        // Fallback for first time Google login if register was skipped
        const newUserData = {
          id: user.uid,
          name: user.displayName || 'Usuario',
          email: user.email || '',
          companyName: 'Empresa',
          sector: 'Otro',
          isPremium: false
        };
        setUser(newUserData);
      }
      navigate('/explorar');
    } catch (error) {
      console.error("Error logging in with Google:", error);
      alert("Error al iniciar sesión con Google.");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;
      
      const userData = await getUserFromFirestore(user.uid);
      if (userData) {
        setUser(userData as any);
      }
      navigate('/explorar');
    } catch (error: any) {
      console.error("Error logging in:", error);
      alert(error.message || "Error al iniciar sesión. Verifica tus credenciales.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email) {
      alert("Por favor, ingresa tu email primero para restablecer la contraseña.");
      return;
    }
    
    try {
      await sendPasswordResetEmail(auth, formData.email);
      alert("Se ha enviado un correo para restablecer tu contraseña. Revisa tu bandeja de entrada.");
    } catch (error: any) {
      console.error("Error sending password reset email:", error);
      alert(error.message || "Error al enviar el correo de restablecimiento.");
    }
  };

  return (
    <div className="min-h-screen pt-16 flex flex-col md:flex-row bg-[#f8f9ff]">
      {/* Left Decoration (Desktop) */}
      <div className="hidden md:flex md:w-1/2 bg-[#004d43] relative items-end p-12 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#004d43]/80 to-[#004d43]/40 z-10" />
        <div className="absolute top-20 right-[-100px] w-[500px] h-[500px] border border-white/10 rounded-full opacity-20" />
        
        <div className="relative z-20 max-w-md">
          <motion.div 
            initial={{ opacity: 0, x: -30 }} 
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 mb-6 bg-white/10 w-fit px-4 py-2 rounded-full border border-white/20 backdrop-blur-md"
          >
            <LogIn size={16} className="text-white" fill="currentColor" />
            <span className="text-white text-xs font-bold tracking-widest uppercase">Bienvenido de nuevo</span>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 30 }} 
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl font-black text-white mb-6 leading-tight"
          >
            Tu red eficiente te <span className="text-white/80">espera.</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 30 }} 
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-emerald-100 opacity-80 leading-relaxed"
          >
            Accede a tu panel y gestiona tus alianzas estratégicas con un solo clic.
          </motion.p>
        </div>
      </div>

      {/* Form Area */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-[480px] bg-white border border-slate-200 p-8 md:p-12 rounded-[2.5rem] shadow-ambient relative overflow-hidden">
          <div className="mb-12">
            <Logo className="w-12 h-12 text-[#004d43] mb-6" />
            <h2 className="text-3xl font-black text-slate-800 mb-2 tracking-tighter italic">Iniciar Sesión</h2>
            <p className="text-sm font-medium text-slate-400">Continúa impulsando tu empresa en el ecosistema Sinergia.</p>
          </div>

          <form className="space-y-6" onSubmit={handleLogin}>
            <Input 
              icon={<Mail size={18} />} 
              label="Email Profesional" 
              placeholder="nombre@empresa.com" 
              type="email"
              value={formData.email}
              onChange={(e: any) => setFormData({ ...formData, email: e.target.value })}
              required
            />
            <Input 
              icon={<Lock size={18} />} 
              label="Contraseña" 
              placeholder="••••••••" 
              type="password"
              value={formData.password}
              onChange={(e: any) => setFormData({ ...formData, password: e.target.value })}
              required
            />

            <div className="flex items-center justify-between">
               <button 
                type="button"
                onClick={() => setRememberMe(!rememberMe)}
                className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-primary transition-colors"
              >
                <div className={cn(
                  "w-4 h-4 rounded border flex items-center justify-center transition-all",
                  rememberMe ? "bg-primary border-primary text-white" : "border-slate-200 bg-white"
                )}>
                  {rememberMe && <ChevronRight size={10} className="rotate-90" />}
                </div>
                Recordarme
              </button>
              <button 
                type="button"
                onClick={handleForgotPassword}
                className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-primary transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
            
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-[#004d43] text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-[#004d43]/20 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-3 group disabled:opacity-50"
            >
              {loading ? 'Cargando...' : 'Entrar'}
              <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <div className="flex items-center gap-4 mt-8 mb-8">
            <div className="h-px bg-slate-100 flex-1" />
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">o entrar con</span>
            <div className="h-px bg-slate-100 flex-1" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={handleGoogleLogin}
              className="flex items-center justify-center gap-3 bg-white border-2 border-slate-100 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.1em] text-slate-500 hover:border-[#004d43]/40 hover:text-[#004d43] hover:bg-slate-50 transition-all shadow-sm hover:shadow-md active:scale-[0.98] group"
            >
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </button>

            <button 
              onClick={handleGithubLogin}
              className="flex items-center justify-center gap-3 bg-[#24292f] py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.1em] text-white hover:bg-[#1a1f24] transition-all shadow-sm hover:shadow-md active:scale-[0.98] group"
            >
              <Github className="w-5 h-5 group-hover:scale-110 transition-transform" />
              GitHub
            </button>
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm font-bold text-slate-400">
              ¿No tienes cuenta? <Link to="/registro" className="text-primary hover:underline">Regístrate gratis</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Input({ label, placeholder, icon, type = "text", value, onChange, required }: any) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{label}</label>
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">
          {icon}
        </div>
        <input 
          type={type} 
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-12 pr-4 py-3.5 text-sm font-semibold outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-slate-300"
        />
      </div>
    </div>
  );
}
