import React from 'react';
import { motion } from 'motion/react';
import { Check, Zap, Rocket, Star, Globe, ShieldCheck } from 'lucide-react';
import { cn } from '../lib/utils';

import { useAppStore } from '../lib/store';
import { useNavigate } from 'react-router-dom';

export default function PricingPage() {
  const { user, updateUser } = useAppStore();
  const navigate = useNavigate();

  const handleUpgrade = async () => {
    if (!user) {
      navigate('/registro');
      return;
    }
    
    const updatedUser = { ...user, isPremium: !user.isPremium };
    updateUser({ isPremium: !user.isPremium });
    
    // Save to Firestore
    const { saveUserToFirestore } = await import('../lib/userService');
    await saveUserToFirestore(updatedUser);
    
    navigate('/explorar');
  };

  const plans = [
    {
      name: 'Plan Básico',
      price: '0',
      description: 'Perfecto para empezar a explorar el ecosistema.',
      features: [
        'Perfil profesional',
        'Visibilidad básica',
        'Búsqueda limitada',
        '1 contacto/mes',
      ],
      cta: 'Empezar gratis',
      highlight: false,
      onClick: () => !user && navigate('/registro')
    },
    {
      name: 'Plan Premium',
      price: '9,90',
      description: 'Maximiza tus oportunidades con herramientas Pro.',
      features: [
        'Contactos ilimitados',
        'Analítica avanzada',
        'Filtros inteligentes',
        'Prioridad en búsquedas',
        'Soporte 24/7',
      ],
      cta: user?.isPremium ? 'Plan Actual' : 'Hazte Premium',
      highlight: true,
      onClick: handleUpgrade
    }
  ];

  return (
    <div className="pt-32 pb-24 min-h-screen">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-20">
          <motion.h1 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-4xl md:text-6xl font-black text-slate-900 mb-6"
          >
            Impulsa tu Red de <span className="text-primary tracking-tighter">Contactos</span>
          </motion.h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            Elige el plan que mejor se adapte a tus necesidades profesionales y empieza hoy mismo.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, idx) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, x: idx === 0 ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              className={cn(
                "p-10 rounded-2xl flex flex-col",
                plan.highlight 
                  ? "bg-white border-2 border-primary shadow-elevated relative z-10" 
                  : "bg-slate-50 border border-slate-200"
              )}
            >
              {plan.highlight && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-black uppercase tracking-widest px-6 py-2 rounded-full">
                  RECOMENDADO
                </div>
              )}
              
              <div className="mb-8">
                <h3 className="text-2xl font-black text-slate-800 mb-2">{plan.name}</h3>
                <p className="text-sm text-slate-500 font-medium">{plan.description}</p>
              </div>

              <div className="flex items-baseline gap-1 mb-10">
                <span className="text-5xl font-black text-slate-900">{plan.price}€</span>
                <span className="text-slate-400 font-bold">/mes</span>
              </div>

              <ul className="space-y-4 mb-12 flex-grow">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-3 text-sm font-bold text-slate-600">
                    <Check size={18} className="text-emerald-500" strokeWidth={3} />
                    {f}
                  </li>
                ))}
              </ul>

              <button 
                onClick={plan.onClick}
                disabled={plan.highlight && user?.isPremium}
                className={cn(
                  "w-full py-5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-[0.98] shadow-ambient",
                  plan.highlight 
                    ? user?.isPremium 
                      ? "bg-slate-100 text-slate-400 cursor-default border-2 border-slate-200"
                      : "bg-[#004d43] text-white shadow-lg shadow-[#004d43]/20 hover:brightness-110 hover:translate-y-[-2px]" 
                    : "bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-50"
                )}
              >
                {plan.cta}
              </button>
            </motion.div>
          ))}
        </div>

        <div className="mt-24 bg-surface-container rounded-3xl p-12 text-center overflow-hidden relative">
          <div className="relative z-10 max-w-3xl mx-auto">
            <h2 className="text-3xl font-black text-slate-900 mb-6">Confianza Corporativa</h2>
            <p className="text-slate-600 font-medium mb-10 leading-relaxed">
              Únete a miles de profesionales que ya están cerrando acuerdos estratégicos de alto nivel gracias a nuestras herramientas de inteligencia de red.
            </p>
          <div className="flex flex-wrap justify-center gap-12">
            <Stat value="15k+" label="Usuarios Activos" />
            <Stat value="4.9/5" label="Valoración" />
            <Stat value="Garantía LOPD" label="Privacidad Total" />
          </div>
          </div>
          <div className="absolute -left-20 -bottom-20 opacity-5">
            <ShieldCheck size={400} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string, label: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-3xl font-black text-primary">{value}</span>
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
    </div>
  );
}
