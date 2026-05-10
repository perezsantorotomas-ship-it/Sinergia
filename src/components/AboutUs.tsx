import React from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Instagram, Facebook, Twitter, ShieldCheck, TrendingUp, Users } from 'lucide-react';
import { Logo } from './Logo';
import { useAppStore } from '../lib/store';

export default function AboutUsPage() {
  const navigate = useNavigate();
  const { setLegalModal } = useAppStore();
  return (
    <div className="pt-16 min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-slate-50 py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl font-black text-slate-800 mb-6 tracking-tighter"
          >
            Nuestra Misión Profesional
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-slate-500 font-medium leading-relaxed"
          >
            Conoce la historia y el propósito detrás de la plataforma que está transformando el networking B2B en España.
          </motion.p>
        </div>
      </section>

      {/* Main Content Section */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white border border-slate-100 rounded-[2.5rem] p-12 shadow-sm grid grid-cols-1 lg:grid-cols-2 gap-16">
            <div>
              <div className="inline-block pb-1 border-b-4 border-primary/20 mb-8">
                <h2 className="text-4xl font-black text-slate-800 tracking-tight">Sobre Nosotros</h2>
              </div>
              <p className="text-lg italic font-bold text-primary mb-8 leading-relaxed">
                "Un punto de encuentro donde la oferta y la demanda empresarial se conectan".
              </p>
              
              <div className="space-y-6 text-slate-600 font-medium leading-relaxed">
                <p>
                  En el tejido empresarial español, miles de pymes y autónomos cierran anualmente no por falta de calidad en sus productos o servicios, sino por una desconexión crítica con el mercado y socios potenciales. Sinergia nace como una respuesta tecnológica y social a esta problemática, estableciendo un ecosistema donde la colaboración prevalece sobre la competencia aislada, rescatando negocios viables mediante la exposición estratégica.
                </p>
                <p>
                  Sinergia es una plataforma web B2B (Business to Business) bajo un modelo freemium. Funciona como un ecosistema híbrido que combina la agilidad de un marketplace, la estructura de una red profesional y la eficacia de un sistema de 'matching' inteligente. Es, en esencia, un punto de encuentro donde la oferta y la demanda empresarial se conectan mediante algoritmos de compatibilidad.
                </p>
              </div>
            </div>

            <div className="flex flex-col justify-center">
              <div className="bg-slate-50 border-l-4 border-primary p-8 rounded-2xl">
                <p className="text-slate-700 font-medium leading-relaxed">
                  La finalidad última de Sinergia es actuar como un <strong className="text-slate-900">estabilizador del tejido económico español</strong>. Busca transformar el panorama actual de 'soledad empresarial' en uno de 'cooperación asistida', asegurando que ningún buen producto o servicio se pierda por falta de conexiones, fortaleciendo así la economía local y la supervivencia del pequeño comercio y las pymes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sinergia Pro Section */}
      <section className="py-20 px-6 bg-[#f0f4ff]">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-black text-slate-800 mb-6 tracking-tight">Sinergia Pro: Ecosistema B2B</h2>
              <p className="text-lg text-slate-600 font-medium mb-12 leading-relaxed">
                Únete a miles de profesionales que ya están cerrando acuerdos estratégicos gracias a nuestras herramientas de inteligencia de red.
              </p>
              
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="text-3xl font-black text-primary">15k+</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Usuarios Activos</p>
                </div>
                <div>
                  <p className="text-3xl font-black text-primary">4.9/5</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Valoración</p>
                </div>
              </div>
            </div>
            
            <div className="relative group">
              <div className="absolute -inset-4 bg-primary/20 rounded-[3rem] blur-2xl group-hover:bg-primary/30 transition-all"></div>
              <img 
                src="https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&q=80&w=1000" 
                alt="Empresa" 
                className="relative rounded-[2.5rem] shadow-2xl border-4 border-white aspect-video object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Socials Section */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-black text-slate-800 mb-12 uppercase tracking-widest">Síguenos en nuestras redes</h2>
          <div className="flex justify-center gap-8">
            <SocialIcon icon={<Instagram />} label="Instagram" />
            <SocialIcon icon={<Facebook />} label="Facebook" />
            <div className="flex flex-col items-center gap-4 group cursor-pointer">
              <div className="w-16 h-16 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-primary group-hover:border-primary/20 group-hover:shadow-lg transition-all">
                <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z"/></svg>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">TikTok</span>
            </div>
            <SocialIcon icon={<Twitter />} label="X" />
          </div>
        </div>
      </section>

      {/* Mini Footer */}
      <div className="py-20 border-t border-slate-100 text-center">
        <Logo className="w-10 h-10 text-primary mx-auto mb-6" />
        <h3 className="text-xl font-black italic tracking-tighter text-primary mb-4">Sinergia Pro</h3>
        <div className="flex justify-center gap-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
          <button onClick={() => { window.scrollTo(0, 0); setLegalModal('terms'); }} className="hover:text-primary cursor-pointer">Términos</button>
          <button onClick={() => { window.scrollTo(0, 0); navigate('/perfil', { state: { activeTab: 'privacy' } }); }} className="hover:text-primary cursor-pointer">Privacidad</button>
          <button onClick={() => { window.scrollTo(0, 0); navigate('/ayuda'); }} className="hover:text-primary cursor-pointer">Ayuda</button>
        </div>
        <p className="text-[9px] text-slate-300 font-bold uppercase tracking-widest">© 2026 Sinergia Platform. Todos los derechos reservados.</p>
      </div>
    </div>
  );
}

function SocialIcon({ icon, label }: { icon: React.ReactNode, label: string }) {
  return (
    <div className="flex flex-col items-center gap-4 group cursor-pointer">
      <div className="w-16 h-16 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-primary group-hover:border-primary/20 group-hover:shadow-lg transition-all">
        {icon}
      </div>
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
    </div>
  );
}
