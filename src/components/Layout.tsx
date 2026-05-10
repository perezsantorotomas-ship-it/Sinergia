import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Bell, User, MessageSquare, Search, Menu, X, Settings, LogOut, ShieldCheck, FileText, Share2, Instagram, Linkedin, Twitter, Phone, Mail, HelpCircle, ChevronRight, Video } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

import { useAppStore } from '../lib/store';

import { Logo } from './Logo';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, setUser, notifications, setNotifications } = useAppStore();
  const navRef = useRef<HTMLDivElement>(null);
  const [selectedNotif, setSelectedNotif] = useState<any>(null);

  // Sync notifications with Firestore
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    let unsubscribe: any;
    
    const setupListener = async () => {
      const { db } = await import('../lib/firebase');
      const { collection, query, where, orderBy, onSnapshot } = await import('firebase/firestore');
      
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', user.id),
        orderBy('createdAt', 'desc')
      );

      unsubscribe = onSnapshot(q, (snapshot) => {
        const notifs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          time: (doc.data() as any).createdAt?.toDate() ? 
                new Date((doc.data() as any).createdAt.toDate()).toLocaleString() : 
                'Ahora'
        })) as any[];
        setNotifications(notifs);
      });
    };

    setupListener();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user, setNotifications]);

  const markAsRead = async (id: string) => {
    const { doc, updateDoc } = await import('firebase/firestore');
    const { db } = await import('../lib/firebase');
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    const { doc, updateDoc, writeBatch } = await import('firebase/firestore');
    const { db } = await import('../lib/firebase');
    const batch = writeBatch(db);
    notifications.filter(n => !n.read).forEach(n => {
      batch.update(doc(db, 'notifications', n.id), { read: true });
    });
    try {
      await batch.commit();
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
        setShowProfile(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const links = [
    { name: 'Explorar', path: '/explorar' },
    { name: 'Mensajes', path: '/mensajes' },
    { name: 'Sobre nosotros', path: '/nosotros' },
    { name: 'Centro de Ayuda', path: '/ayuda' },
  ];

  const handleLogout = async () => {
    const { signOut } = await import('firebase/auth');
    const { auth } = await import('../lib/firebase');
    await signOut(auth);
    setUser(null);
    setShowProfile(false);
    navigate('/');
  };

  return (
    <nav ref={navRef} className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
        <div className="flex items-center gap-12">
          <Link to="/" className="flex items-center gap-2 group">
            <Logo className="w-8 h-8 text-primary group-hover:scale-110 transition-transform" />
            <span className="text-2xl font-black text-primary tracking-tighter">Sinergia</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-8 font-semibold text-sm">
            {links.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={cn(
                  "transition-colors hover:text-primary relative py-1",
                  location.pathname === link.path ? "text-primary after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-primary" : "text-slate-500"
                )}
              >
                {link.name}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {!user?.isPremium && (
            <Link to="/premium" className="hidden lg:block bg-[#724116] text-white font-bold text-sm px-5 py-2 rounded-lg hover:brightness-110 active:scale-95 transition-all shadow-sm">
              Hazte Premium
            </Link>
          )}
          
          <div className="flex items-center gap-2">
            {/* Notifications Button */}
            <div className="relative">
              <button 
                onClick={() => { setShowNotifications(!showNotifications); setShowProfile(false); }}
                className={cn(
                  "p-2 text-slate-500 hover:bg-slate-50 rounded-full transition-colors relative",
                  showNotifications && "bg-slate-50 text-primary"
                )}
              >
                <Bell size={20} />
                {notifications.some(n => !n.read) && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-80 bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden z-50"
                  >
                    <div className="p-4 border-b border-slate-50 flex justify-between items-center">
                      <h3 className="font-black text-slate-800 text-sm">Notificaciones</h3>
                      <button 
                        onClick={(e) => { e.stopPropagation(); markAllAsRead(); }}
                        className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline"
                      >
                        Marcar todo leído
                      </button>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-xs font-medium">No hay notificaciones</div>
                      ) : (
                        notifications.map(notif => (
                          <div 
                            key={notif.id} 
                            onClick={() => { markAsRead(notif.id); setSelectedNotif(notif); setShowNotifications(false); }}
                            className={cn(
                              "p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer text-left", 
                              !notif.read && "bg-primary/5"
                            )}
                          >
                            <div className="flex justify-between items-start mb-1">
                              <span className={cn("text-xs", notif.read ? "text-slate-500 font-bold" : "text-slate-800 font-black")}>
                                {notif.title}
                              </span>
                              <span className="text-[10px] text-slate-400 shrink-0 ml-2">{notif.time}</span>
                            </div>
                            <p className="text-[11px] text-slate-500 leading-relaxed font-medium line-clamp-2">{notif.desc}</p>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="p-3 bg-slate-50 text-center">
                      <button className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-primary transition-colors">Ver todo el historial</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Notification Modal */}
            <AnimatePresence>
              {selectedNotif && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="bg-white w-full max-w-md rounded-3xl p-8 relative shadow-2xl"
                  >
                    <button onClick={() => setSelectedNotif(null)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-800 transition-colors">
                      <X size={24} />
                    </button>
                    
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-6">
                      <Bell size={32} />
                    </div>
                    
                    <h2 className="text-2xl font-black text-slate-800 mb-2 tracking-tighter italic">{selectedNotif.title}</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">{selectedNotif.time}</p>
                    
                    <div className="bg-slate-50 p-6 rounded-2xl mb-8 border border-slate-100">
                      <p className="text-slate-600 font-medium leading-relaxed">{selectedNotif.desc}</p>
                    </div>
                    
                    <div className="flex gap-4">
                      <button 
                        onClick={() => setSelectedNotif(null)}
                        className="flex-1 bg-slate-100 text-slate-400 font-black py-4 rounded-2xl uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all"
                      >
                        Cerrar
                      </button>
                      <button 
                        onClick={() => {
                          setSelectedNotif(null);
                          if (selectedNotif.id === 1) navigate('/mensajes');
                          if (selectedNotif.id === 2) navigate('/mensajes');
                          if (selectedNotif.id === 3) navigate('/perfil');
                        }}
                        className="flex-1 bg-primary text-white font-black py-4 rounded-2xl shadow-lg shadow-primary/20 uppercase tracking-widest text-[10px] hover:brightness-110 active:scale-95 transition-all"
                      >
                        Ir al recurso
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            <button className="p-2 text-slate-500 hover:bg-slate-50 rounded-full transition-colors md:hidden" onClick={() => setIsOpen(!isOpen)}>
              {isOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Profile Button */}
            <div className="relative">
              <div 
                className="hidden md:flex items-center gap-3 ml-2 border-l border-slate-100 pl-4 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => { setShowProfile(!showProfile); setShowNotifications(false); }}
              >
                <div className="text-right">
                  <p className="text-xs font-black text-slate-800 leading-none">{user?.companyName || 'Visitante'}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{user?.isPremium ? 'PRO' : 'Básico'}</p>
                </div>
                <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 overflow-hidden relative border border-slate-200">
                  {user && user.avatarUrl ? (
                    <img src={user.avatarUrl} className="w-full h-full object-cover" alt="Profile" />
                  ) : user ? (
                    <span className="font-black text-xs text-primary">{user.companyName[0]}</span>
                  ) : (
                    <User size={20} />
                  )}
                </div>
              </div>

              <AnimatePresence>
                {showProfile && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-72 bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden z-50 font-sans"
                  >
                    <div className="p-6 bg-gradient-to-br from-slate-50 to-white border-b border-slate-100">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-black text-lg overflow-hidden">
                          {user?.avatarUrl ? (
                            <img src={user.avatarUrl} className="w-full h-full object-cover" alt="Avatar" />
                          ) : (
                            user?.companyName?.[0] || 'V'
                          )}
                        </div>
                        <div>
                          <h4 className="font-black text-slate-800 leading-tight">{user?.companyName || 'Visitante'}</h4>
                          <p className="text-xs text-slate-500 font-medium">{user?.email || 'Sin cuenta'}</p>
                        </div>
                      </div>
                      <div className="bg-white border border-slate-100 rounded-xl p-3 flex justify-between items-center shadow-sm">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Plan Actual</span>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest",
                          user?.isPremium ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                        )}>
                          {user?.isPremium ? 'PRO' : 'Básico'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="p-2">
                      <ProfileNavItem 
                        icon={<User size={16} />} 
                        label="Mi Perfil" 
                        onClick={() => { setShowProfile(false); navigate('/perfil', { state: { activeTab: 'profile' } }); }} 
                      />
                      <ProfileNavItem 
                        icon={<Settings size={16} />} 
                        label="Configuración" 
                        onClick={() => { setShowProfile(false); navigate('/perfil', { state: { activeTab: 'config' } }); }} 
                      />
                      <ProfileNavItem 
                        icon={<ShieldCheck size={16} />} 
                        label="Privacidad" 
                        onClick={() => { setShowProfile(false); navigate('/perfil', { state: { activeTab: 'privacy' } }); }} 
                      />
                      <div className="h-px bg-slate-50 my-2 mx-2" />
                      {user ? (
                        <ProfileNavItem icon={<LogOut size={16} />} label="Cerrar Sesión" onClick={handleLogout} danger />
                      ) : (
                        <ProfileNavItem icon={<ChevronRight size={16} />} label="Registrarse / Login" onClick={() => { setShowProfile(false); navigate('/registro'); }} />
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-full left-0 w-full bg-white border-b border-slate-100 p-6 flex flex-col gap-4 md:hidden"
          >
            {links.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className="text-lg font-bold text-slate-700 active:text-primary"
              >
                {link.name}
              </Link>
            ))}
            <Link to="/premium" onClick={() => setIsOpen(false)} className="bg-[#724116] text-white text-center font-bold py-3 rounded-lg mt-2 shadow-lg shadow-amber-900/20">
              Hazte Premium
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

function ProfileNavItem({ icon, label, onClick, danger = false }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors text-left",
        danger ? "text-red-500 hover:bg-red-50" : "text-slate-600 hover:bg-slate-50"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

export function Footer() {
  const { legalModal, setLegalModal } = useAppStore();
  const navigate = useNavigate();

  const socialLinks = [
    { icon: <Instagram size={18} />, label: 'Instagram', href: '#' },
    { icon: <Linkedin size={18} />, label: 'LinkedIn', href: '#' },
    { icon: <Twitter size={18} />, label: 'Twitter', href: '#' },
  ];

  return (
    <footer className="bg-[#0b1c30] text-slate-300 border-t border-slate-800 py-20 mt-auto">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="flex items-center gap-3 mb-6 group">
              <Logo className="w-10 h-10 text-white group-hover:scale-110 transition-transform" />
              <span className="text-3xl font-black text-white tracking-tighter italic">Sinergia</span>
            </Link>
            <p className="text-slate-400 max-w-sm mb-8 leading-relaxed font-medium">
              Conectando el tejido industrial español con tecnología de matching avanzada. 
              Eficiencia, seguridad y crecimiento estratégico para tu empresa.
            </p>
            <div className="flex gap-4">
              {socialLinks.map(s => (
                <a key={s.label} href={s.href} className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center hover:bg-primary hover:text-white transition-all">
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-white font-black uppercase tracking-widest text-xs mb-6">Plataforma</h4>
            <ul className="space-y-4 text-sm font-bold">
              <li><Link to="/explorar" className="hover:text-primary transition-colors">Ver Mercado</Link></li>
              <li><Link to="/premium" className="hover:text-primary transition-colors">Planes de Crecimiento</Link></li>
              <li><Link to="/ayuda" className="hover:text-primary transition-colors flex items-center gap-2">Ayuda IA <span className="bg-primary/20 text-primary text-[8px] px-1.5 py-0.5 rounded uppercase">Nuevo</span></Link></li>
              <li><button onClick={() => { 
                if (location.pathname === '/') {
                  document.getElementById('academia')?.scrollIntoView({ behavior: 'smooth' });
                } else {
                  navigate('/', { state: { scrollTo: 'academia' } });
                }
              }} className="hover:text-primary transition-colors cursor-pointer text-left">Tutoriales Video</button></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-black uppercase tracking-widest text-xs mb-6">Legal & Registro</h4>
            <ul className="space-y-4 text-sm font-bold">
              <li><button onClick={() => { window.scrollTo(0, 0); navigate('/perfil', { state: { activeTab: 'privacy' } }); }} className="hover:text-primary transition-colors text-left cursor-pointer">Privacidad</button></li>
              <li><button onClick={() => { window.scrollTo(0, 0); setLegalModal('terms'); }} className="hover:text-primary transition-colors text-left cursor-pointer">Términos de Uso</button></li>
              <li><button onClick={() => { window.scrollTo(0, 0); setLegalModal('contact'); }} className="hover:text-primary transition-colors text-left">Contacto Directo</button></li>
              <li><Link to="/registro" className="text-primary hover:underline">Unirse a la Red</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-bold uppercase tracking-widest text-slate-500">
          <p>© 2026 Sinergia Eficiente S.A. Todos los derechos reservados.</p>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            Sistemas Operativos v4.2
          </div>
        </div>
      </div>

      <AnimatePresence>
        {legalModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white text-slate-800 w-full max-w-2xl rounded-3xl p-10 relative overflow-hidden shadow-2xl"
            >
              <button 
                onClick={() => setLegalModal(null)}
                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-800 transition-colors"
              >
                <X size={24} />
              </button>

              {legalModal === 'privacy' && (
                <div className="max-h-[70vh] overflow-y-auto pr-6 custom-scrollbar">
                  <div className="bg-emerald-50 text-emerald-700 p-6 rounded-3xl flex items-center gap-4 mb-8 border border-emerald-100">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                      <ShieldCheck size={28} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black italic tracking-tighter">Política de Privacidad Integral</h2>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Última actualización: Mayo 2026</p>
                    </div>
                  </div>
                  
                  <div className="space-y-10 text-slate-600 font-medium leading-relaxed">
                    <section className="relative pl-12 border-l-2 border-slate-100">
                      <div className="absolute -left-[17px] top-0 w-8 h-8 bg-white border-2 border-slate-100 rounded-full flex items-center justify-center text-[11px] font-black">01</div>
                      <h4 className="font-black text-slate-800 uppercase tracking-widest text-xs mb-3">Tratamiento de Datos Personales</h4>
                      <p className="text-sm">En estricto cumplimiento con la <strong>Ley Orgánica de Protección de Datos (LOPD)</strong> y el RGPD, garantizamos que el 100% de tus comunicaciones están cifradas. No almacenamos contraseñas en texto plano y utilizamos protocolos de seguridad bancaria.</p>
                    </section>

                    <section className="relative pl-12 border-l-2 border-slate-100">
                      <div className="absolute -left-[17px] top-0 w-8 h-8 bg-white border-2 border-slate-100 rounded-full flex items-center justify-center text-[11px] font-black">02</div>
                      <h4 className="font-black text-slate-800 uppercase tracking-widest text-xs mb-3">Transparencia en el Ecosistema</h4>
                      <p className="text-sm">Tus datos corporativos se utilizan exclusivamente para alimentar nuestro motor de <strong>Smart Matching</strong>. No vendemos ni cedemos bases de datos a terceros externos al ecosistema de alianzas estratégicas de Sinergia.</p>
                    </section>

                    <section className="relative pl-12 border-l-2 border-slate-100">
                      <div className="absolute -left-[17px] top-0 w-8 h-8 bg-white border-2 border-slate-100 rounded-full flex items-center justify-center text-[11px] font-black">03</div>
                      <h4 className="font-black text-slate-800 uppercase tracking-widest text-xs mb-3">Derechos y Control del Usuario</h4>
                      <p className="text-sm">Mantenemos el principio de soberanía de datos. Tienes derecho de <strong>acceso, rectificación, cancelación y oposición (ARCO)</strong>. Puedes descargar o eliminar tu perfil completo desde el panel de control en cualquier momento.</p>
                    </section>

                    <section className="relative pl-12 border-l-2 border-slate-100">
                      <div className="absolute -left-[17px] top-0 w-8 h-8 bg-white border-2 border-slate-100 rounded-full flex items-center justify-center text-[11px] font-black">04</div>
                      <h4 className="font-black text-slate-800 uppercase tracking-widest text-xs mb-3">Seguridad Cibernética Avanzada</h4>
                      <p className="text-sm">Implementamos auditorías mensuales de penetración y sistemas de detección de intrusos para asegurar que la integridad del mercado B2B se mantenga inalterable ante cualquier amenaza externa.</p>
                    </section>
                  </div>
                </div>
              )}

              {legalModal === 'terms' && (
                <div>
                  <div className="bg-slate-50 text-slate-800 p-6 rounded-3xl flex items-center gap-4 mb-8 border border-slate-100">
                    <FileText size={28} className="text-primary" />
                    <div>
                      <h2 className="text-xl font-black italic tracking-tighter">Normativa y Condiciones de Uso</h2>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Sinergia Ecosystem v4.2</p>
                    </div>
                  </div>
                  <div className="max-h-[60vh] overflow-y-auto space-y-6 pr-4 custom-scrollbar text-sm font-medium text-slate-600 leading-relaxed">
                    <div className="space-y-2">
                       <h4 className="font-black text-slate-800 uppercase tracking-widest text-[10px]">1. Uso Profesional Verificado</h4>
                       <p>La plataforma Sinergia está reservada exclusivamente para entidades jurídicas y profesionales autónomos verificados. Queda estrictamente prohibido el uso de la red con fines de spam, prospección masiva no autorizada o captura de datos (scraping).</p>
                    </div>
                    <div className="space-y-2">
                       <h4 className="font-black text-slate-800 uppercase tracking-widest text-[10px]">2. Veracidad e Integridad de Datos</h4>
                       <p>El usuario garantiza que toda la información volcada en su perfil corporativo (servicios, presupuestos, productos y certificaciones) es veraz y actual. Sinergia se reserva el derecho de auditar y suspender de forma inmediata cualquier perfil que contenga información falsa o engañosa.</p>
                    </div>
                    <div className="space-y-2">
                       <h4 className="font-black text-slate-800 uppercase tracking-widest text-[10px]">3. Suscripciones y Plan Premium</h4>
                       <p>El plan Sinergia Pro ofrece ventajas competitivas en el algoritmo de matching y acceso a licitaciones exclusivas. Estos planes son de carácter mensual; la cancelación de la suscripción antes de finalizar el periodo no conlleva el reembolso de la cuota ya devengada.</p>
                    </div>
                    <div className="space-y-2">
                       <h4 className="font-black text-slate-800 uppercase tracking-widest text-[10px]">4. Protección de Alianzas Comerciales</h4>
                       <p>Los contactos y negociaciones establecidos a través del sistema de matching inteligente están sujetos a las leyes de secreto comercial y confidencialidad mercantil vigentes. La vulneración de esta confianza podrá suponer la expulsión definitiva de la red.</p>
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold border-t border-slate-50 pt-4 italic">Al utilizar Sinergia, usted declara haber leído y aceptado estas condiciones para el fomento de un mercado B2B seguro y eficiente.</p>
                  </div>
                </div>
              )}

              {legalModal === 'contact' && (
                <div className="text-center">
                  <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary mx-auto mb-6">
                    <Share2 size={40} />
                  </div>
                  <h2 className="text-2xl font-black text-slate-800 mb-2">Conecta con Nosotros</h2>
                  <p className="text-slate-500 font-medium mb-10">Estamos disponibles 24/7 para soporte premium y alianzas institucionales.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <a href="tel:+34658518844" className="flex items-center gap-4 bg-slate-50 p-6 rounded-2xl hover:bg-slate-100 transition-colors border border-slate-200">
                      <div className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center"><Phone size={24} /></div>
                      <div className="text-left">
                        <p className="text-[10px] font-black text-slate-400 uppercase">Llámanos</p>
                        <p className="font-bold text-slate-800">+34 658 51 88 44</p>
                      </div>
                    </a>
                    <div className="flex items-center gap-4 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                      <div className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center"><Mail size={24} /></div>
                      <div className="text-left">
                        <p className="text-[10px] font-black text-slate-400 uppercase">Email Soporte</p>
                        <p className="font-bold text-slate-800">hola@sinergia.com</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-10 flex justify-center gap-8">
                    {socialLinks.map(s => (
                      <a key={s.label} href={s.href} className="text-slate-400 hover:text-primary transition-colors flex flex-col items-center gap-2">
                        {s.icon}
                        <span className="text-[10px] font-black uppercase tracking-wider">{s.label}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </footer>
  );
}
