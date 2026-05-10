import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, MapPin, Network, Shield, CheckCircle, 
  ArrowRight, Zap, Target, Lock, Star, 
  X, Briefcase, Sparkles, Building2, Globe, ChevronRight, Users, ShieldAlert
} from 'lucide-react';
import { cn, MOCK_PARTNERS } from '../lib/utils';
import { INDUSTRIAL_SECTORS } from '../lib/constants';
import { useAppStore } from '../lib/store';
import CompanyReviews from './Reviews';
import { GoogleGenAI } from "@google/genai";
import Markdown from 'react-markdown';
import { db } from '../lib/firebase';
import { doc, updateDoc, arrayRemove } from 'firebase/firestore';

export default function ExplorePage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [serviceSearch, setServiceSearch] = useState('');
  const [budgetFilter, setBudgetFilter] = useState<number | ''>('');
  const [durationFilter, setDurationFilter] = useState<string>('all');
  const [viewingReviews, setViewingReviews] = useState<string | null>(null);
  const [selectedSector, setSelectedSector] = useState<string>('all');
  const [selectedPartner, setSelectedPartner] = useState<any | null>(null);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([]);
  const [userQuery, setUserQuery] = useState('');
  const { user, matches, addMatch, unblockUser } = useAppStore();
  const isPremium = user?.isPremium;

  const handleUnblock = async (e: React.MouseEvent, partnerId: string) => {
    e.stopPropagation();
    if (!user) return;
    
    try {
      unblockUser(partnerId);
      await updateDoc(doc(db, 'users', user.id), {
        blockedUsers: arrayRemove(partnerId)
      });
      alert("Empresa desbloqueada correctamente.");
    } catch (error) {
      console.error("Error unblocking user:", error);
      alert("Error al desbloquear la empresa.");
    }
  };

  const generateAiInsight = async (partner: any) => {
    if (!user) return;
    setGeneratingAi(true);
    setAiInsight(null);
    setChatMessages([]);
    try {
      const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY no configurado");
      }

      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Actúa como el Asistente de IA de Sinergia. 
Analiza detalladamente la posible colaboración entre mi empresa y ${partner.name}.

DATOS DE MI EMPRESA:
- Nombre: ${user.companyName}
- Sector: ${user.sector}
    // - Objetivos/Búsqueda: ${user.searchQuery}
    - MIS OBJETIVOS ACTUALES: ${user.searchQuery} ${user.objectives?.map((o: any) => `${o.title}: ${o.description} (${o.budget}€)`).join(' | ') || ''}
    - MI PRESUPUESTO ACTUAL: ${user.budget}€
    
    DATOS DE SU EMPRESA:
    - Nombre: ${partner.name}
    - Sector: ${partner.sector}
    - Descripción: ${partner.description}
    - Otros Anuncios/Objetivos del Socio: ${partner.objectives?.map((o: any) => `${o.title}: ${o.description}`).join(' | ') || 'No especificados'}
    - Matching estimado: ${partner.match}%
- CAPACIDAD FINANCIERA/PRESUPUESTO DEL SOCIO: ${partner.budget}€
- SERVICIOS Y TARIFAS: ${partner.services?.map((s: any) => `${s.name} (${s.price}€/${s.unit})`).join(', ') || 'Consultar tarifas'}

REGLA DE ORO DE OPTIMIZACIÓN:
Tu prioridad es la EFICIENCIA. Si detectas que una empresa es cara (> ${user.budget}€), cuestiona si el valor extra es CRÍTICO. Si hay opciones más baratas que cumplen la función, recomiéndalas. Sé honesto: si el cambio de servicio no justifica el sobrecoste, dilo claramente.

TAREA CRÍTICA - ANÁLISIS DE PRESUPUESTO Y RENTABILIDAD (ENFOQUE PYME/SME):
1. DESGLOSE TEMPORAL: Calcula el coste por día, mes y trimestre basándote en su presupuesto anual (${partner.budget}€).
2. VALORACIÓN DE ESCALA: Evalúa si los servicios de ${partner.name} (${partner.services?.map((s: any) => `${s.name}: ${s.price}€/${s.unit}`).join(', ')}) son viables para una inversión pequeña o si requieren gran volumen.
3. DETALLE DEL FACTOR MONETARIO: Compara mi presupuesto (${user.budget}€) con el suyo y sus tarifas.
   - Determina si son un socio "Low-Cost" (ahorro directo), "Balanced" (ajustado) o "Premium" (inversión elevada).
   - ANALIZA PROS Y CONTRAS DEL PRECIO PARA UNA PYME: 
     * Si son más caros: Describe qué beneficios justifican el sobrecoste diario.
     * Si son más baratos: Recalca el AHORRO y la viabilidad para operaciones diarias o semanales (ej: barras de pan, reparto puntual).
2. COMPENSACIÓN ESTRATÉGICA: Por qué encajan operacionalmente.
3. JUSTIFICACIÓN DEL MATCHING (${partner.match}%): Cómo el binomio "Precio-Valor" influye en esta nota.
4. 3 BENEFICIOS CLAVE: Incluye al menos uno de eficiencia económica o ROI a corto plazo (semanal/mensual).
5. PRIMER PASO DE NEGOCIACIÓN: Sugiere cómo abordar la primera reunión enfocándose en la flexibilidad de duración.

Responde en español, con un tono profesional, analítico y altamente detallado sobre el presupuesto. Máximo 250 palabras.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });
      
      const text = response.text || "No se pudo generar el análisis.";
      setAiInsight(text);
      setChatMessages([{ role: 'assistant', content: text }]);
    } catch (error: any) {
      console.error("AI Insight Error:", error);
      setAiInsight("No se pudo generar el insight. Verifica que la API Key esté configurada en el panel de Secrets.");
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleSendMessage = async (partner: any) => {
    if (!userQuery.trim() || !user) return;
    
    const newMessages = [...chatMessages, { role: 'user' as const, content: userQuery }];
    setChatMessages(newMessages);
    setUserQuery('');
    setGeneratingAi(true);

    try {
      const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
      const ai = new GoogleGenAI({ apiKey: apiKey! });
      
      const history = newMessages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));

      const contextPrompt = `Estás asesorando sobre una sinergia con ${partner.name}. 
      Recuerda: Prioriza siempre el presupuesto ajustado. Si el usuario pregunta si compensa pagar más, analiza si la diferencia de funciones es abismal o mínima. 
      Datos del partner: ${JSON.stringify(partner)}. 
      Mi presupuesto: ${user.budget}€.
      Análisis de servicios individuales: Responde detalladamente sobre sus precios (${partner.services?.map((s: any) => `${s.name}: ${s.price}€/${s.unit}`).join(', ')}) y cómo afectan al coste diario/mensual/anual.`;

      const contextHistory = [
        { role: 'user', parts: [{ text: contextPrompt }] },
        { role: 'model', parts: [{ text: "Entendido. Analizaré la rentabilidad y los servicios individuales con total honestidad financiera." }] },
        ...history.slice(0, -1)
      ];

      const chat = ai.chats.create({
        model: "gemini-3-flash-preview",
        history: contextHistory
      });

      const result = await chat.sendMessage({ message: userQuery });
      setChatMessages([...newMessages, { role: 'assistant', content: result.text || 'Sin respuesta' }]);
    } catch (e) {
      console.error(e);
      setChatMessages([...newMessages, { role: 'assistant', content: "Lo siento, ha habido un problema analizando esa consulta. ¿Podrías repetirla?" }]);
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleRequestContact = (id: string) => {
    addMatch(id);
    navigate('/mensajes');
  };

  const filteredPartners = MOCK_PARTNERS.filter(p => {
    // Normal search
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.sector.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Service-specific search
    const matchesService = !serviceSearch || p.services?.some(s => 
      s.name.toLowerCase().includes(serviceSearch.toLowerCase())
    );
    
    // Budget can now be lower
    const matchesBudget = !budgetFilter || (p.budget && p.budget >= Number(budgetFilter));
    
    // Sector filter
    const matchesSector = selectedSector === 'all' || 
      p.sector === selectedSector || 
      p.tags.some(t => t.toLowerCase() === selectedSector.toLowerCase());
    
    // Duration filter logic (simplified for mock)
    // In a real app, this would check available contract types or capacities
    const matchesDuration = durationFilter === 'all' || true; // Mock: all partners support any duration
    
    return matchesSearch && matchesService && matchesBudget && matchesDuration && matchesSector;
  });

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-6">
        {/* Hero Search */}
        <section className="flex flex-col items-center text-center mb-16">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-black text-[#0b1c30] tracking-tight mb-4"
          >
            Acelera tus alianzas estratégicas
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-slate-500 max-w-2xl mb-10"
          >
            Encuentra socios, proveedores y oportunidades de negocio en el ecosistema B2B más eficiente.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="w-full max-w-6xl bg-white border border-slate-200 p-2 rounded-2xl shadow-elevated grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-2"
          >
            <div className="flex items-center px-4 gap-3 bg-slate-50 rounded-xl lg:col-span-1">
              <Search className="text-primary shrink-0" size={20} />
              <input 
                type="text" 
                placeholder="Empresa..."
                className="w-full bg-transparent border-none focus:ring-0 py-4 font-medium text-slate-700 placeholder:text-slate-400 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center px-4 gap-3 bg-slate-50 rounded-xl lg:col-span-1">
              <Building2 className="text-primary shrink-0" size={18} />
              <select 
                className="w-full bg-transparent border-none focus:ring-0 py-4 font-medium text-slate-700 text-sm appearance-none cursor-pointer"
                value={selectedSector}
                onChange={(e) => setSelectedSector(e.target.value)}
              >
                <option value="all">Cualquier Sector</option>
                {INDUSTRIAL_SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex items-center px-4 gap-3 bg-slate-50 rounded-xl">
              <Zap className="text-amber-500 shrink-0" size={18} />
              <input 
                type="text" 
                placeholder="Producto o servicio..."
                className="w-full bg-transparent border-none focus:ring-0 py-4 font-medium text-slate-700 placeholder:text-slate-400 text-sm"
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center px-4 gap-3 bg-slate-50 rounded-xl">
              <Target className="text-secondary shrink-0" size={18} />
              <input 
                type="number" 
                placeholder="Presupuesto mín (€)"
                className="w-full bg-transparent border-none focus:ring-0 py-4 font-medium text-slate-700 placeholder:text-slate-400 text-sm"
                value={budgetFilter}
                onChange={(e) => setBudgetFilter(e.target.value === '' ? '' : Number(e.target.value))}
              />
            </div>
            <div className="flex items-center px-4 gap-3 bg-slate-50 rounded-xl">
              <Network className="text-indigo-500 shrink-0" size={18} />
              <select 
                className="w-full bg-transparent border-none focus:ring-0 py-4 font-medium text-slate-700 text-sm appearance-none cursor-pointer"
                value={durationFilter}
                onChange={(e) => setDurationFilter(e.target.value)}
              >
                <option value="all">Cualquier duración</option>
                <option value="1day">1 día / Jornada</option>
                <option value="1week">1 semana</option>
                <option value="1month">1 mes</option>
                <option value="permanent">Permanente</option>
              </select>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-6 flex flex-wrap justify-center gap-3"
          >
             <button onClick={() => setBudgetFilter(100)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-full text-xs font-bold text-slate-600 transition-colors">Presupuesto bajo (-500€)</button>
             <button onClick={() => setDurationFilter('1day')} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-full text-xs font-bold text-slate-600 transition-colors">Colaboración de un día</button>
             <button onClick={() => setServiceSearch('distribución')} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-full text-xs font-bold text-slate-600 transition-colors">Logística y Reparto</button>
          </motion.div>
        </section>

        {/* Intelligence Banner */}
        <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 mb-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <AnimatePresence>
            {viewingReviews && (
              <CompanyReviews 
                companyId={viewingReviews} 
                companyName={MOCK_PARTNERS.find(p => p.id === viewingReviews)?.name || ''} 
                onClose={() => setViewingReviews(null)} 
              />
            )}
          </AnimatePresence>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
              <Target size={20} />
            </div>
            <p className="text-sm font-medium text-slate-700">
              {isPremium 
                ? "Disfrutas de acceso ilimitado. Tu perfil tiene un 40% más de visibilidad." 
                : "Mostrando los mejores resultados. Hazte Premium para desbloquear contactos de alta compatibilidad."
              }
            </p>
          </div>
          {!isPremium && (
            <button onClick={() => navigate('/premium')} className="text-primary font-bold text-sm hover:underline">Saber más</button>
          )}
        </div>

        {/* Section Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Network className="text-primary" size={28} />
            <h2 className="text-2xl font-black text-slate-800">Matching Inteligente</h2>
          </div>
          <button className="text-secondary font-bold text-sm flex items-center gap-1 hover:underline">
            Ver todas
            <ArrowRight size={16} />
          </button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPartners.length === 0 ? (
            <div className="col-span-full py-20 text-center">
              <p className="text-lg font-bold text-slate-400">No hemos encontrado partners que coincidan con tu búsqueda.</p>
              <button onClick={() => setSearchQuery('')} className="text-primary font-black mt-4 hover:underline uppercase tracking-widest text-xs">Limpiar búsqueda</button>
            </div>
          ) : 
            filteredPartners.map((partner: any, idx) => {
              const isMatched = matches.includes(partner.id);
              const isGated = !isPremium && idx < 2;
              const isBlocked = user?.blockedUsers?.includes(partner.id);

              return (
                <motion.div
                  key={partner.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * idx }}
                  onClick={() => !isGated && !isBlocked && setSelectedPartner(partner)}
                  className={cn(
                    "bg-white border border-slate-100 p-6 rounded-2xl shadow-ambient hover:shadow-elevated transition-shadow group relative overflow-hidden flex flex-col h-full",
                    (!isGated && !isBlocked) && "cursor-pointer",
                    isBlocked && "opacity-75 grayscale-[0.5]"
                  )}
                >
                  {isBlocked && (
                    <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] z-20 flex flex-col items-center justify-center p-6 text-center">
                       <ShieldAlert size={32} className="text-red-500 mb-2" />
                       <p className="text-xs font-black text-red-600 uppercase tracking-widest mb-4">Empresa Bloqueada</p>
                       <button 
                         onClick={(e) => handleUnblock(e, partner.id)}
                         className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
                       >
                         Desbloquear Cuenta
                       </button>
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-6">
                      <div className={cn(
                        "w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 font-black overflow-hidden border border-slate-100",
                        isGated && "blur-sm"
                      )}>
                        {(partner.avatarUrl || partner.logoUrl) ? (
                          <img src={partner.avatarUrl || partner.logoUrl} className="w-full h-full object-cover" alt={partner.name} />
                        ) : (
                          partner.name[0]
                        )}
                      </div>
                      <div 
                        className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold border border-emerald-100 flex items-center gap-1 transition-all cursor-default select-none shadow-sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Zap size={14} fill="currentColor" />
                        {partner.match}% Match
                      </div>
                    </div>

                    <div className="flex flex-col mb-4">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <h3 
                          className={cn("text-xl font-black text-slate-800 leading-tight group-hover:text-emerald-600 transition-colors", isGated && "blur-md select-none")}
                        >
                          {partner.name}
                        </h3>
                        <span className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-[0.15em] border border-emerald-100/50 shadow-sm shadow-emerald-600/5 shrink-0 self-start mt-0.5">
                           {partner.sector}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                         {partner.verified && (
                           <div className="flex items-center gap-1 text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 uppercase tracking-widest">
                             <Shield size={10} fill="currentColor" />
                             Verificado
                           </div>
                         )}
                      </div>
                    </div>
                    
                    <div className="space-y-4 mb-6 pt-4 border-t border-slate-50">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                          <MapPin size={16} className="text-slate-400" />
                          {partner.location}
                        </div>
                      </div>
                      
                      <button 
                        onClick={(e) => { e.stopPropagation(); setViewingReviews(partner.id); }}
                        className="flex items-center gap-1.5 text-xs font-black text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full hover:bg-amber-100 transition-colors w-fit relative z-10"
                      >
                        <Star size={12} fill="#d97706" className="text-amber-600" />
                        VER RESEÑAS
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-8">
                      {partner.tags.map(tag => (
                        <span key={tag} className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-auto pt-6 border-t border-slate-50 relative z-10">
                    {isGated ? (
                      <button 
                        onClick={(e) => { e.stopPropagation(); navigate('/premium'); }}
                        className="w-full bg-[#724116] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:brightness-110 transition-all shadow-lg shadow-amber-900/20"
                      >
                        <Lock size={16} />
                        Desbloquear con Premium
                      </button>
                    ) : isMatched ? (
                      <button 
                        onClick={(e) => { e.stopPropagation(); navigate('/mensajes'); }}
                        className="w-full bg-slate-100 text-slate-500 py-4 rounded-xl font-bold flex items-center justify-center gap-2 cursor-default"
                      >
                        <CheckCircle size={16} className="text-emerald-500" />
                        Contacto Solicitado
                      </button>
                    ) : (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleRequestContact(partner.id); }}
                        className="w-full bg-primary text-white py-4 rounded-xl font-bold hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                      >
                        Solicitar contacto
                        <ArrowRight size={16} />
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })
          }
        </div>

        {/* Premium Upgrade Section */}
        <section className="mt-20 bg-[#04241d] rounded-[2.5rem] p-8 md:p-16 text-white flex flex-col md:flex-row items-center gap-16 overflow-hidden relative">
          <div className="flex-1 relative z-10">
            <div className="bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-xl inline-block mb-8 border border-amber-500/20">
               EXCLUSIVO PREMIUM
            </div>
            <h2 className="text-4xl md:text-6xl font-black mb-8 leading-[1.1] tracking-tighter">Potencia tu red de contactos</h2>
            <p className="text-lg text-slate-400 font-medium mb-12 max-w-xl leading-relaxed">
              Accede a análisis de mercado en tiempo real y recibe propuestas directas de los proveedores líderes del sector. El plan Sinergia Pro está diseñado para empresas que buscan escala y seguridad.
            </p>
            <div className="space-y-6 mb-16">
              <div className="flex items-center gap-4">
                <div className="w-6 h-6 rounded-full border-2 border-amber-500 flex items-center justify-center">
                  <CheckCircle className="text-amber-500" size={14} />
                </div>
                <span className="font-bold text-slate-200">Propuestas ilimitadas de colaboración</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-6 h-6 rounded-full border-2 border-amber-500 flex items-center justify-center">
                  <CheckCircle className="text-amber-500" size={14} />
                </div>
                <span className="font-bold text-slate-200">Acceso a eventos de networking exclusivos</span>
              </div>
            </div>
            <button 
              onClick={() => navigate('/premium')}
              className="bg-[#ffe7b8] text-[#724116] font-black text-sm uppercase tracking-widest px-12 py-6 rounded-2xl hover:brightness-110 active:scale-95 transition-all shadow-2xl shadow-amber-900/20"
            >
              Convertirse en Pro
            </button>
          </div>
          <div className="flex-1 relative w-full h-[400px] md:h-[500px]">
             <div className="absolute inset-0 bg-gradient-to-r from-[#04241d] via-transparent to-transparent z-10 hidden md:block" />
             <div className="absolute inset-0 bg-gradient-to-t from-[#04241d] to-transparent z-10 md:hidden" />
             <img 
               src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1200" 
               alt="Potencia tu red" 
               className="w-full h-full object-cover rounded-[2rem] opacity-60"
               referrerPolicy="no-referrer"
             />
          </div>
        </section>
      </div>

      {/* Company Details Modal */}
      <AnimatePresence>
        {selectedPartner && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 md:p-8"
            onClick={() => { setSelectedPartner(null); setAiInsight(null); }}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full max-w-5xl h-[90vh] rounded-[3rem] overflow-hidden shadow-2xl flex flex-col md:flex-row border border-white/20"
            >
              {/* Lateral Branding */}
              <div className="w-full md:w-80 bg-[#004d43] p-10 flex flex-col text-white shrink-0 relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32" />
                 <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24" />
                 
                 <div className="relative z-10">
                    <div className="w-20 h-20 bg-white shadow-xl rounded-3xl flex items-center justify-center text-[#004d43] text-3xl font-black mb-6 overflow-hidden border border-white">
                      {(selectedPartner.avatarUrl || selectedPartner.logoUrl) ? (
                        <img src={selectedPartner.avatarUrl || selectedPartner.logoUrl} className="w-full h-full object-cover" alt={selectedPartner.name} />
                      ) : (
                        selectedPartner.name[0]
                      )}
                    </div>
                    <h2 className="text-3xl font-black italic tracking-tighter leading-tight mb-2">{selectedPartner.name}</h2>
                    <p className="text-emerald-400 font-bold uppercase tracking-widest text-[10px] mb-8">{selectedPartner.sector}</p>
                    
                    <div className="space-y-4 mb-12">
                       <div className="flex items-center gap-3">
                          <MapPin size={18} className="text-emerald-500" />
                          <span className="text-sm font-medium text-emerald-100/80">{selectedPartner.location}</span>
                       </div>
                       <div className="flex items-center gap-3">
                          <Users size={18} className="text-emerald-500" />
                          <span className="text-sm font-medium text-emerald-100/80">{selectedPartner.employees} empleados</span>
                       </div>
                       <div className="flex items-center gap-3">
                          <Shield size={18} className="text-emerald-500" />
                          <span className="text-sm font-medium text-emerald-100/80">Verificado B2B</span>
                       </div>
                    </div>

                    <div className="mt-auto">
                      <div className="bg-white/10 border border-white/10 p-5 rounded-2xl backdrop-blur-md">
                         <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-2">Presupuesto anual</p>
                         <p className="text-2xl font-black italic">~{selectedPartner.budget?.toLocaleString() || '15.000'}€</p>
                      </div>
                    </div>
                 </div>
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-y-auto p-8 md:p-12">
                 <div className="flex justify-end mb-8 sticky top-0 bg-white/80 backdrop-blur-sm p-4 -m-4 z-20">
                    <button onClick={() => { setSelectedPartner(null); setAiInsight(null); }} className="w-10 h-10 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center hover:bg-slate-200 transition-all">
                      <X size={20} />
                    </button>
                 </div>

                 <div className="max-w-3xl mx-auto space-y-12">
                    <section>
                       <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">Sobre la Empresa</h4>
                       <p className="text-xl font-bold text-slate-800 leading-relaxed italic mb-8">"{selectedPartner.description}"</p>
                       
                       {selectedPartner.objectives && selectedPartner.objectives.length > 0 && (
                         <div className="space-y-4">
                            <h5 className="text-[10px] font-black uppercase tracking-widest text-primary/60">Anuncios de Búsqueda Activos</h5>
                            <div className="grid grid-cols-1 gap-3">
                               {selectedPartner.objectives.map((obj: any) => (
                                 <div key={obj.id} className="bg-primary/5 border border-primary/10 p-4 rounded-2xl flex items-center justify-between group">
                                    <div className="flex items-center gap-3">
                                       <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-primary shadow-sm border border-primary/5">
                                          <Target size={16} />
                                       </div>
                                       <div>
                                          <p className="text-sm font-black text-slate-700 leading-none mb-1">{obj.title}</p>
                                          <p className="text-[10px] font-medium text-slate-500">{obj.description}</p>
                                       </div>
                                    </div>
                                    <div className="text-right">
                                       <p className="text-xs font-black text-primary">{obj.budget}€</p>
                                       <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Presupuesto</p>
                                    </div>
                                 </div>
                               ))}
                            </div>
                         </div>
                       )}
                    </section>

                    <section>
                       <div className="flex items-center justify-between mb-8">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Desglose Financiero Estimado</h4>
                          <div className="h-px bg-slate-100 flex-1 ml-6" />
                       </div>
                       <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Por Día</p>
                             <p className="text-lg font-black text-slate-800">~{(selectedPartner.budget / 365).toFixed(2)}€</p>
                          </div>
                          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Por Mes</p>
                             <p className="text-lg font-black text-slate-800">~{(selectedPartner.budget / 12).toFixed(2)}€</p>
                          </div>
                          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Por Jornada</p>
                             <p className="text-lg font-black text-slate-800">~{(selectedPartner.budget / 250).toFixed(2)}€</p>
                          </div>
                          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Trimestral</p>
                             <p className="text-lg font-black text-slate-800">~{(selectedPartner.budget / 4).toFixed(2)}€</p>
                          </div>
                       </div>
                       <p className="mt-4 text-[10px] font-bold text-slate-400 italic">
                         * Cálculos basados en un presupuesto de {selectedPartner.budget.toLocaleString()}€ anual. Ideal para Pymes buscando optimización de recursos.
                       </p>
                    </section>

                    {/* SERVICIOS */}
                    <section>
                       <div className="flex items-center justify-between mb-6">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Servicios y Tarifas</h4>
                          <div className="h-px bg-slate-100 flex-1 ml-6" />
                       </div>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {selectedPartner.services?.map((s: any) => (
                             <div key={s.id} className="bg-slate-50 border border-slate-100 p-6 rounded-2xl flex items-center justify-between group">
                                <div className="flex items-center gap-4">
                                   <div className="w-10 h-10 bg-white shadow-sm border border-slate-100 rounded-xl flex items-center justify-center text-[#ff6b6b]">
                                      <Zap size={20} fill="#ff6b6b" />
                                   </div>
                                   <div>
                                      <p className="text-sm font-black text-slate-700 leading-none mb-1">{s.name}</p>
                                      <p className="text-[10px] font-bold text-slate-400 tracking-wider"><span className="text-slate-800">{s.price}€</span> / {s.unit}</p>
                                   </div>
                                </div>
                             </div>
                          ))}
                       </div>
                    </section>

                    {/* AI COLLABORATION INSIGHT */}
                    <section className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[2rem] p-8 md:p-10 shadow-2xl relative overflow-hidden text-white group">
                       <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                          <Sparkles size={120} />
                       </div>
                       
                       <div className="flex items-center gap-3 mb-6 relative">
                          <div className="bg-white/20 p-2 rounded-xl">
                             <Sparkles size={20} fill="currentColor" />
                          </div>
                          <h4 className="text-lg font-black tracking-tight italic">AI Collaboration Chat</h4>
                       </div>

                       {(aiInsight || generatingAi) ? (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="relative z-10"
                          >
                             <div className="max-h-[350px] overflow-y-auto pr-2 space-y-4 scrollbar-hide">
                                {chatMessages.map((msg, i) => (
                                  <div key={i} className={cn(
                                    "p-4 rounded-2xl text-sm font-medium leading-relaxed",
                                    msg.role === 'assistant' 
                                      ? "bg-white/10 border border-white/5 text-indigo-50" 
                                      : "bg-white/20 border border-white/20 text-white ml-8"
                                  )}>
                                     <Markdown>{msg.content}</Markdown>
                                  </div>
                                ))}
                                {generatingAi && (
                                  <div className="flex gap-1 items-center p-4 bg-white/5 rounded-2xl w-fit">
                                    <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                                    <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                                    <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
                                  </div>
                                )}
                             </div>
                             <button 
                              onClick={() => setAiInsight(null)}
                              className="mt-4 text-white/60 text-xs font-bold hover:text-white transition-colors"
                             >
                              Regenerar análisis
                             </button>
                          </motion.div>
                       ) : (
                          <div className="text-center relative z-10">
                             <p className="text-indigo-100/70 mb-8 font-medium italic">Análisis financiero profundo de costes, ROI y servicios individuales. Pregunta lo que necesites tras generar el informe.</p>
                             <button 
                               onClick={() => generateAiInsight(selectedPartner)}
                               disabled={generatingAi}
                               className="bg-white text-indigo-700 px-10 py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 w-full sm:w-auto mx-auto disabled:opacity-50"
                             >
                               {generatingAi ? 'Analizando...' : 'Iniciar Análisis Interactivo'}
                               <ChevronRight size={18} />
                             </button>
                          </div>
                       )}
                    </section>

                    <div className="pt-8 border-t border-slate-100 flex items-center justify-between gap-6">
                       <button 
                         onClick={() => setViewingReviews(selectedPartner.id)}
                         className="flex items-center gap-2 text-amber-600 font-bold hover:underline"
                       >
                         <Star size={18} fill="#d97706" />
                         Ver {selectedPartner.reputation} estrellas y reseñas
                       </button>
                       <button 
                         onClick={() => {
                           handleRequestContact(selectedPartner.id);
                           setSelectedPartner(null);
                         }}
                         className="bg-primary text-white px-10 py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20 hover:brightness-110 active:scale-95 transition-all flex items-center gap-3"
                       >
                         Contactar Empresa
                         <ArrowRight size={20} />
                       </button>
                    </div>
                 </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
