import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Check, Send, Phone, Lock, Plus, Building2, Users, FileText, LayoutDashboard, Settings, HelpCircle, Handshake, ChevronLeft, MessageSquare, Paperclip, X, ShieldAlert, Star, Trash2, Clock, Infinity as InfinityIcon, RefreshCw, ArrowRight, Sparkles, Download } from 'lucide-react';
import { cn, MOCK_PARTNERS } from '../lib/utils';
import { useAppStore } from '../lib/store';
import { db } from '../lib/firebase';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  serverTimestamp, 
  limit, 
  setDoc, 
  doc, 
  updateDoc, 
  deleteDoc,
  arrayUnion,
  arrayRemove 
} from 'firebase/firestore';
import { saveUserToFirestore, handleFirestoreError, OperationType } from '../lib/userService';

import { Logo } from './Logo';

interface Message {
  id: string;
  senderId: string;
  text: string;
  createdAt: any;
  fileName?: string;
  fileData?: string;
  fileType?: string;
}

export default function ChatPage() {
  const navigate = useNavigate();
  const { user, matches, blockUser, unblockUser, updateUser } = useAppStore();
  const [view, setView] = useState<'opportunities' | 'contacts'>('opportunities');
  const [activePartnerId, setActivePartnerId] = useState(matches[0] || null);
  
  // Agreement Selection state
  const [isSigningModalOpen, setIsSigningModalOpen] = useState(false);
  const [agreementType, setAgreementType] = useState<'temporary' | 'permanent'>('permanent');
  const [agreementDuration, setAgreementDuration] = useState('1 mes');
  const [agreementDescription, setAgreementDescription] = useState('');
  const [agreementItems, setAgreementItems] = useState<any[]>([]);
  const [selectedAgreement, setSelectedAgreement] = useState<any>(null);
  const [isAgreementDetailModalOpen, setIsAgreementDetailModalOpen] = useState(false);

  // Handshake Animation State
  const [isSigning, setIsSigning] = useState(false);

  const calculateTotal = () => {
    return agreementItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  };

  const handleAddItem = (service?: any) => {
    const newItem = service ? {
      name: service.name,
      price: service.price,
      quantity: 1,
      unit: service.unit
    } : {
      name: '',
      price: 0,
      quantity: 1,
      unit: 'unidad'
    };
    setAgreementItems([...agreementItems, newItem]);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...agreementItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setAgreementItems(newItems);
  };

  const removeItem = (index: number) => {
    setAgreementItems(agreementItems.filter((_, i) => i !== index));
  };
  const [signed, setSigned] = useState(false);

  // Blocking logic
  const [isBlockingModalOpen, setIsBlockingModalOpen] = useState(false);
  const [blockReason, setBlockReason] = useState('');

  // Message Actions logic
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editInput, setEditInput] = useState('');

  // Chat State
  const [agreements, setAgreements] = useState<any[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const matchedPartners = MOCK_PARTNERS.filter(p => matches.includes(p.id));
  const activePartner = matchedPartners.find(p => p.id === activePartnerId) || matchedPartners[0];
  const currentAgreement = agreements.find(a => a.partnerIds.includes(activePartner?.id));

  const handleConfirmUnblock = async (partnerId: string) => {
    if (!user) return;
    if (!confirm('¿Deseas desbloquear esta empresa? Podrás volver a recibir mensajes y notificaciones.')) return;
    
    try {
      unblockUser(partnerId);
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        blockedUsers: arrayRemove(partnerId)
      });
      alert('Empresa desbloqueada correctamente.');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.id}`);
    }
  };

  // Sync Agreements from Firestore
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'agreements'),
      where('partnerIds', 'array-contains', user.id),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAgreements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'agreements');
    });

    return () => unsubscribe();
  }, [user]);

  // Auto-close agreements that are past their willCloseAt date
  useEffect(() => {
    if (!agreements || agreements.length === 0) return;

    const checkAndCloseAgreements = async () => {
      const now = new Date();
      const closingPending = agreements.filter(a => a.status === 'closing_pending' && a.willCloseAt);
      
      for (const agreement of closingPending) {
        const willCloseAt = new Date(agreement.willCloseAt);
        if (now >= willCloseAt) {
          try {
            await updateDoc(doc(db, 'agreements', agreement.id), {
              status: 'closed',
              updatedAt: serverTimestamp()
            });

            await addDoc(collection(db, 'chats', agreement.id, 'messages'), {
              senderId: 'SYSTEM',
              text: `🏁 CIERRE COMPLETADO: El periodo de preaviso ha finalizado y el acuerdo se ha cerrado oficialmente.`,
              createdAt: serverTimestamp()
            });
          } catch (error) {
            console.error("Error auto-closing agreement:", error);
          }
        }
      }
    };

    const interval = setInterval(checkAndCloseAgreements, 60000); // Check every minute
    checkAndCloseAgreements(); // Initial check

    return () => clearInterval(interval);
  }, [agreements]);

  // Get or Create Chat ID
  const getChatId = (uid1: string, uid2: string) => {
    return [uid1, uid2].sort().join('_');
  };

  // Sync Messages from Firestore
  useEffect(() => {
    if (!user || !activePartner) return;

    const chatId = getChatId(user.id, activePartner.id);
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      setMessages(msgs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, messagesRef.path);
    });

    return () => unsubscribe();
  }, [user, activePartner]);

  // Scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() && !attachedFile) return;
    if (!activePartner || !user) return;

    if (editingMessageId) {
      handleUpdateMessage();
      return;
    }

    const chatId = getChatId(user.id, activePartner.id);
    
    try {
      let fileData: string | null = null;
      let fileType: string | null = null;
      let fileName: string | null = null;

      if (attachedFile) {
        if (attachedFile.size > 800 * 1024) {
          alert("El archivo es demasiado grande (máximo 800KB).");
          return;
        }
        fileName = attachedFile.name;
        fileType = attachedFile.type;
        fileData = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(attachedFile);
        });
      }

      // Ensure chat document exists
      await setDoc(doc(db, 'chats', chatId), {
        id: chatId,
        participants: [user.id, activePartner.id],
        lastMessage: messageInput || (fileName ? `Envió un archivo: ${fileName}` : ''),
        updatedAt: serverTimestamp()
      }, { merge: true });

      // Add message
      const messagesRef = collection(db, 'chats', chatId, 'messages');
      await addDoc(messagesRef, {
        senderId: user.id,
        text: messageInput,
        createdAt: serverTimestamp(),
        fileName,
        fileData,
        fileType
      });

      setMessageInput('');
      setAttachedFile(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `chats/${chatId}`);
    }
  };

  const handleBlockUser = async () => {
    if (!activePartner || !user) return;
    setIsBlockingModalOpen(true);
  };

  const confirmBlockWithReason = async () => {
    if (!activePartner || !user || !blockReason.trim()) return;
    
    blockUser(activePartner.id);
    
    try {
      const userRef = doc(db, 'users', user.id);
      // We store the ID to keep the filter simple, but we could also store the reason in a sub-obj if we update the rule
      await updateDoc(userRef, {
        blockedUsers: arrayUnion(activePartner.id)
      });
      
      const chatId = getChatId(user.id, activePartner.id);
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        senderId: 'SYSTEM',
        text: `🚫 EMPRESA BLOQUEADA por ${user.companyName}. Motivo: ${blockReason}`,
        createdAt: serverTimestamp()
      });

      setIsBlockingModalOpen(false);
      setBlockReason('');
      setActivePartnerId(null);
      alert(`${activePartner.name} ha sido bloqueada.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.id}`);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!activePartner || !user) return;
    
    // We can't delete SYSTEM messages through the client usually, and rules should block it
    // but we add a client-side guard for clarity.
    const msg = messages.find(m => m.id === messageId);
    if (msg?.senderId === 'SYSTEM') {
      alert('Los mensajes del sistema no pueden ser eliminados.');
      return;
    }

    if (!confirm('¿Estás seguro de que quieres eliminar este mensaje? Esta acción no se puede deshacer.')) return;
    
    const chatId = getChatId(user.id, activePartner.id);
    try {
      await deleteDoc(doc(db, 'chats', chatId, 'messages', messageId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `chats/${chatId}/messages/${messageId}`);
    }
  };

  const startEditing = (msg: Message) => {
    setEditingMessageId(msg.id);
    setEditInput(msg.text);
    setMessageInput(msg.text); // Sync main input for convenience or use a separate inline UI
  };

  const handleUpdateMessage = async () => {
    if (!editingMessageId || !activePartner || !user || !messageInput.trim()) return;
    const chatId = getChatId(user.id, activePartner.id);
    try {
      await updateDoc(doc(db, 'chats', chatId, 'messages', editingMessageId), {
        text: messageInput,
        updatedAt: serverTimestamp(),
        isEdited: true
      });
      setEditingMessageId(null);
      setMessageInput('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `chats/${chatId}/messages/${editingMessageId}`);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAttachedFile(e.target.files[0]);
    }
  };

  const handleSignAgreement = async () => {
    if (!user || !activePartner) return;
    
    setIsSigningModalOpen(false);
    setIsSigning(true);
    
    try {
      const agreementId = getChatId(user.id, activePartner.id);
      const existingAgreement = agreements.find(a => a.id === agreementId);

      let signedBy = [user.id];
      let status = 'pending';
      let expiresAt = null;

      if (existingAgreement) {
        signedBy = [...new Set([...(existingAgreement.signedBy || []), user.id])];
        if (signedBy.length === 2) {
          status = 'signed';
        } else {
          status = 'pending';
        }
      }

      if (agreementType === 'temporary') {
        const days = agreementDuration.includes('día') ? 1 : 
                    agreementDuration.includes('semana') ? 7 :
                    agreementDuration.includes('mes') ? 30 : 90;
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + days);
        expiresAt = expiry.toISOString();
      }

      await setDoc(doc(db, 'agreements', agreementId), {
        id: agreementId,
        partnerIds: [user.id, activePartner.id],
        partnerNames: [user.companyName, activePartner.name],
        signedBy,
        status,
        agreementType,
        duration: agreementDuration,
        description: agreementDescription || existingAgreement?.description || '',
        items: agreementItems,
        totalAmount: calculateTotal(),
        expiresAt,
        updatedAt: serverTimestamp(),
        createdAt: existingAgreement?.createdAt || serverTimestamp()
      }, { merge: true });

      // Send system message
      const descriptionSnippet = agreementDescription ? `\nPropósito: ${agreementDescription}` : '';
      const itemsSnippet = agreementItems.length > 0 ? `\nPresupuesto: ${calculateTotal()}€ (${agreementItems.length} items)` : '';
      await addDoc(collection(db, 'chats', agreementId, 'messages'), {
        senderId: 'SYSTEM',
        text: status === 'signed' 
          ? `🤝 ACUERDO SELLADO: ${user.companyName} y ${activePartner.name} han firmado una alianza ${agreementType === 'permanent' ? 'permanente' : 'temporal (' + agreementDuration + ')'}.${descriptionSnippet}${itemsSnippet}`
          : `✍️ FIRMA PENDIENTE: ${user.companyName} ha firmado el acuerdo. Esperando firma de ${activePartner.name}.${descriptionSnippet}${itemsSnippet}`,
        createdAt: serverTimestamp()
      });

      setAgreementDescription('');
      setAgreementItems([]);

      setTimeout(() => {
        setIsSigning(false);
        setSigned(true);
        setTimeout(() => setSigned(false), 3000);
      }, 2500);
    } catch (error) {
      setIsSigning(false);
      handleFirestoreError(error, OperationType.WRITE, 'agreements');
    }
  };

  const handleTerminateAgreement = async () => {
    if (!user || !activePartner || !currentAgreement) return;
    
    // Use the manual closure logic which includes the 24h notice period
    handleCloseAgreementManually(currentAgreement);
  };

  const handleRenewAgreement = () => {
    setAgreementDescription(currentAgreement?.description || '');
    setIsSigningModalOpen(true);
  };

  const handleWithdrawSignature = async (agreementId: string) => {
    if (!user) return;
    const agreement = agreements.find(a => a.id === agreementId);
    if (!agreement) return;

    // Remove confirm to make it "functional" and fast as requested
    try {
      if (agreement.signedBy && agreement.signedBy.length === 1) {
        // Close modal immediately for better UX
        setIsAgreementDetailModalOpen(false);
        setSelectedAgreement(null);

        // Delete from DB
        await deleteDoc(doc(db, 'agreements', agreementId));

        // Add system message
        await addDoc(collection(db, 'chats', agreementId, 'messages'), {
          senderId: 'SYSTEM',
          text: `⚠️ PROPUESTA RETIRADA: ${user.companyName} ha retirado su firma y cancelado la propuesta actual.`,
          createdAt: serverTimestamp()
        });
        
        console.log("Agreement withdrawn successfully");
      } else if (agreement.status === 'signed') {
         alert("No se puede retirar la firma de un acuerdo ya sellado. Solicita el cierre del acuerdo en su lugar.");
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `agreements/${agreementId}`);
    }
  };

  const calculateClosingMargin = (duration: string) => {
    // Increased to 24 hours as requested by user for orderly transition
    return 24; 
  };

  const handleCancelClosingRequest = async (agreement: any) => {
    if (!user) return;
    if (!confirm('¿Deseas cancelar la solicitud de cierre y mantener el acuerdo activo?')) return;

    try {
      await updateDoc(doc(db, 'agreements', agreement.id), {
        status: 'signed',
        closingRequestedBy: null,
        willCloseAt: null,
        updatedAt: serverTimestamp()
      });

      await addDoc(collection(db, 'chats', agreement.id, 'messages'), {
        senderId: 'SYSTEM',
        text: `🛡️ CIERRE CANCELADO: ${user.companyName} ha retirado la solicitud de cierre. El acuerdo sigue plenamente activo.`,
        createdAt: serverTimestamp()
      });
      
      const partnerId = agreement.partnerIds.find((id: string) => id !== user.id);
      await addDoc(collection(db, 'notifications'), {
        userId: partnerId,
        title: 'Cierre de Acuerdo Cancelado',
        desc: `${user.companyName} ha decidido mantener la colaboración activa.`,
        read: false,
        createdAt: serverTimestamp()
      });

      setIsAgreementDetailModalOpen(false);
      alert('Solicitud de cierre cancelada.');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `agreements/${agreement.id}`);
    }
  };

  const handleCloseAgreementManually = async (agreement: any) => {
    if (!user) return;
    
    const marginHours = 24; // Standardized to 24h (one full day)
    const closeDate = new Date();
    closeDate.setHours(closeDate.getHours() + marginHours);

    const partnerName = agreement.partnerNames.find((n: string) => n !== user.companyName);
    const partnerId = agreement.partnerIds.find((id: string) => id !== user.id);

    if (!confirm(`¿Estás seguro de solicitar el cierre? El acuerdo se mantendrá activo 24 horas para permitir una transición ordenada a ${partnerName}.`)) return;

    try {
      await updateDoc(doc(db, 'agreements', agreement.id), {
        status: 'closing_pending',
        closingRequestedBy: user.id,
        willCloseAt: closeDate.toISOString(),
        updatedAt: serverTimestamp()
      });

      // Send real notification to partner
      await addDoc(collection(db, 'notifications'), {
        userId: partnerId,
        title: '🔔 Notificación de Cierre de Acuerdo',
        desc: `Se ha solicitado el cierre del acuerdo entre ${user.companyName} y tu empresa. El cierre será efectivo en 24 horas.`,
        read: false,
        createdAt: serverTimestamp()
      });

      await addDoc(collection(db, 'chats', agreement.id, 'messages'), {
        senderId: 'SYSTEM',
        text: `📢 SOLICITUD DE CIERRE: Se ha iniciado el proceso para cerrar el acuerdo entre ambas empresas. Por seguridad y para evitar perjuicios, el cierre definitivo se ejecutará en 24 horas (un día completo).`,
        createdAt: serverTimestamp()
      });
      
      setIsAgreementDetailModalOpen(false);
      alert(`Proceso de cierre iniciado. El acuerdo se cerrará en ${marginHours} horas.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `agreements/${agreement.id}`);
    }
  };

  const handleAcceptClosingNow = async (agreement: any) => {
    if (!user) return;
    const partnerName = agreement.partnerNames.find((n: string) => n !== user.companyName);

    if (!confirm(`¿Deseas aceptar el cierre inmediato del acuerdo con ${partnerName}?`)) return;

    try {
      await updateDoc(doc(db, 'agreements', agreement.id), {
        status: 'closed',
        updatedAt: serverTimestamp()
      });

      await addDoc(collection(db, 'chats', agreement.id, 'messages'), {
        senderId: 'SYSTEM',
        text: `🏁 CIERRE ACEPTADO: ${user.companyName} ha aceptado cerrar el acuerdo inmediatamente.`,
        createdAt: serverTimestamp()
      });

      setIsAgreementDetailModalOpen(false);
      alert('Acuerdo cerrado oficialmente.');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `agreements/${agreement.id}`);
    }
  };

  const [postponeDuration, setPostponeDuration] = useState('1 semana');
  const [showPostponeOptions, setShowPostponeOptions] = useState(false);

  const handlePostponeClosing = async (agreement: any) => {
    if (!user) return;
    
    const now = new Date();
    let addDays = 0;
    if (postponeDuration === '1 día') addDays = 1;
    else if (postponeDuration === '1 mes') addDays = 30;
    else if (postponeDuration === '2 meses') addDays = 60;
    else if (postponeDuration === '3 meses') addDays = 90;
    else if (postponeDuration === '6 meses') addDays = 180;
    else addDays = 7; // 1 semana default

    const newCloseDate = new Date(now.getTime() + (addDays * 24 * 60 * 60 * 1000));
    const partnerId = agreement.partnerIds.find((id: string) => id !== user.id);

    try {
      await updateDoc(doc(db, 'agreements', agreement.id), {
        willCloseAt: newCloseDate.toISOString(),
        updatedAt: serverTimestamp()
      });

      await addDoc(collection(db, 'notifications'), {
        userId: partnerId,
        title: 'Cierre de Acuerdo Aplazado',
        desc: `${user.companyName} ha solicitado aplazar el cierre por ${postponeDuration}.`,
        read: false,
        createdAt: serverTimestamp()
      });

      await addDoc(collection(db, 'chats', agreement.id, 'messages'), {
        senderId: 'SYSTEM',
        text: `⏳ CIERRE APLAZADO: ${user.companyName} ha aplazado la fecha de cierre por ${postponeDuration}. Nueva fecha: ${newCloseDate.toLocaleString()}.`,
        createdAt: serverTimestamp()
      });

      setShowPostponeOptions(false);
      alert(`Cierre aplazado correctamente por ${postponeDuration}.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `agreements/${agreement.id}`);
    }
  };

  return (
    <div className="min-h-screen pt-16 flex bg-[#f8f9ff]">
      {/* Handshake Animation Overlay */}
      <AnimatePresence>
        {isSigning && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-[#004c3a]/95 backdrop-blur-xl flex flex-col items-center justify-center text-white"
          >
            <motion.div
              initial={{ scale: 0.5, rotate: -20 }}
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, -5, 5, 0]
              }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              className="mb-8"
            >
              <Handshake size={140} strokeWidth={1} />
            </motion.div>
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-center"
            >
              <h2 className="text-4xl font-black italic tracking-tighter mb-2">Sellando Sinergia...</h2>
              <p className="text-white/60 font-bold uppercase tracking-[0.2em] text-xs">Generando contrato inteligente B2B</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Notification */}
      <AnimatePresence>
        {signed && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 20, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[110] bg-secondary text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border-2 border-white/20"
          >
            <div className="bg-white/20 p-2 rounded-lg">
              <Check size={24} />
            </div>
            <div>
              <p className="font-black text-sm">¡Acuerdo Firmado!</p>
              <p className="text-[10px] uppercase font-bold tracking-widest opacity-80">Alianza estratégica activada</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar - Dashboard Navigation */}
      <aside className="hidden lg:flex w-64 border-r border-slate-200 flex-col py-8 px-4 bg-white">
        <div className="flex items-center gap-3 px-4 mb-10">
          <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-200 shadow-sm shrink-0">
             {user?.avatarUrl ? (
               <img src={user.avatarUrl} className="w-full h-full object-cover" alt={user.companyName} />
             ) : (
               <Logo className="w-full h-full text-primary p-2" />
             )}
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm truncate max-w-[120px]">{user?.companyName || 'Sinergia Pro'}</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{user?.isPremium ? 'Premium Plan' : 'Free Tier'}</p>
          </div>
        </div>

        <nav className="space-y-1">
          <NavItem icon={<LayoutDashboard size={18} />} label="Dashboard" onClick={() => navigate('/explorar')} />
          <NavItem icon={<Users size={18} />} label="Red de Contactos" onClick={() => setView('contacts')} active={view === 'contacts'} />
          <NavItem icon={<Handshake size={18} />} label="Oportunidades" onClick={() => setView('opportunities')} active={view === 'opportunities'} />
          <NavItem icon={<Settings size={18} />} label="Configuración" onClick={() => navigate('/perfil')} />
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-100">
          <NavItem icon={<HelpCircle size={18} />} label="Ayuda" onClick={() => navigate('/ayuda')} />
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-[calc(100vh-64px)] overflow-hidden">
        <header className="px-8 py-6 bg-white border-b border-slate-200 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/explorar')} className="lg:hidden p-2 text-slate-400 hover:bg-slate-100 rounded-lg">
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-black text-slate-800">
                {view === 'contacts' ? 'Mi Red de Contactos' : 'Negociación Activa'}
              </h1>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                {view === 'contacts' 
                  ? `${matchedPartners.length} contactos verificados`
                  : activePartner ? `Proyecto: ${activePartner.name}` : 'No hay negociaciones activas'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {view === 'opportunities' && activePartner && (
              <>
                <button 
                  onClick={handleBlockUser}
                  title="Bloquear empresa"
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <ShieldAlert size={20} />
                </button>
                
                {currentAgreement?.status === 'signed' ? (
                  <button 
                    onClick={handleTerminateAgreement}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2 font-bold text-xs"
                  >
                    <Trash2 size={20} />
                    <span className="hidden sm:inline">Finalizar</span>
                  </button>
                ) : currentAgreement?.status === 'terminated' || currentAgreement?.status === 'expired' ? (
                  <button 
                    onClick={handleRenewAgreement}
                    className="bg-secondary text-white px-6 py-2 rounded-xl font-bold text-sm shadow-sm hover:brightness-110 flex items-center gap-2"
                  >
                    <RefreshCw size={18} />
                    Renovar
                  </button>
                ) : (
                  <button 
                    onClick={() => setIsSigningModalOpen(true)}
                    disabled={currentAgreement?.signedBy?.includes(user?.id)}
                    className={cn(
                      "px-6 py-2 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center gap-2",
                      currentAgreement?.signedBy?.includes(user?.id)
                        ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                        : "bg-secondary text-white hover:brightness-110 active:scale-95"
                    )}
                  >
                    <Handshake size={18} />
                    {currentAgreement?.signedBy?.length === 1 ? 'Firmar (1/2)' : 'Firmar Acuerdo'}
                  </button>
                )}
                
                <button className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors">
                  <Phone size={20} />
                </button>
              </>
            )}
            {view === 'contacts' && (
              <button onClick={() => navigate('/explorar')} className="bg-primary text-white px-6 py-2 rounded-xl font-bold text-sm shadow-sm hover:brightness-110 active:scale-95 transition-all">
                Añadir Contactos
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {view === 'opportunities' ? (
            <>
              {/* Chat Sidebar/History */}
              <div className="w-80 border-r border-slate-200 bg-white overflow-y-auto hidden md:block">
                <div className="p-4 border-b border-slate-50">
                  <div className="bg-slate-100 rounded-lg flex items-center px-3 py-2">
                    <Plus size={16} className="text-slate-400 mr-2" />
                    <input type="text" placeholder="Nueva negociación..." className="bg-transparent border-none focus:ring-0 text-sm" />
                  </div>
                </div>
                
                    <div className="p-2">
                  {matchedPartners.length === 0 ? (
                    <div className="p-8 text-center">
                      <p className="text-sm font-bold text-slate-400 mb-4">No tienes contactos activos todavía.</p>
                      <button onClick={() => navigate('/explorar')} className="text-primary text-xs font-black uppercase tracking-widest hover:underline">Ir a Explorar</button>
                    </div>
                  ) : (
                    matchedPartners.map((partner: any) => (
                      <ContactItem 
                        key={partner.id}
                        active={activePartner?.id === partner.id}
                        isBlocked={user?.blockedUsers?.includes(partner.id)}
                        onClick={() => setActivePartnerId(partner.id)}
                        name="Responsable" 
                        company={partner.name} 
                        lastMsg="..."
                        time="Reciente"
                        avatar={partner.avatarUrl || partner.logoUrl}
                      />
                    ))
                  )}
                </div>

                {user?.aiMatchingEnabled && (
                  <div className="mt-4 mx-4 p-5 bg-gradient-to-br from-primary/10 to-primary/5 rounded-[2rem] border border-primary/10 relative overflow-hidden group mb-8">
                    <div className="absolute top-0 right-0 w-12 h-12 bg-primary/10 rounded-full -translate-x-4 translate-y-4 blur-xl group-hover:scale-150 transition-transform" />
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="text-primary animate-pulse" size={16} />
                        <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Oportunidad IA</span>
                      </div>
                      <h4 className="text-xs font-black text-slate-800 mb-1">Nueva Sinergia Detectada</h4>
                      <p className="text-[10px] text-slate-500 font-medium leading-relaxed mb-4">He encontrado una empresa que encaja al 94% con tus requisitos actuales.</p>
                      <button 
                        onClick={() => navigate('/explorar')}
                        className="w-full bg-white text-primary text-[10px] font-black py-2.5 rounded-xl shadow-sm border border-primary/10 hover:bg-primary hover:text-white transition-all flex items-center justify-center gap-2"
                      >
                        Ver Detalles
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Main Chat Area */}
              <div className="flex-1 flex flex-col bg-slate-50 relative">
                {!activePartner ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-300 mb-6">
                      <Handshake size={40} />
                    </div>
                    <h2 className="text-xl font-black text-slate-800 mb-2">Inicia una Negociación</h2>
                    <p className="text-sm text-slate-500 max-w-sm mb-8">Solicita contacto a un socio ideal para empezar a colaborar de forma eficiente.</p>
                    <button 
                      onClick={() => navigate('/explorar')}
                      className="bg-primary text-white font-black px-10 py-4 rounded-2xl shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all"
                    >
                      Explorar Socios
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 overflow-y-auto p-8 space-y-6">
                      {messages.map((msg) => (
                        msg.senderId === 'SYSTEM' ? (
                          <div key={msg.id} className="flex justify-center py-4">
                            <span className="bg-secondary/10 border border-secondary/20 px-6 py-2 rounded-2xl text-[10px] font-black text-secondary uppercase tracking-[0.2em]">
                              {msg.text}
                            </span>
                          </div>
                        ) : msg.senderId !== user?.id ? (
                          <MessageIn 
                            key={msg.id}
                            text={msg.text}
                            time={msg.createdAt?.toDate?.()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '...'}
                            message={msg}
                            partner={activePartner}
                          />
                        ) : (
                          <MessageOut 
                            key={msg.id}
                            text={msg.text}
                            time={msg.createdAt?.toDate?.()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '...'}
                            message={msg}
                            onEdit={() => startEditing(msg)}
                            onDelete={() => handleDeleteMessage(msg.id)}
                            user={user}
                          />
                        )
                      ))}
                      <div ref={chatEndRef} />
                      
                      <div className="flex justify-center py-4">
                        <span className="bg-white border border-slate-200 px-4 py-1 rounded-full text-[10px] font-bold text-slate-400 uppercase tracking-widest">Conexión Verificada • Cifrado B2B</span>
                      </div>
                    </div>

                    {/* Input Bar */}
                    <div className="p-6 bg-white border-t border-slate-200">
                      {user?.blockedUsers?.includes(activePartner.id) ? (
                        <div className="max-w-4xl mx-auto py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                           <ShieldAlert className="mx-auto text-red-500 mb-2" size={32} />
                           <h3 className="text-sm font-black text-slate-800 mb-1">Empresa Bloqueada</h3>
                           <p className="text-xs text-slate-500 mb-4 font-medium italic">No recibirás mensajes de esta cuenta mientras esté bloqueada.</p>
                           <button 
                            onClick={() => handleConfirmUnblock(activePartner.id)}
                            className="bg-white border border-slate-200 text-slate-700 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
                           >
                            Desbloquear para Chatear
                           </button>
                        </div>
                      ) : (
                        <>
                          {attachedFile && (
                            <motion.div 
                              initial={{ y: 20, opacity: 0 }}
                              animate={{ y: 0, opacity: 1 }}
                              className="max-w-4xl mx-auto mb-4 p-3 bg-primary/5 border border-primary/10 rounded-xl flex items-center justify-between"
                            >
                              <div className="flex items-center gap-2">
                                <Paperclip size={16} className="text-primary" />
                                <span className="text-xs font-bold text-primary">{attachedFile.name} ({(attachedFile.size / 1024).toFixed(1)} KB)</span>
                              </div>
                              <button onClick={() => setAttachedFile(null)} className="p-1 hover:bg-white rounded-lg text-slate-400 transition-colors">
                                <X size={14} />
                              </button>
                            </motion.div>
                          )}
                          
                          <div className="max-w-4xl mx-auto flex items-end gap-4">
                            <input 
                              type="file" 
                              ref={fileInputRef} 
                              onChange={handleFileChange} 
                              className="hidden" 
                            />
                            <button 
                              onClick={() => fileInputRef.current?.click()}
                              className="p-3 text-slate-400 hover:text-primary rounded-xl transition-colors shrink-0"
                            >
                              <Plus size={24} />
                            </button>
                            <div className="flex-1 bg-slate-100 rounded-2xl flex flex-col overflow-hidden border border-transparent focus-within:border-primary/20 transition-all">
                              {editingMessageId && (
                                <div className="px-6 py-2 bg-primary/10 border-b border-primary/5 flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Settings size={12} className="text-primary" />
                                    <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Editando</span>
                                  </div>
                                  <button onClick={() => { setEditingMessageId(null); setMessageInput(''); }} className="text-primary hover:text-red-500">
                                    <X size={14} />
                                  </button>
                                </div>
                              )}
                              <textarea 
                                rows={1} 
                                value={messageInput}
                                onChange={(e) => setMessageInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                  }
                                }}
                                placeholder={editingMessageId ? "Escribe tus cambios aquí..." : `Responde a ${activePartner.name}...`}
                                className="w-full bg-transparent border-none focus:ring-0 resize-none font-medium text-slate-700 max-h-32 px-6 py-4"
                              />
                            </div>
                            {editingMessageId && (
                              <button 
                                onClick={() => { setEditingMessageId(null); setMessageInput(''); }}
                                className="p-4 text-slate-400 hover:text-red-500 transition-colors"
                              >
                                <X size={20} />
                              </button>
                            )}
                            <button 
                              onClick={handleSendMessage}
                              disabled={!messageInput.trim() && !attachedFile}
                              className={cn(
                                "p-4 rounded-2xl shadow-lg transition-all shrink-0",
                                (!messageInput.trim() && !attachedFile) ? "bg-slate-200 text-slate-400 cursor-not-allowed" : "bg-primary text-white hover:brightness-110 active:scale-95"
                              )}
                            >
                              {editingMessageId ? <Check size={24} /> : <Send size={24} />}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            /* Contacts List View */
            <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
              <div className="max-w-5xl mx-auto space-y-12">
                
                {/* Registro de Acuerdos Section */}
                <section>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center text-secondary">
                      <FileText size={20} />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-800">Registro de Acuerdos</h2>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Alianzas comerciales oficiales</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {agreements.length === 0 ? (
                      <div className="col-span-full py-12 text-center bg-white border-2 border-dashed border-slate-200 rounded-[2rem]">
                        <p className="text-slate-400 font-bold">No has firmado ningún acuerdo oficial todavía.</p>
                      </div>
                    ) : (
                      agreements.map(agreement => (
                        <div key={agreement.id} 
                          onClick={() => { setSelectedAgreement(agreement); setIsAgreementDetailModalOpen(true); }}
                          className={cn(
                          "bg-gradient-to-br p-6 rounded-[2rem] text-white shadow-xl border border-white/10 flex items-center justify-between group cursor-pointer relative overflow-hidden",
                          agreement.status === 'signed' ? "from-[#004c3a] to-[#002c22] shadow-[#004c3a]/20" :
                          agreement.status === 'pending' ? "from-amber-600 to-amber-700 shadow-amber-600/20" :
                          agreement.status === 'closing_pending' ? "from-orange-600 to-orange-800 shadow-orange-600/20" :
                          agreement.status === 'closed' ? "from-slate-700 to-slate-800 shadow-slate-700/20 opacity-80" :
                          "from-slate-600 to-slate-700 shadow-slate-600/20"
                        )}>
                          <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-2">
                              {agreement.status === 'signed' ? (
                                <>
                                  <Check size={16} className="text-emerald-400" />
                                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Acuerdo Sellado</span>
                                </>
                              ) : agreement.status === 'closing_pending' ? (
                                <>
                                  <Clock size={16} className="text-orange-200 animate-pulse" />
                                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-200">Cierre en Curso</span>
                                </>
                              ) : agreement.status === 'pending' ? (
                                <>
                                  <Clock size={16} className="text-amber-200" />
                                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-200">
                                    Firma Pendiente ({(agreement.signedBy || []).length}/2)
                                  </span>
                                </>
                              ) : agreement.status === 'closed' ? (
                                <>
                                  <X size={16} className="text-slate-400" />
                                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Cerrado</span>
                                </>
                              ) : (
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Finalizado</span>
                              )}
                            </div>
                            <h3 className="text-lg font-black tracking-tight leading-tight mb-1">
                              {agreement.partnerNames.find((n: string) => n !== user?.companyName)}
                            </h3>
                            <div className="flex items-center gap-4 text-[10px] text-white/50 font-bold">
                              <span>Plan: {agreement.agreementType === 'permanent' ? 'Permanente' : agreement.duration}</span>
                              {agreement.expiresAt && agreement.status === 'signed' && (
                                <span>Expira: {new Date(agreement.expiresAt).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center group-hover:bg-white/20 transition-all relative z-10">
                            <Handshake size={24} strokeWidth={1.5} />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                {/* Contacts List Section */}
                <section>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                      <Users size={20} />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-800">Mis Contactos</h2>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Red de empresas vinculadas</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {matchedPartners.length === 0 ? (
                      <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-slate-200">
                        <p className="text-slate-400 font-bold mb-4">No tienes contactos en tu red todavía.</p>
                        <button onClick={() => navigate('/explorar')} className="text-primary font-black uppercase tracking-widest text-xs hover:underline">Explorar Empresas</button>
                      </div>
                    ) : (
                      matchedPartners.map((partner: any) => {
                      const isBlocked = user?.blockedUsers?.includes(partner.id);
                      return (
                        <div key={partner.id} className={cn(
                          "bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex items-center justify-between group",
                          isBlocked && "opacity-75 grayscale-[0.5]"
                        )}>
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-black relative overflow-hidden border border-slate-100 shadow-sm">
                              {(partner.avatarUrl || partner.logoUrl) ? (
                                <img src={partner.avatarUrl || partner.logoUrl} className="w-full h-full object-cover" alt={partner.name} />
                              ) : (
                                partner.name[0]
                              )}
                              {isBlocked && (
                                <div className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow-sm border border-white">
                                  <ShieldAlert size={10} />
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-bold text-slate-800">{partner.name}</h3>
                                {isBlocked && <span className="text-[7px] font-black uppercase text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100/50 shadow-sm shadow-red-500/5 tracking-[0.1em]">Bloqueada</span>}
                              </div>
                              <p className="text-xs text-slate-400 font-medium">{partner.sector}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {isBlocked ? (
                              <button 
                                onClick={() => handleConfirmUnblock(partner.id)}
                                className="bg-slate-100 text-slate-500 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                              >
                                Desbloquear
                              </button>
                            ) : (
                              <button 
                                onClick={() => { setView('opportunities'); setActivePartnerId(partner.id); }}
                                className="bg-slate-50 p-3 rounded-xl text-slate-400 group-hover:bg-primary group-hover:text-white transition-all"
                              >
                                <MessageSquare size={18} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                    )}
                  </div>
                </section>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Signing Options Modal */}
      <AnimatePresence>
        {isBlockingModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[130] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl"
            >
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-4">
                  <ShieldAlert size={32} />
                </div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Bloquear Empresa</h2>
                <p className="text-sm text-slate-500 font-bold mt-1">Por favor, indica una razón para el bloqueo</p>
              </div>

              <div className="space-y-6">
                <div>
                  <textarea 
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    placeholder="Escribe el motivo del bloqueo..."
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-medium text-slate-700 outline-none focus:border-red-500 min-h-[120px]"
                  />
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setIsBlockingModalOpen(false)}
                    className="flex-1 bg-slate-100 text-slate-500 font-bold py-4 rounded-2xl hover:bg-slate-200 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={confirmBlockWithReason}
                    disabled={!blockReason.trim()}
                    className="flex-[2] bg-red-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-red-900/20 hover:brightness-110 disabled:opacity-50 transition-all"
                  >
                    Confirmar Bloqueo
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {isSigningModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setIsSigningModalOpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl p-8"
            >
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-secondary/10 rounded-3xl flex items-center justify-center text-secondary mx-auto mb-4">
                  <Handshake size={32} />
                </div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Tipo de Alianza</h2>
                <p className="text-sm text-slate-500 font-bold mt-1">Define los términos de tu colaboración</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Naturaleza del Acuerdo</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setAgreementType('permanent')}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
                        agreementType === 'permanent' ? "border-secondary bg-secondary/5 text-secondary" : "border-slate-100 text-slate-400 hover:border-slate-200"
                      )}
                    >
                      <InfinityIcon size={24} />
                      <span className="text-xs font-black">Permanente</span>
                    </button>
                    <button 
                      onClick={() => setAgreementType('temporary')}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
                        agreementType === 'temporary' ? "border-secondary bg-secondary/5 text-secondary" : "border-slate-100 text-slate-400 hover:border-slate-200"
                      )}
                    >
                      <Clock size={24} />
                      <span className="text-xs font-black">Temporal</span>
                    </button>
                  </div>
                </div>

                {agreementType === 'temporary' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                  >
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Duración</label>
                    <select 
                      value={agreementDuration}
                      onChange={(e) => setAgreementDuration(e.target.value)}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-secondary transition-all"
                    >
                      <option>1 día</option>
                      <option>1 semana</option>
                      <option>1 mes</option>
                      <option>3 meses</option>
                      <option>6 meses</option>
                      <option>1 año</option>
                    </select>
                  </motion.div>
                )}

                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Descripción del Acuerdo</label>
                   <textarea 
                     value={agreementDescription}
                     onChange={(e) => setAgreementDescription(e.target.value)}
                     placeholder="Ej: Colaboración para el lanzamiento de la nueva campaña de marketing digital Q3."
                     className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-secondary transition-all min-h-[100px] resize-none"
                   />
                </div>

                {/* Calculator Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Presupuesto y Partidas</label>
                    <button 
                      onClick={() => handleAddItem()}
                      className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1 hover:underline"
                    >
                      <Plus size={12} /> Añadir Partida
                    </button>
                  </div>

                  <div className="space-y-3">
                    {agreementItems.map((item, idx) => (
                      <div key={idx} className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-3 relative group">
                        <button 
                          onClick={() => removeItem(idx)}
                          className="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={14} />
                        </button>
                        <input 
                          type="text"
                          placeholder="Nombre del servicio o producto"
                          value={item.name}
                          onChange={(e) => updateItem(idx, 'name', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:border-primary"
                        />
                        <div className="flex gap-3">
                          <div className="flex-1 space-y-1">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Precio Unit.</label>
                            <input 
                              type="number"
                              value={item.price}
                              onChange={(e) => updateItem(idx, 'price', parseFloat(e.target.value) || 0)}
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:border-primary"
                            />
                          </div>
                          <div className="w-20 space-y-1">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Cant.</label>
                            <input 
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:border-primary text-center"
                            />
                          </div>
                          <div className="w-24 space-y-1">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1 text-right block pr-1">Total</label>
                            <div className="w-full bg-primary/5 border border-primary/10 rounded-xl px-3 py-2 text-sm font-black text-primary text-right">
                              {(item.price * item.quantity).toFixed(2)}€
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {agreementItems.length > 0 && (
                      <div className="flex items-center justify-between p-4 bg-primary text-white rounded-2xl shadow-lg shadow-primary/20">
                        <span className="text-xs font-black uppercase tracking-[0.2em]">Total Final</span>
                        <span className="text-xl font-black">{calculateTotal().toFixed(2)}€</span>
                      </div>
                    )}

                    {agreementItems.length === 0 && user?.services && user.services.length > 0 && (
                      <div className="pt-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tu Catálogo</p>
                        <div className="flex flex-wrap gap-2">
                          {user.services.slice(0, 3).map((service: any, i: number) => (
                            <button 
                              key={i}
                              onClick={() => handleAddItem(service)}
                              className="px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold text-slate-600 hover:bg-primary/5 hover:border-primary/20 hover:text-primary transition-all"
                            >
                              + {service.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4">
                  <button 
                    onClick={handleSignAgreement}
                    className="w-full bg-secondary text-white font-black py-4 rounded-2xl shadow-lg shadow-secondary/20 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-3"
                  >
                    Firmar Acuerdo Oficial
                    <ArrowRight size={18} />
                  </button>
                  <p className="text-center text-[10px] text-slate-400 font-bold mt-4 uppercase tracking-widest">Este acuerdo es legalmente vinculante en el ecosistema</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {isAgreementDetailModalOpen && selectedAgreement && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setIsAgreementDetailModalOpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl p-10"
            >
              <div className="flex justify-between items-start mb-8">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center text-white",
                    selectedAgreement.status === 'signed' ? "bg-[#004c3a]" : "bg-amber-600"
                  )}>
                    <Handshake size={32} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Detalles del Acuerdo</h2>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Contrato Digital Corporativo</p>
                  </div>
                </div>
                <button onClick={() => setIsAgreementDetailModalOpen(false)} className="p-2 text-slate-300 hover:text-slate-800 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-8">
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Estado</p>
                    <p className={cn(
                      "text-sm font-black uppercase tracking-widest",
                      selectedAgreement.status === 'signed' ? "text-emerald-600" : 
                      selectedAgreement.status === 'closing_pending' ? "text-orange-600" :
                      "text-amber-600"
                    )}>
                      {selectedAgreement.status === 'signed' ? 'Sella / Activo' : 
                       selectedAgreement.status === 'closing_pending' ? 'Cierre Pendiente' :
                       'Pendiente de firma'}
                    </p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Tipo Plan</p>
                    <p className="text-sm font-black text-slate-800">
                      {selectedAgreement.agreementType === 'permanent' ? 'Permanente' : selectedAgreement.duration}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Términos y Propósito</p>
                  <p className="text-sm text-slate-600 font-medium leading-relaxed italic">
                    "{selectedAgreement.description || 'No se ha definido una descripción específica para este acuerdo.'}"
                  </p>
                </div>

                {selectedAgreement.items && selectedAgreement.items.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Presupuesto Detallado</p>
                    <div className="bg-slate-50 rounded-3xl border border-slate-100 divide-y divide-slate-100 overflow-hidden">
                       {selectedAgreement.items.map((item: any, i: number) => (
                         <div key={i} className="p-4 flex items-center justify-between">
                            <div>
                               <p className="text-sm font-bold text-slate-800">{item.name}</p>
                               <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                                  {item.quantity} x {item.price}€ / {item.unit}
                               </p>
                            </div>
                            <div className="text-sm font-black text-slate-800">
                               {(item.price * item.quantity).toFixed(2)}€
                            </div>
                         </div>
                       ))}
                       <div className="p-4 bg-primary/5 flex items-center justify-between">
                          <span className="text-xs font-black uppercase tracking-widest text-primary">Total del Acuerdo</span>
                          <span className="text-lg font-black text-primary">
                             {selectedAgreement.totalAmount?.toFixed(2) || (selectedAgreement.items.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0)).toFixed(2)}€
                          </span>
                       </div>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Intervinientes</p>
                   <div className="space-y-2">
                      {selectedAgreement.partnerNames.map((name: string) => (
                        <div key={name} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                           <span className="text-sm font-bold text-slate-700">{name}</span>
                           {selectedAgreement.signedBy && selectedAgreement.signedBy.includes(selectedAgreement.partnerIds[selectedAgreement.partnerNames.indexOf(name)]) ? (
                             <div className="flex items-center gap-1 text-emerald-600 text-[10px] font-black uppercase">
                                <Check size={12} /> Firmado
                             </div>
                           ) : (
                             <div className="text-amber-600 text-[10px] font-black uppercase">Pendiente</div>
                           )}
                        </div>
                      ))}
                   </div>
                </div>

                {selectedAgreement.status === 'signed' && (
                  <div className="pt-4 flex flex-col gap-3">
                    <button 
                      onClick={() => handleCloseAgreementManually(selectedAgreement)}
                      className="w-full bg-slate-800 text-white font-black py-4 rounded-2xl shadow-lg hover:bg-slate-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                      <Clock size={18} />
                      Solicitar Cierre de Acuerdo
                    </button>
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest text-center">
                      * El cierre se hará efectivo tras 24h de preaviso para proteger a ambas partes.
                    </p>
                  </div>
                )}

                {selectedAgreement.status === 'closing_pending' && (
                  <div className="space-y-4">
                    <div className="bg-orange-50 border-2 border-orange-100 p-6 rounded-3xl">
                      <div className="flex items-center gap-3 text-orange-700 mb-2">
                          <Clock size={20} className="animate-pulse" />
                          <h4 className="font-black text-xs uppercase tracking-widest">Información de Cierre</h4>
                      </div>
                      <p className="text-xs text-orange-600 font-bold leading-relaxed">
                          Este acuerdo se cerrará automáticamente en 24 horas para permitir una transición ordenada de datos y servicios.
                      </p>
                      {selectedAgreement.willCloseAt && (
                          <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-orange-400">
                            FECHA EFECTIVA: {new Date(selectedAgreement.willCloseAt).toLocaleString()}
                          </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {selectedAgreement.closingRequestedBy === user?.id ? (
                        <button 
                          onClick={() => handleCancelClosingRequest(selectedAgreement)}
                          className="w-full bg-slate-100 text-slate-600 font-black py-4 rounded-2xl border-2 border-slate-200 hover:bg-white transition-all flex items-center justify-center gap-2"
                        >
                          Retirar Solicitud de Cierre
                          <X size={18} />
                        </button>
                      ) : (
                        <>
                          <button 
                            onClick={() => handleAcceptClosingNow(selectedAgreement)}
                            className="w-full bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-lg hover:brightness-110 transition-all flex items-center justify-center gap-2"
                          >
                            Cerrar Ahora (Aceptar)
                            <Check size={18} />
                          </button>
                          
                          {!showPostponeOptions ? (
                            <button 
                              onClick={() => setShowPostponeOptions(true)}
                              className="w-full bg-white text-orange-600 font-black py-4 rounded-2xl border-2 border-orange-100 hover:bg-orange-50 transition-all flex items-center justify-center gap-2"
                            >
                              Aplazar Cierre
                              <RefreshCw size={18} />
                            </button>
                          ) : (
                            <div className="bg-white border-2 border-orange-100 p-6 rounded-[2rem] space-y-4 shadow-sm">
                              <h5 className="text-[10px] font-black text-orange-400 uppercase tracking-widest text-center">Seleccionar Tiempo de Aplazamiento</h5>
                              <div className="grid grid-cols-3 gap-2">
                                {['1 día', '1 semana', '1 mes', '2 meses', '3 meses', '6 meses'].map((dur) => (
                                  <button
                                    key={dur}
                                    onClick={() => setPostponeDuration(dur)}
                                    className={cn(
                                      "px-2 py-3 rounded-xl text-[10px] font-black uppercase transition-all border-2",
                                      postponeDuration === dur ? "border-orange-500 bg-orange-50 text-orange-600" : "border-slate-50 text-slate-400 hover:border-slate-100"
                                    )}
                                  >
                                    {dur}
                                  </button>
                                ))}
                              </div>
                              <div className="flex gap-2">
                                 <button 
                                   onClick={() => setShowPostponeOptions(false)}
                                   className="flex-1 text-slate-400 text-[10px] font-black uppercase tracking-widest py-3"
                                 >
                                   Cancelar
                                 </button>
                                 <button 
                                   onClick={() => handlePostponeClosing(selectedAgreement)}
                                   className="flex-[2] bg-orange-600 text-white text-[10px] font-black uppercase tracking-widest py-3 rounded-xl shadow-lg"
                                 >
                                   Confirmar Aplazamiento
                                 </button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
                
                {selectedAgreement.status === 'pending' && user?.id && (selectedAgreement.signedBy || []).includes(user.id) && (
                   <div className="pt-6 border-t border-slate-100 mt-6 flex flex-col gap-3">
                    <button 
                      onClick={() => handleWithdrawSignature(selectedAgreement.id)}
                      className="w-full bg-red-600 text-white font-black py-4 rounded-2xl shadow-lg hover:bg-red-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                      <Trash2 size={18} />
                      RETIRAR PROPUESTA DE FIRMA
                    </button>
                    <p className="text-[10px] text-red-500 font-black uppercase tracking-widest text-center">
                      * Esta acción eliminará la propuesta actual y liberará el canal de negociación.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavItem({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <button onClick={onClick} className={cn(
      "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all text-left",
      active ? "bg-primary/10 text-primary shadow-sm" : "text-slate-500 hover:bg-slate-50"
    )}>
      {icon}
      <span className="flex-1">{label}</span>
      {active && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
    </button>
  );
}

function ContactItem({ active = false, name, company, lastMsg, time, onClick, isBlocked = false, avatar }: any) {
  return (
    <div onClick={onClick} className={cn(
      "p-4 rounded-xl cursor-pointer transition-all mb-1 text-left relative overflow-hidden",
      active ? "bg-primary/5 border border-primary/10 shadow-sm" : "hover:bg-slate-50 border border-transparent",
      isBlocked && "opacity-60 bg-slate-100"
    )}>
      <div className="flex justify-between items-start mb-1">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 overflow-hidden shrink-0 border border-slate-200">
            {avatar ? (
              <img src={avatar} className="w-full h-full object-cover" alt={company} />
            ) : (
              <span>{company[0]}</span>
            )}
          </div>
          <h4 className={cn("font-black text-sm", active ? "text-primary" : "text-slate-800")}>{name}</h4>
        </div>
        <span className="text-[10px] text-slate-400 font-bold">{time}</span>
      </div>
      <p className={cn("text-[11px] font-bold uppercase tracking-wider mb-1", active ? "text-primary" : "text-slate-600")}>{company}</p>
      <p className="text-xs text-slate-400 truncate">{isBlocked ? '🚫 Empresa Bloqueada' : lastMsg}</p>
      {isBlocked && (
         <div className="absolute top-1 right-1">
            <ShieldAlert size={10} className="text-red-500" />
         </div>
      )}
    </div>
  );
}

function MessageIn({ text, time, message, partner }: any) {
  const downloadFile = () => {
    if (message.fileData && message.fileName) {
      const link = document.createElement('a');
      link.href = message.fileData;
      link.setAttribute('download', message.fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <motion.div 
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="flex items-start gap-4 max-w-[85%]"
    >
      <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 shrink-0 flex items-center justify-center text-[10px] font-black text-slate-500 shadow-sm mt-1 ring-4 ring-slate-100/50 overflow-hidden">
        {partner?.avatarUrl ? (
          <img src={partner.avatarUrl} className="w-full h-full object-cover" alt={partner.name} />
        ) : (
          <span>{partner?.name?.[0] || 'OP'}</span>
        )}
      </div>
      <div>
        <div className="bg-white border border-slate-100 p-4 rounded-[1.5rem] rounded-tl-none shadow-xl shadow-slate-200/20">
          {text && <p className="text-[13px] md:text-sm text-slate-700 leading-relaxed font-medium">{text}</p>}
          {message.fileName && (
            <button 
              onClick={downloadFile}
              className={cn("w-full text-left p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group/file cursor-pointer hover:bg-slate-100 transition-all", text ? "mt-4" : "")}
              title="Descargar archivo"
            >
              <div className="flex items-center gap-4 overflow-hidden">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
                  <FileText className="text-emerald-600" size={20} />
                </div>
                <div className="overflow-hidden">
                   <p className="text-xs font-black text-slate-700 truncate max-w-[150px]">{message.fileName}</p>
                   <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-0.5">Click para descargar</p>
                </div>
              </div>
              <Download size={14} className="text-slate-300 group-hover/file:text-emerald-600 group-hover/file:translate-y-0.5 transition-all" />
            </button>
          )}
        </div>
        <span className="text-[9px] text-slate-400 font-black tracking-widest uppercase mt-2.5 inline-block ml-1">{time}</span>
      </div>
    </motion.div>
  );
}

function MessageOut({ text, time, message, onEdit, onDelete, user }: any) {
  const downloadFile = () => {
    if (message.fileData && message.fileName) {
      const link = document.createElement('a');
      link.href = message.fileData;
      link.setAttribute('download', message.fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <motion.div 
      initial={{ x: 20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="flex flex-row-reverse items-start gap-4 max-w-[85%] ml-auto group/msg"
    >
      <div className="w-10 h-10 rounded-2xl bg-emerald-600 shrink-0 flex items-center justify-center text-[10px] font-black text-white shadow-lg shadow-emerald-600/20 mt-1 overflow-hidden">
        {user?.avatarUrl ? (
          <img src={user.avatarUrl} className="w-full h-full object-cover" alt="Me" />
        ) : (
          <span>YO</span>
        )}
      </div>
      <div className="flex flex-col items-end">
        <div className="flex items-center gap-1 mb-2 opacity-0 group-hover/msg:opacity-100 transition-all duration-200 bg-white/90 backdrop-blur-md p-1 rounded-xl border border-slate-100 shadow-sm translate-y-1 group-hover/msg:translate-y-0">
           <button 
             onClick={onEdit} 
             className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all" 
             title="Editar mensaje"
           >
             <Settings size={14} />
           </button>
           <button 
             onClick={onDelete} 
             className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" 
             title="Eliminar mensaje"
           >
             <Trash2 size={14} />
           </button>
        </div>
        <div className="bg-emerald-600 p-4 rounded-[1.5rem] rounded-tr-none shadow-xl shadow-emerald-900/5 border border-emerald-500/20">
          {text && <p className="text-[13px] md:text-sm text-white leading-relaxed font-medium">{text}</p>}
          {message.isEdited && (
            <div className="flex items-center gap-1 mt-1.5 opacity-60">
              <span className="text-[7px] text-white font-black uppercase tracking-[0.2em] italic">Mensaje Editado</span>
            </div>
          )}
          {message.fileName && (
            <button 
              onClick={downloadFile}
              className={cn("w-full text-left p-4 bg-white/10 rounded-2xl flex items-center gap-4 border border-white/10 cursor-pointer hover:bg-white/20 transition-all group/file", text ? "mt-4" : "")}
              title="Descargar archivo"
            >
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
                <FileText className="text-white" size={20} />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-black text-white truncate max-w-[150px]">{message.fileName}</p>
                <p className="text-[9px] text-white/50 font-black uppercase tracking-widest mt-0.5">Click para descargar</p>
              </div>
              <Download size={14} className="text-white/40 group-hover/file:translate-y-0.5 transition-transform" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 mt-2.5 mr-1">
          <span className="text-[9px] text-slate-400 font-black tracking-widest uppercase">{time}</span>
          <div className="flex -space-x-1.5 text-emerald-500">
            <Check size={10} strokeWidth={4} />
            <Check size={10} strokeWidth={4} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
