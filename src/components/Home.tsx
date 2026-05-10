import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Zap, Handshake, Shield, Target, ArrowRight, Network, Video, ChevronRight, Check } from 'lucide-react';
import { cn } from '../lib/utils';

import { useAppStore } from '../lib/store';
import { Logo } from './Logo';

export default function HomePage() {
  const { user } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.scrollTo === 'academia') {
      const element = document.getElementById('academia');
      if (element) {
        const scrollTimeout = setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
        return () => clearTimeout(scrollTimeout);
      }
    }
  }, [location.state]);

  return (
    <div className="pt-16 overflow-hidden">
      {/* Hero Section */}
      <section className="relative px-6 py-24 md:py-32 flex flex-col items-center text-center">
        <motion.div
           initial={{ opacity: 0, scale: 0.8 }}
           animate={{ opacity: 1, scale: 1 }}
           className="mb-12"
        >
          <Logo className="w-24 h-24 text-primary" />
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-primary/5 text-primary text-[10px] font-black uppercase tracking-[0.2em] px-6 py-2 rounded-full mb-8 border border-primary/10"
        >
          Ecosistema B2B Asistido
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl md:text-7xl font-black text-[#0b1c30] tracking-tight max-w-4xl mb-8 leading-[1.1]"
        >
          El punto de encuentro donde <span className="text-primary italic">negocios viables</span> prosperan.
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-lg md:text-xl text-slate-500 max-w-2xl mb-12 font-medium"
        >
          Rescatamos pymes y autónomos mediante un sistema híbrido de red profesional y matching inteligente asistido por IA.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <Link to="/explorar" className="bg-primary text-white font-black text-sm uppercase tracking-widest px-10 py-5 rounded-2xl shadow-xl shadow-primary/20 hover:brightness-110 active:scale-95 transition-all">
            Ver Mercado
          </Link>
          <Link to={user ? "/perfil" : "/login"} className="bg-white text-slate-800 border-2 border-slate-100 font-black text-sm uppercase tracking-widest px-10 py-5 rounded-2xl hover:bg-slate-50 active:scale-95 transition-all">
            {user ? "Mi Perfil" : "Iniciar Sesión"}
          </Link>
        </motion.div>

        {/* Floating elements simulation */}
        <div className="absolute top-40 left-10 hidden lg:block">
          <FloatingCard icon={<Handshake size={20} />} label="Match 98%" color="bg-emerald-500" />
        </div>
        <div className="absolute bottom-40 right-10 hidden lg:block">
          <FloatingCard icon={<Target size={20} />} label="Socio Ideal" color="bg-secondary" delay={1} />
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-7xl mx-auto px-6 py-32 border-t border-slate-100">
        <div className="flex flex-col items-center text-center mb-20">
          <span className="text-primary font-black text-[10px] uppercase tracking-widest mb-4">Valor Diferencial</span>
          <h2 className="text-4xl md:text-5xl font-black text-slate-800 tracking-tight leading-tight max-w-3xl">
            Tecnología diseñada para la <span className="text-primary underline decoration-4 underline-offset-8">viabilidad económica</span> del tejido empresarial.
          </h2>
        </div>
        
        <div className="grid md:grid-cols-3 gap-16">
          <Feature 
            icon={<Zap size={40} />} 
            title="Matching por IA" 
            desc="Nuestros algoritmos de IA no solo buscan palabras clave; analizan la capacidad productiva, la salud financiera y la compatibilidad estratégica de los socios potenciales en tiempo real."
            details={[
              "Búsqueda semántica inteligente",
              "Análisis de compatibilidad 95%",
              "Sugerencias proactivas B2B"
            ]}
          />
          <Feature 
            icon={<Shield size={40} />} 
            title="Confianza Corporate" 
            desc="Eliminamos el 'ruido' del mercado masivo. Solo empresas verificadas con tomadores de decisiones reales pueden acceder a las negociaciones de alto nivel dentro del ecosistema."
            details={[
              "Verificación KYC de empresa",
              "Entorno 100% privado",
              "Firma digital integrada"
            ]}
          />
          <Feature 
            icon={<Network size={40} />} 
            title="Ecosistemas Híbridos" 
            desc="Combinamos la inmediatez de un marketplace digital con la solidez de una red de contactos tradicional. Una infraestructura dual que asegura transacciones rápidas y relaciones duraderas."
            details={[
              "Marketplace de servicios",
              "Red de alianzas profundas",
              "Sincronización multi-plataforma"
            ]}
          />
        </div>
      </section>

      {/* Video Tutorials Section */}
      <section id="academia" className="bg-slate-50 py-24 px-6 border-y border-slate-100">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-16">
            <div className="max-w-2xl">
              <span className="text-primary font-black text-[10px] uppercase tracking-widest mb-4 block">Academia Sinergia</span>
              <h2 className="text-4xl font-black text-slate-800 tracking-tight leading-tight mb-4">Aprende a dominar el mercado <span className="text-primary italic">en minutos.</span></h2>
              <p className="text-slate-500 font-medium">Hemos preparado una serie de vídeos cortos para que saques el máximo provecho a nuestra plataforma de matching.</p>
            </div>
            <button 
              onClick={() => navigate(user ? '/explorar' : '/login')}
              className="flex items-center gap-2 bg-white border border-slate-200 px-6 py-3 rounded-xl font-bold text-sm text-slate-700 hover:bg-slate-50 transition-all font-sans"
            >
              <Video size={18} />
              Ver todos los tutoriales
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <TutorialCard 
              title="Cómo crear un perfil imbatible" 
              time="3:45" 
              thumb="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60" 
              onClick={() => {
                if (!user) navigate('/login');
                else navigate('/explorar');
              }}
            />
            <TutorialCard 
              title="Cerrando alianzas estratégicas" 
              time="5:12" 
              thumb="https://images.unsplash.com/photo-1521791136064-7986c2959d93?w=800&auto=format&fit=crop&q=60" 
              onClick={() => {
                if (!user) navigate('/login');
                else navigate('/explorar');
              }}
            />
            <TutorialCard 
              title="Uso de la IA para negociaciones" 
              time="4:20" 
              thumb="https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&auto=format&fit=crop&q=60" 
              onClick={() => {
                if (!user) navigate('/login');
                else navigate('/explorar');
              }}
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-[#0b1c30] text-white py-24 px-6 relative overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-16 relative z-10">
          <div className="flex-1">
            <div className="w-12 h-1 bg-primary mb-8" />
            <h2 className="text-4xl md:text-6xl font-black mb-8 leading-tight tracking-tighter">Fortalece el tejido económico <span className="text-primary-fixed italic font-normal">hoy.</span></h2>
            <p className="text-lg text-slate-400 mb-12 max-w-xl font-medium leading-relaxed">No permitas que la desconexión afecte a tu negocio. Únete a miles de profesionales cooperando en nuestro ecosistema.</p>
            <Link to="/premium" className="bg-[#724116] text-white font-black text-sm uppercase tracking-widest px-12 py-6 rounded-2xl inline-flex items-center gap-3 hover:brightness-110 hover:-translate-y-1 transition-all shadow-2xl shadow-amber-900/40">
              Ver Planes Premium
              <ArrowRight size={20} />
            </Link>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-8 w-full max-w-lg">
            <div className="bg-white/5 border border-white/10 p-10 rounded-[3rem] aspect-square flex flex-col justify-between group hover:bg-primary/10 transition-colors">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Network size={24} className="text-primary-fixed" />
              </div>
              <div>
                <span className="text-5xl font-black text-primary-fixed mb-2 block tracking-tighter">15k+</span>
                <span className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] leading-none">Miembros Activos</span>
              </div>
            </div>
            <div className="bg-primary/20 border border-primary/20 p-10 rounded-[3rem] aspect-square flex flex-col justify-between group hover:bg-primary/30 transition-colors">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Zap size={24} className="text-white" />
              </div>
              <div>
                <span className="text-5xl font-black text-white mb-2 block tracking-tighter">4.9/5</span>
                <span className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] leading-none">Sinergia Rating</span>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[150px]" />
        <div className="absolute -bottom-20 -left-20 w-[400px] h-[400px] bg-secondary/5 rounded-full blur-[120px]" />
      </section>
    </div>
  );
}

function TutorialCard({ title, time, thumb, onClick }: any) {
  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-[2rem] overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl transition-all group cursor-pointer"
    >
      <div className="aspect-video relative overflow-hidden">
        <img src={thumb} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-14 h-14 bg-white/90 backdrop-blur rounded-full flex items-center justify-center text-primary shadow-lg group-hover:scale-110 transition-transform">
            <Zap size={24} fill="currentColor" />
          </div>
        </div>
        <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur text-white text-[10px] font-black px-2 py-1 rounded-lg">
          {time}
        </div>
      </div>
      <div className="p-8">
        <h3 className="font-black text-slate-800 mb-2 group-hover:text-primary transition-colors">{title}</h3>
        <button className="text-primary text-xs font-black uppercase tracking-widest flex items-center gap-2">
          Ver tutorial
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

function Feature({ icon, title, desc, details = [] }: any) {
  return (
    <div className="flex flex-col items-center text-center group">
      <div className="w-24 h-24 bg-primary/5 rounded-[2rem] flex items-center justify-center text-primary mb-10 group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-sm">
        {icon}
      </div>
      <h3 className="text-2xl font-black text-slate-800 mb-6 tracking-tight">{title}</h3>
      <p className="text-slate-500 font-medium leading-relaxed max-w-sm mb-8">{desc}</p>
      
      {details.length > 0 && (
        <div className="flex flex-col gap-2 w-full max-w-[240px]">
          {details.map((detail: string, i: number) => (
            <div key={i} className="flex items-center gap-2 text-left bg-slate-50 p-3 rounded-xl border border-slate-100 group-hover:bg-white group-hover:shadow-md transition-all">
              <Check size={14} className="text-primary shrink-0" />
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{detail}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FloatingCard({ icon, label, color, delay = 0 }: any) {
  return (
    <motion.div 
      initial={{ y: 0 }}
      animate={{ y: [0, -20, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay }}
      className="bg-white border border-slate-200 p-4 rounded-2xl shadow-elevated flex items-center gap-3"
    >
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white", color)}>
        {icon}
      </div>
      <span className="text-sm font-black text-slate-800">{label}</span>
    </motion.div>
  );
}
