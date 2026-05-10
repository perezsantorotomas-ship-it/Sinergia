import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Bot, User, ChevronLeft, Sparkles, Building2, HelpCircle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { cn } from '../lib/utils';
import { useAppStore } from '../lib/store';

interface Message {
  id: string;
  text: string;
  sender: 'ai' | 'user';
  timestamp: string;
}

export default function AIHelpPage() {
  const navigate = useNavigate();
  const { user } = useAppStore();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: `¡Hola${user ? `, ${user.name}` : ''}! Soy el Asistente de Sinergia. ¿En qué puedo ayudarte a mejorar la eficiencia de tu empresa hoy?`,
      sender: 'ai',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Simulate n8n/CRM save
    console.log('Saving query to CRM via n8n...', {
      user: user?.companyName || 'Anonymous',
      email: user?.email || 'N/A',
      query: input,
      timestamp: new Date().toISOString()
    });

    try {
      const response = await axios.post("/api/ai/chat", {
        messages: [...messages, userMsg],
        userApiKey: user?.openRouterKey
      });

      const aiMsg: Message = {
        id: Date.now().toString(),
        text: response.data.text,
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error("Chat Error:", error);
      const errorMsg: Message = {
        id: Date.now().toString(),
        text: "Lo siento, hubo un problema al conectar con Sinergia AI. Por favor, inténtalo de nuevo en unos momentos.",
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-10 bg-[#f8f9ff] flex flex-col">
      <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col px-6">
        {/* Header */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl transition-colors">
              <ChevronLeft size={24} />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/20 relative">
                <Bot size={24} />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white"></span>
              </div>
              <div>
                <h1 className="font-black text-slate-800 leading-tight">Asistente IA Sinergia</h1>
                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">En línea - Consultoría Estratégica</p>
              </div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs font-bold text-slate-400 bg-slate-50 px-4 py-2 rounded-xl">
            <Sparkles size={14} className="text-primary" />
            Impulsado por Sinergia Engine v4
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 bg-white border border-slate-100 rounded-[2.5rem] shadow-ambient overflow-hidden flex flex-col relative">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
            {messages.map((msg) => (
              <motion.div 
                key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={cn(
                  "flex flex-col max-w-[80%]",
                  msg.sender === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                )}
              >
                <div className={cn(
                  "px-6 py-4 rounded-[1.5rem] font-medium text-sm leading-relaxed",
                  msg.sender === 'user' 
                    ? "bg-primary text-white rounded-tr-none shadow-lg shadow-primary/10" 
                    : "bg-slate-50 text-slate-700 border border-slate-100 rounded-tl-none"
                )}>
                  {msg.text}
                </div>
                <span className="mt-1 text-[10px] font-bold text-slate-300 uppercase tracking-widest">{msg.timestamp}</span>
              </motion.div>
            ))}
            {isTyping && (
              <div className="flex items-center gap-2 p-4 bg-slate-50 rounded-2xl w-fit mr-auto border border-slate-100 italic text-xs text-slate-400 font-bold">
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></span>
                  <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                  <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                </span>
                Procesando consulta...
              </div>
            )}
          </div>

          {/* Quick Suggestions */}
          <div className="px-8 py-4 bg-slate-50/50 flex gap-2 overflow-x-auto no-scrollbar border-t border-slate-50">
            {['¿Cómo funciona el matching?', 'Planes Premium', 'Seguridad LOPD', 'Ver tutoriales'].map(s => (
              <button 
                key={s} 
                onClick={() => setInput(s)}
                className="whitespace-nowrap px-4 py-2 bg-white border border-slate-200 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-500 hover:border-primary hover:text-primary transition-all shadow-sm"
              >
                {s}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="p-8 bg-white border-t border-slate-100">
            <form onSubmit={handleSend} className="max-w-3xl mx-auto flex items-center gap-4 bg-slate-50 rounded-2xl p-2 border border-slate-100 focus-within:border-primary transition-colors">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribe tu duda estratégica..."
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-semibold text-slate-700 px-4 py-2 placeholder:text-slate-300"
              />
              <button 
                type="submit"
                disabled={!input.trim()}
                className="w-12 h-12 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 hover:brightness-110 active:scale-90 transition-all disabled:opacity-50 disabled:grayscale"
              >
                <Send size={20} />
              </button>
            </form>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          <div className="flex items-center gap-2">
            <HelpCircle size={14} />
            Soporte Directo: +34 658 51 88 44
          </div>
          <div className="flex items-center gap-4">
            <button className="hover:text-primary transition-colors">Estado del Sistema: Online</button>
            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
            <button className="hover:text-primary transition-colors">Garantía LOPD</button>
          </div>
        </div>
      </div>
    </div>
  );
}
