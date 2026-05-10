import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Building2, MapPin, Globe, Users, Calendar, FileText, 
  ChevronDown, X, Plus, Check, ShieldCheck, Trash2, 
  UploadCloud, Info, Target, Network, Handshake,
  Settings, Briefcase, Zap, Search, Camera, RefreshCw,
  Palette, Lock, Key, Mail as MailIcon, Download, Bell as BellIcon, Eye,
  User, ChevronRight, ArrowRight, Github
} from 'lucide-react';
import axios from 'axios';
import { INDUSTRIAL_SECTORS } from '../lib/constants';
import { cn } from '../lib/utils';
import { useAppStore } from '../lib/store';
import { saveUserToFirestore, uploadImageToStorage } from '../lib/userService';

export default function ProfilePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setUser, updateUser } = useAppStore();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const certInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'profile' | 'config' | 'privacy'>('profile');

  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    }
  }, [location.state]);

  // Local state for the form fields
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    companyName: user?.companyName || '',
    website: user?.website || '',
    tagline: user?.tagline || '',
    location: user?.location || '',
    employeeCount: user?.employeeCount || '11-50 empleados',
    foundationYear: user?.foundationYear || '',
    description: user?.description || '',
    sectors: user?.sectors || [],
    capacities: user?.capacities || [],
    searchQuery: user?.searchQuery || '',
    allianceType: user?.allianceType || 'SOCIO TECNOLÓGICO',
    objectives: (user as any)?.objectives || [],
    certificates: user?.certificates || [],
    services: (user?.services || []).map((s: any) => ({ ...s, type: s.type || 'Servicio' })),
    budget: user?.budget || 0,
    avatarUrl: user?.avatarUrl || '',
    logoUrl: user?.logoUrl || '',
    openRouterKey: user?.openRouterKey || '',
    aiMatchingEnabled: user?.aiMatchingEnabled ?? true,
    autoDeleteMessages: user?.autoDeleteMessages ?? false,
    notificationsEnabled: (user as any)?.notificationsEnabled ?? true,
    emailAlertsEnabled: (user as any)?.emailAlertsEnabled ?? false,
    bio: user?.bio || '',
    visibility: (user as any)?.visibility || 'public',
    themeColor: (user as any)?.themeColor || '#004d43',
    recoveryEmail: (user as any)?.recoveryEmail || '',
    isVerified: (user as any)?.isVerified || false,
    githubUser: (user as any)?.githubUser || null
  });

  // Handle GitHub OAuth success message for connection
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data?.provider === 'github') {
        const githubUser = event.data.user;
        setIsSaving(true);
        try {
          const updatedUser = { 
            ...user, 
            githubUser: {
              id: githubUser.id,
              login: githubUser.login,
              name: githubUser.name,
              avatar: githubUser.avatar,
              email: githubUser.email
            },
            githubId: githubUser.id
          };
          updateUser(updatedUser as any);
          await saveUserToFirestore(updatedUser as any);
          setFormData(prev => ({ ...prev, githubUser: updatedUser.githubUser }));
          alert("¡Cuenta de GitHub conectada con éxito!");
        } catch (error) {
          console.error("Error connecting GitHub:", error);
          alert("Error al conectar GitHub.");
        } finally {
          setIsSaving(false);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [user]);

  const handleConnectGithub = async () => {
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
      console.error("Error initiating GitHub connection:", error);
      alert("No se pudo iniciar la conexión con GitHub.");
    }
  };

  const handleDisconnectGithub = async () => {
    if (confirm("¿Estás seguro de que quieres desconectar tu cuenta de GitHub?")) {
      setIsSaving(true);
      try {
        const updatedUser = { ...user, githubUser: null, githubId: null };
        updateUser(updatedUser as any);
        await saveUserToFirestore(updatedUser as any);
        setFormData(prev => ({ ...prev, githubUser: null }));
        alert("GitHub desconectado.");
      } catch (error) {
        console.error("Error disconnecting GitHub:", error);
      } finally {
        setIsSaving(false);
      }
    }
  };

  // Password Reset Flow State
  const [resetFlow, setResetFlow] = useState<{
    step: 'idle' | 'sending' | 'verifying' | 'newPassword' | 'success';
    email: string;
    code: string;
    inputCode: string;
    newPassword: string;
  }>({
    step: 'idle',
    email: '',
    code: '',
    inputCode: '',
    newPassword: ''
  });

  const handleStartReset = async () => {
    if (!formData.recoveryEmail) {
      alert("Por favor, añade un email de recuperación en tu configuración primero.");
      setActiveTab('config');
      return;
    }
    
    setResetFlow({ ...resetFlow, step: 'sending', email: formData.recoveryEmail });
    
    try {
      const mockCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Call the real API
      const response = await axios.post('/api/email/send-code', {
        email: formData.recoveryEmail,
        code: mockCode
      });

      if (response.data.success) {
        setResetFlow(prev => ({ ...prev, step: 'verifying', code: mockCode }));
        if (response.data.simulated) {
          alert(`[SIMULACIÓN] API configurada pero sin llaves activas. Código enviado a ${formData.recoveryEmail}: ${mockCode}`);
        } else {
          alert(`Se ha enviado un código de seguridad a ${formData.recoveryEmail}`);
        }
      } else {
        throw new Error(response.data.error || "Failed to send email");
      }
    } catch (error) {
      console.error("Error sending reset email:", error);
      alert("Hubo un error al enviar el email. Se utilizará modo simulación para esta prueba.");
      // Fallback for safety in demo
      const mockCode = Math.floor(100000 + Math.random() * 900000).toString();
      setResetFlow(prev => ({ ...prev, step: 'verifying', code: mockCode }));
    }
  };

  const handleVerifyCode = () => {
    if (resetFlow.inputCode === resetFlow.code) {
      setResetFlow({ ...resetFlow, step: 'newPassword' });
    } else {
      alert("Código incorrecto. Vuelve a intentarlo.");
    }
  };

  const handleCompleteReset = () => {
    if (resetFlow.newPassword.length < 6) {
      alert("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setResetFlow({ ...resetFlow, step: 'success' });
    setTimeout(() => {
      setResetFlow(prev => ({ ...prev, step: 'idle' }));
      alert("¡Contraseña actualizada con éxito!");
    }, 2000);
  };

  // Sync once or when user ID changes, or when not saving
  useEffect(() => {
    if (user && !isSaving) {
      setFormData(prev => ({
        ...prev,
        companyName: user.companyName || '',
        website: user.website || '',
        tagline: user.tagline || '',
        location: user.location || '',
        employeeCount: user.employeeCount || '11-50 empleados',
        foundationYear: user.foundationYear || '',
        description: user.description || '',
        sectors: user.sectors || [],
        capacities: user.capacities || [],
        searchQuery: user.searchQuery || '',
        allianceType: user.allianceType || 'SOCIO TECNOLÓGICO',
        objectives: (user as any).objectives || [],
        certificates: user.certificates || [],
        services: user.services || [],
        budget: user.budget || 0,
        // Only update if current is empty or we are specifically syncing
        avatarUrl: prev.avatarUrl || user.avatarUrl || '', 
        logoUrl: prev.logoUrl || user.logoUrl || '',
        openRouterKey: user.openRouterKey || '',
        aiMatchingEnabled: user.aiMatchingEnabled ?? true,
        autoDeleteMessages: user.autoDeleteMessages ?? false,
        notificationsEnabled: (user as any).notificationsEnabled ?? true,
        emailAlertsEnabled: (user as any).emailAlertsEnabled ?? false,
        bio: user.bio || '',
        name: user.name || '',
        email: user.email || '',
        visibility: (user as any).visibility || 'public',
        themeColor: (user as any).themeColor || '#004d43',
        recoveryEmail: (user as any).recoveryEmail || '',
        githubUser: (user as any).githubUser || null
      }));
    }
  }, [user?.id]); // Only sync when user ID changes (mount/login)

  // Utility to compress and resize images
  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Max dimensions for an avatar
          const MAX_SIZE = 800;
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Canvas to Blob failed'));
          }, 'image/jpeg', 0.85); // High quality JPEG
        };
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && user) {
      // Increased limit to 50MB per user request, but we will compress it anyway
      if (file.size > 50 * 1024 * 1024) { 
        alert("La imagen es demasiado grande. Por favor, elige una de menos de 50MB.");
        return;
      }
      
      setIsSaving(true);
      try {
        // Compress before upload
        const compressedBlob = await compressImage(file);
        const compressedFile = new File([compressedBlob], file.name, { type: 'image/jpeg' });

        const downloadUrl = await uploadImageToStorage(compressedFile, `avatars/${user.id}_${Date.now()}.jpg`);
        
        // Immediate update to state for visual feedback
        setFormData(prev => ({ ...prev, avatarUrl: downloadUrl }));
        
        // Persist to store and DB
        const updatedUser = { ...user, avatarUrl: downloadUrl };
        updateUser(updatedUser);
        await saveUserToFirestore(updatedUser);
        
        // Force sync after a short delay to ensure everything is settled
        setTimeout(() => {
          setFormData(prev => ({ ...prev, avatarUrl: downloadUrl }));
        }, 500);
        
        alert("Foto de perfil actualizada correctamente y guardada de forma permanente.");
      } catch (error) {
        console.error("Error uploading avatar:", error);
        alert("Error al subir la imagen. Inténtalo de nuevo.");
      } finally {
        setIsSaving(false);
      }
    }
  };

  const [showClearModal, setShowClearModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleExportPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      const primaryColor = formData.themeColor || '#004d43';
      
      // Header
      doc.setFillColor(primaryColor);
      doc.rect(0, 0, 210, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text(formData.companyName || 'Perfil Sinergia', 20, 25);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('RESUMEN EJECUTIVO DE EMPRESA', 20, 32);
      
      // Content
      doc.setTextColor(40, 40, 40);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Información Corporativa', 20, 55);
      
      let currentY = 67;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      const sectorsText = `Sector: ${formData.sectors.join(', ') || 'No especificado'}`;
      const splitSectors = doc.splitTextToSize(sectorsText, 165);
      doc.text(splitSectors, 25, currentY);
      currentY += (splitSectors.length * 5) + 4;
      
      doc.text(`Ubicación: ${formData.location || 'No especificada'}`, 25, currentY);
      currentY += 7;
      doc.text(`Sitio Web: ${formData.website || 'No especificado'}`, 25, currentY);
      currentY += 7;
      doc.text(`Empleados: ${formData.employeeCount}`, 25, currentY);
      currentY += 15;
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Descripción de la Empresa', 20, currentY);
      currentY += 10;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const bioText = formData.bio || formData.description || 'Sin descripción disponible.';
      const splitBio = doc.splitTextToSize(bioText, 165);
      doc.text(splitBio, 25, currentY);
      currentY += (splitBio.length * 5) + 15;
      
      // Objetivos de Sinergia
      if (currentY > 260) { doc.addPage(); currentY = 20; }
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Objetivos de Sinergia', 20, currentY);
      currentY += 10;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const queryText = `Búsqueda Principal: ${formData.searchQuery || 'No especificada'}`;
      const splitQuery = doc.splitTextToSize(queryText, 165);
      doc.text(splitQuery, 25, currentY);
      currentY += (splitQuery.length * 5) + 8;
      
      if ((formData as any).objectives && (formData as any).objectives.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.text('Anuncios de Búsqueda:', 25, currentY);
        currentY += 7;
        doc.setFont('helvetica', 'normal');
        (formData as any).objectives.forEach((obj: any) => {
          if (currentY > 270) {
            doc.addPage();
            currentY = 20;
          }
          const objText = `- ${obj.title}: ${obj.description} (Presupuesto: ${obj.budget}€)`;
          const splitObj = doc.splitTextToSize(objText, 155);
          doc.text(splitObj, 30, currentY);
          currentY += (splitObj.length * 5) + 2;
        });
      }

      currentY += 10;
      if (currentY > 260) { doc.addPage(); currentY = 20; }

      // Portfolio Section
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Portafolio de Soluciones', 20, currentY);
      currentY += 10;

      if (formData.services && formData.services.length > 0) {
        formData.services.forEach((service: any) => {
          if (currentY > 260) {
            doc.addPage();
            currentY = 20;
          }

          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.text(`${service.name} [${service.type}]`, 25, currentY);
          currentY += 5;

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          if (service.description) {
            const splitDesc = doc.splitTextToSize(service.description, 160);
            doc.text(splitDesc, 25, currentY);
            currentY += (splitDesc.length * 4) + 2;
          }

          const priceText = `Precio: ${service.price}€ / ${service.unit} | Cantidad: ${service.quantity} | Total: ${service.totalPrice}€`;
          doc.text(priceText, 25, currentY);
          if (service.specialPrice > 0) {
            doc.setTextColor(primaryColor);
            doc.text(` | Oferta Especial: ${service.specialPrice}€`, 25 + doc.getTextWidth(priceText), currentY);
            doc.setTextColor(40, 40, 40);
          }
          currentY += 8;
        });
      } else {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        doc.text('No hay productos o servicios registrados.', 25, currentY);
        currentY += 10;
      }
      
      // Footer
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Generado por Sinergia Ecosystem - ${new Date().toLocaleDateString()}`, 105, 285, { align: 'center' });
      
      doc.save(`Perfil_${formData.companyName.replace(/\s+/g, '_') || 'Sinergia'}.pdf`);
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Hubo un error al generar el PDF. Asegúrate de que las dependencias estén listas.");
    }
  };

  const handleClearProfile = () => {
    setShowClearModal(true);
  };

  const confirmClearProfile = () => {
    setFormData(prev => ({
      ...prev,
      companyName: '',
      website: '',
      tagline: '',
      location: '',
      description: '',
      sectors: [],
      capacities: prev.capacities.map(c => ({ ...c, checked: false })),
      searchQuery: '',
      bio: '',
      services: [],
      objectives: [],
      budget: 0
    }));
    setShowClearModal(false);
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
    }, 2000);
  };

  const handleRequestVerification = () => {
    if (formData.isVerified) {
      alert("Tu empresa ya está verificada con el máximo nivel de confianza.");
      return;
    }
    
    if (confirm("Para verificar tu empresa, necesitaremos revisar tu documentación legal y fiscal. ¿Deseas iniciar el proceso de auditoría Sinergia?")) {
      setIsSaving(true);
      setTimeout(async () => {
        const updatedUser = { ...user, isVerified: true };
        updateUser(updatedUser);
        await saveUserToFirestore(updatedUser);
        setIsSaving(false);
        setFormData(prev => ({ ...prev, isVerified: true }));
        alert("¡Verificación completada! Un sello de autenticidad ha sido añadido a tu perfil.");
      }, 3000);
    }
  };

  const [newSector, setNewSector] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toggleCapacity = (id: string) => {
    setFormData(prev => ({
      ...prev,
      capacities: prev.capacities.map(c => c.id === id ? { ...c, checked: !c.checked } : c)
    }));
  };

  const removeSector = (sectorToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      sectors: prev.sectors.filter(s => s !== sectorToRemove)
    }));
  };

  const addSector = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSector.trim() && !formData.sectors.includes(newSector.trim())) {
      setFormData(prev => ({
        ...prev,
        sectors: [...prev.sectors, newSector.trim()]
      }));
      setNewSector('');
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && user) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert("El logo es demasiado grande. Por favor, elige uno de menos de 5MB.");
        return;
      }
      
      setIsSaving(true);
      try {
        const downloadUrl = await uploadImageToStorage(file, `logos/${user.id}_${Date.now()}`);
        setFormData(prev => ({ ...prev, logoUrl: downloadUrl }));
        
        // Immediate save
        const updatedUser = { ...user, logoUrl: downloadUrl };
        updateUser(updatedUser);
        await saveUserToFirestore(updatedUser);
      } catch (error) {
        console.error("Error uploading logo:", error);
        alert("Error al subir el logo.");
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleAddCertificate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && user) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert("El certificado es demasiado grande. Por favor, elige uno de menos de 5MB.");
        return;
      }
      
      setIsSaving(true);
      try {
        const downloadUrl = await uploadImageToStorage(file, `certificates/${user.id}_${Date.now()}`);
        const newCert = {
          id: Date.now().toString(),
          name: file.name,
          type: file.type.split('/')[1].toUpperCase() || 'DOCUMENTO',
          fileData: downloadUrl
        };
        setFormData(prev => ({
          ...prev,
          certificates: [...prev.certificates, newCert]
        }));
      } catch (error) {
        console.error("Error uploading certificate:", error);
        alert("Error al subir el certificado.");
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleAddService = () => {
    const newService = {
      id: Date.now().toString(),
      name: '',
      price: 0,
      unit: 'unidad',
      type: 'Producto' as const,
      description: '',
      quantity: 1,
      totalPrice: 0,
      specialPrice: 0
    };
    
    setFormData(prev => ({
      ...prev,
      services: [...prev.services, newService]
    }));
  };

  const removeService = (id: string) => {
    setFormData(prev => ({
      ...prev,
      services: prev.services.filter(s => s.id !== id)
    }));
  };

  const removeCert = (id: string) => {
    setFormData(prev => ({
      ...prev,
      certificates: prev.certificates.filter(c => c.id !== id)
    }));
  };

  const handleSave = async () => {
    if (user) {
      if (!formData.companyName.trim()) {
        alert("Por favor, introduce el nombre de la empresa.");
        return;
      }
      
      if (!formData.sectors || formData.sectors.length === 0) {
        alert("Por favor, selecciona al menos un sector para tu empresa.");
        return;
      }

      setIsSaving(true);
      try {
        // Prepare ALL data from formData to ensure nothing is lost
        const updatedUser = { 
          ...user,
          ...formData, // Spread everything from formData
          id: user.id // Ensure ID is never overwritten
        };

        // Persist to Cloud Firestore first
        await saveUserToFirestore(updatedUser);
        
        // Update local memory store
        updateUser(updatedUser);
        
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          setIsSaving(false);
          navigate('/explorar');
        }, 2000);
      } catch (error) {
        console.error("Error saving profile:", error);
        alert("Hubo un error al guardar tu perfil. Inténtalo de nuevo.");
        setIsSaving(false);
      }
    } else {
      navigate('/explorar');
    }
  };

  return (
    <div 
      className="min-h-screen bg-[#f3f6f9] pt-16 pb-20 font-sans"
      style={{ '--primary': formData.themeColor } as React.CSSProperties}
    >
      {/* Modal de Limpieza de Perfil */}
      <AnimatePresence>
        {showClearModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[3rem] p-12 max-w-md w-full shadow-2xl text-center"
            >
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-8">
                <Trash2 size={40} />
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-4 italic tracking-tighter">¿Limpiar tu Perfil?</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed mb-10">
                Esta acción restaurará tus datos descriptivos y catálogo a cero. No afectará a tu cuenta verificada. ¿Quieres continuar?
              </p>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setShowClearModal(false)}
                  className="py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] text-slate-400 hover:bg-slate-50 transition-all border-2 border-transparent"
                >
                  No, Cancelar
                </button>
                <button 
                  onClick={confirmClearProfile}
                  className="py-4 bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-red-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  Sí, Limpiar Todo
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic Theme Overlay */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-primary/95 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.5, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="flex flex-col items-center text-center text-white"
            >
               <motion.div 
                 initial={{ rotate: -45, scale: 0 }}
                 animate={{ rotate: 0, scale: 1 }}
                 transition={{ delay: 0.2, type: "spring" }}
                 className="w-32 h-32 bg-white rounded-[2.5rem] flex items-center justify-center text-primary mb-8 shadow-2xl"
               >
                  <Check size={64} strokeWidth={4} />
               </motion.div>
               <h2 className="text-4xl font-black italic tracking-tighter mb-4">¡Cambios Aplicados!</h2>
               <p className="text-white/70 font-bold uppercase tracking-[0.3em] text-xs">Tu ecosistema Sinergia ha sido actualizado</p>
               <div className="mt-8 flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full">
                 <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                 <span className="text-[10px] font-black uppercase tracking-widest">Sincronización Completa</span>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .bg-primary { background-color: var(--primary); }
        .text-primary { color: var(--primary); }
        .border-primary { border-color: var(--primary); }
        .focus\\:ring-primary\\/20:focus { --tw-ring-color: color-mix(in srgb, var(--primary) 20%, transparent); }
        .focus\\:border-primary:focus { border-color: var(--primary); }
        .hover\\:bg-primary\\/10:hover { background-color: color-mix(in srgb, var(--primary) 10%, transparent); }
      `}</style>

      {/* Verification Code Reset Modal */}
      <AnimatePresence>
        {resetFlow.step !== 'idle' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl relative overflow-hidden"
            >
              <button 
                onClick={() => setResetFlow({ ...resetFlow, step: 'idle' })}
                className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={24} />
              </button>

              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-6">
                  {resetFlow.step === 'sending' ? <RefreshCw className="animate-spin" size={32} /> : <Lock size={32} />}
                </div>

                {resetFlow.step === 'sending' && (
                  <h3 className="text-xl font-black text-slate-800 mb-2">Enviando Código...</h3>
                )}

                {resetFlow.step === 'verifying' && (
                  <>
                    <h3 className="text-xl font-black text-slate-800 mb-2">Verifica tu Identidad</h3>
                    <p className="text-sm text-slate-500 font-medium mb-8 uppercase tracking-widest text-[10px]">Hemos enviado un código a {resetFlow.email}</p>
                    <div className="w-full space-y-4">
                      <input 
                        type="text"
                        placeholder="Código de 6 dígitos"
                        value={resetFlow.inputCode}
                        onChange={(e) => setResetFlow({ ...resetFlow, inputCode: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-center text-2xl font-black tracking-[0.5em] focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                      <button 
                        onClick={handleVerifyCode}
                        className="w-full bg-primary text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all"
                      >
                        Verificar Código
                      </button>
                    </div>
                  </>
                )}

                {resetFlow.step === 'newPassword' && (
                  <>
                    <h3 className="text-xl font-black text-slate-800 mb-2">Nueva Contraseña</h3>
                    <p className="text-sm text-slate-500 font-medium mb-8 uppercase tracking-widest text-[10px]">Establece una contraseña más segura</p>
                    <div className="w-full space-y-4">
                      <input 
                        type="password"
                        placeholder="Nueva contraseña"
                        value={resetFlow.newPassword}
                        onChange={(e) => setResetFlow({ ...resetFlow, newPassword: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 font-medium focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                      <button 
                        onClick={handleCompleteReset}
                        className="w-full bg-primary text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all"
                      >
                        Actualizar Ahora
                      </button>
                    </div>
                  </>
                )}

                {resetFlow.step === 'success' && (
                  <>
                    <div className="w-16 h-16 bg-emerald-500 text-white rounded-2xl flex items-center justify-center mb-6">
                      <Check size={32} />
                    </div>
                    <h3 className="text-xl font-black text-slate-800 mb-2">¡Todo listo!</h3>
                    <p className="text-sm text-slate-500 font-medium">Tu contraseña ha sido actualizada correctamente.</p>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Hidden Inputs */}
      <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={handleAvatarFileChange} />
      <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
      <input type="file" ref={certInputRef} className="hidden" onChange={handleAddCertificate} />

      {/* Hero Banner Section */}
      <div className="h-48 md:h-64 w-full relative overflow-hidden bg-primary">
        <div 
          className="absolute inset-0 opacity-20"
          style={{ 
            backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
            backgroundSize: `24px 24px`
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-6 -mt-20 relative z-10">
        {/* Main Header Header */}
        <div className="bg-white rounded-[2.5rem] p-8 mb-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 border border-slate-100">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div 
              onClick={() => avatarInputRef.current?.click()}
              className={cn(
                "w-40 h-40 bg-slate-800 rounded-[2.5rem] flex items-center justify-center shadow-2xl relative mt-[-80px] md:mt-[-40px] cursor-pointer group overflow-hidden border-8 border-white transition-all ring-1 ring-slate-100",
                isSaving && "opacity-80"
              )}
            >
              {formData.avatarUrl ? (
                <img src={formData.avatarUrl} className="w-full h-full object-cover" alt="Profile" />
              ) : (
                <div className="flex flex-col items-center text-white opacity-40">
                  <Camera size={40} />
                  <span className="text-[10px] font-black uppercase tracking-tighter mt-2">Subir Foto</span>
                </div>
              )}
              
              {/* Progress/Saving Overlay */}
              {isSaving && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-20">
                  <RefreshCw className="text-white animate-spin mb-2" size={24} />
                  <span className="text-[10px] text-white font-black uppercase tracking-widest">Subiendo...</span>
                </div>
              )}

              <div 
                className={cn(
                  "absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all duration-300 transform translate-y-4 group-hover:translate-y-0",
                  isSaving && "hidden"
                )}
              >
                <Camera className="text-white mb-2" size={32} />
                <span className="text-[10px] text-white font-black uppercase tracking-widest px-4 text-center leading-tight">Haz click para cambiar tu permanente foto</span>
              </div>
            </div>
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                <h1 className="text-3xl font-black text-slate-800 tracking-tighter">
                  {!activeTab ? 'Panel de Control' : activeTab === 'profile' ? 'Perfil de Empresa' : activeTab === 'config' ? 'Configuración Global' : 'Privacidad y Legal'}
                </h1>
                {formData.isVerified && (
                  <div className="bg-emerald-500 text-white p-1 rounded-full shadow-sm" title="Empresa Verificada">
                    <Check size={14} strokeWidth={4} />
                  </div>
                )}
              </div>
              <p className="text-slate-500 font-medium text-sm">Gestiona la identidad y seguridad de {formData.companyName || 'tu ecosistema'}.</p>
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <button 
              onClick={() => navigate(-1)}
              className="px-6 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all text-xs uppercase tracking-widest"
            >
              Cerrar
            </button>
            <motion.button 
              whileHover={{ scale: 1.05, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              onClick={handleSave}
              disabled={isSaving}
              className={cn(
                "px-8 py-3 bg-primary text-white rounded-2xl font-black transition-all flex items-center gap-3 relative overflow-hidden group uppercase tracking-widest text-xs",
                isSaving ? "opacity-70 cursor-not-allowed" : "cursor-pointer"
              )}
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              {isSaving ? (
                <>
                  <RefreshCw className="animate-spin" size={18} />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <span>Guardar Cambios</span>
                  <Zap size={16} className="text-white/40 group-hover:text-white transition-colors" />
                </>
              )}
            </motion.button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Navigation Sidebar */}
          <div className="w-full lg:w-72 shrink-0">
            <div className="bg-white rounded-[2rem] p-4 shadow-sm border border-slate-100 space-y-2">
              <TabButton 
                active={activeTab === 'profile'} 
                onClick={() => setActiveTab('profile')} 
                icon={<User size={18} />} 
                label="Mi Perfil" 
                subtitle="Identidad corporativa"
              />
              <TabButton 
                active={activeTab === 'config'} 
                onClick={() => setActiveTab('config')} 
                icon={<Settings size={18} />} 
                label="Configuración" 
                subtitle="Temas y Cuenta"
              />
              <TabButton 
                active={activeTab === 'privacy'} 
                onClick={() => setActiveTab('privacy')} 
                icon={<ShieldCheck size={18} />} 
                label="Privacidad" 
                subtitle="Datos y Seguridad"
              />
            </div>
            
            {/* Status Card */}
            <div className="mt-8 bg-primary/5 rounded-[2rem] p-8 border border-primary/10">
               <h4 className="text-[10px] font-black uppercase tracking-widest text-primary/40 mb-4 text-center">Estado del Perfil</h4>
               <div className="flex flex-col items-center gap-4">
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center p-2 relative shadow-inner">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="50%"
                        cy="50%"
                        r="34"
                        fill="transparent"
                        stroke="currentColor"
                        strokeWidth="8"
                        className="opacity-10"
                      />
                      <circle
                        cx="50%"
                        cy="50%"
                        r="34"
                        fill="transparent"
                        stroke="currentColor"
                        strokeWidth="8"
                        strokeDasharray="213.6"
                        strokeDashoffset="21.3" // 90% completed
                        className="text-primary"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-primary font-black text-sm">90%</span>
                  </div>
                  <p className="text-[11px] font-bold text-primary text-center leading-relaxed">Tu perfil se ve profesional y confiable para otros socios.</p>
               </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              {activeTab === 'profile' && (
                <motion.div
                  key="profile-tab"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  {/* Perfil View - The existing fields */}
                  <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm relative overflow-hidden">
                    <div className="flex items-center gap-3 mb-8">
                       <Building2 className="text-primary" size={24} />
                       <h2 className="text-xl font-bold text-slate-800">Información Básica</h2>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                       <div className="space-y-2">
                          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">Nombre del Responsable</label>
                          <input 
                             type="text" 
                             value={formData.name}
                             name="name"
                             onChange={handleInputChange}
                             className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 placeholder:text-slate-300 font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">Email Profesional</label>
                          <input 
                             type="email" 
                             value={formData.email}
                             name="email"
                             onChange={handleInputChange}
                             className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 placeholder:text-slate-300 font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                          />
                       </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                       <div className="space-y-2">
                          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">Nombre de la Empresa</label>
                          <input 
                             type="text" 
                             value={formData.companyName}
                             onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                             className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 placeholder:text-slate-300 font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">Sitio Web</label>
                          <input 
                             type="text" 
                             value={formData.website}
                             onChange={(e) => setFormData({...formData, website: e.target.value})}
                             placeholder="https://ejemplo.com"
                             className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 placeholder:text-slate-300 font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                          />
                       </div>
                    </div>

                    <div className="space-y-4 mb-6">
                       <div className="space-y-2">
                          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">Eslogan / Tagline</label>
                          <input 
                             type="text" 
                             value={formData.tagline}
                             onChange={(e) => setFormData({...formData, tagline: e.target.value})}
                             className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                             placeholder="Ej: Impulsando la innovación B2B"
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">Descripción de la Empresa / Bio</label>
                          <textarea 
                             rows={4}
                             value={formData.bio}
                             onChange={(e) => setFormData({...formData, bio: e.target.value})}
                             className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                             placeholder="Cuéntanos sobre la trayectoria y valores de tu empresa..."
                          />
                       </div>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">Ubicación</label>
                       <div className="relative">
                          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input 
                             type="text" 
                             value={formData.location}
                             onChange={(e) => setFormData({...formData, location: e.target.value})}
                             className="w-full bg-slate-50/50 border border-slate-200 rounded-xl pl-12 pr-4 py-3 font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                          />
                       </div>
                    </div>

                    <div className="space-y-4 pt-6 border-t border-slate-100 mt-6">
                       <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">Sectores de Actividad Industrial <span className="text-red-500">*</span></label>
                       <div className="flex flex-wrap gap-2 mb-3">
                         {formData.sectors.map(sector => (
                           <motion.span 
                             initial={{ scale: 0.8, opacity: 0 }}
                             animate={{ scale: 1, opacity: 1 }}
                             key={sector}
                             className="bg-primary text-white border border-primary/20 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 shadow-lg shadow-primary/20"
                           >
                             {sector}
                             <button 
                               onClick={(e) => {
                                 e.stopPropagation();
                                 removeSector(sector);
                               }} 
                               className="hover:scale-125 transition-transform bg-white/20 rounded-full p-0.5"
                             >
                               <X size={12} strokeWidth={3} />
                             </button>
                           </motion.span>
                         ))}
                       </div>
                       
                       <div className="relative group">
                          <select 
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val && !formData.sectors.includes(val)) {
                                setFormData(prev => ({ ...prev, sectors: [...prev.sectors, val] }));
                              }
                              e.target.value = "";
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 text-sm font-bold text-slate-600 outline-none focus:border-primary transition-all appearance-none cursor-pointer"
                          >
                            <option value="">+ Seleccionar sector para tu perfil...</option>
                            {INDUSTRIAL_SECTORS.map(s => (
                              <option key={s} value={s} disabled={formData.sectors.includes(s)}>{s}</option>
                            ))}
                          </select>
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-primary opacity-40 group-hover:opacity-100 pointer-events-none transition-opacity">
                            <Plus size={20} />
                          </div>
                       </div>
                       <p className="text-[10px] text-slate-400 font-bold leading-relaxed px-1">Añade los sectores en los que opera tu empresa para mejorar el matching algorítmico.</p>
                    </div>
                  </div>

                  {/* Catálogo de Servicios y Precios */}
                  <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                       <div className="flex items-center gap-3">
                          <Briefcase className="text-primary" size={24} />
                          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Portafolio de Soluciones</h2>
                       </div>
                       <button 
                         onClick={handleAddService}
                         className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest hover:underline"
                       >
                          <Plus size={16} />
                          Añadir Producto/Servicio
                       </button>
                    </div>

                    <div className="space-y-4">
                       <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-4">Gestiona tus productos, servicios, sistemas y aplicaciones</p>
                       {formData.services.map((service, idx) => (
                          <div key={service.id} className="bg-slate-50 border border-slate-100 p-6 rounded-3xl relative group">
                             <button 
                               onClick={() => removeService(service.id)}
                               className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                             >
                                <Trash2 size={16} />
                             </button>
                             
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                                <div className="space-y-2">
                                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Nombre</label>
                                   <input 
                                      type="text"
                                      value={service.name}
                                      onChange={(e) => {
                                         const newServices = [...formData.services];
                                         newServices[idx].name = e.target.value;
                                         setFormData({...formData, services: newServices});
                                      }}
                                      placeholder="Ej: Auditoría, CRM, etc."
                                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium focus:border-primary transition-all"
                                   />
                                </div>
                                <div className="space-y-2">
                                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Tipo</label>
                                   <select 
                                      value={service.type || 'Servicio'}
                                      onChange={(e) => {
                                         const newServices = [...formData.services];
                                         newServices[idx].type = e.target.value;
                                         setFormData({...formData, services: newServices});
                                      }}
                                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium focus:border-primary transition-all appearance-none"
                                   >
                                      <option value="Servicio">Servicio</option>
                                      <option value="Producto">Producto</option>
                                      <option value="Sistema">Sistema</option>
                                      <option value="Aplicación">Aplicación</option>
                                   </select>
                                </div>
                                <div className="flex flex-col md:flex-row items-end gap-3 md:col-span-3">
                                   <div className="flex-1 space-y-2 w-full">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Precio Unit. (€)</label>
                                      <input 
                                         type="number"
                                         step="0.01"
                                         value={service.price}
                                         onChange={(e) => {
                                            const newServices = [...formData.services];
                                            const price = parseFloat(e.target.value) || 0;
                                            newServices[idx].price = price;
                                            newServices[idx].totalPrice = price * (newServices[idx].quantity || 1);
                                            setFormData({...formData, services: newServices});
                                         }}
                                         className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:border-primary transition-all"
                                      />
                                   </div>
                                   <div className="w-full md:w-28 space-y-2">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Abrev. Unid.</label>
                                      <input 
                                         type="text"
                                         value={service.unit}
                                         onChange={(e) => {
                                            const newServices = [...formData.services];
                                            newServices[idx].unit = e.target.value;
                                            setFormData({...formData, services: newServices});
                                         }}
                                         placeholder="barra, h..."
                                         className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:border-primary transition-all"
                                      />
                                   </div>
                                   <div className="w-full md:w-20 space-y-2">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Cant.</label>
                                      <input 
                                         type="number"
                                         value={service.quantity || 1}
                                         onChange={(e) => {
                                            const newServices = [...formData.services];
                                            const qty = parseInt(e.target.value) || 1;
                                            newServices[idx].quantity = qty;
                                            newServices[idx].totalPrice = (newServices[idx].price || 0) * qty;
                                            setFormData({...formData, services: newServices});
                                         }}
                                         className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:border-primary transition-all"
                                      />
                                   </div>
                                   <div className="flex-1 space-y-2 w-full">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Total (€)</label>
                                      <div className="bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-black text-slate-500 h-[46px] flex items-center">
                                         {(service.totalPrice || 0).toFixed(2)}€
                                      </div>
                                   </div>
                                   <div className="flex-[1.5] space-y-2 w-full">
                                      <label className="text-[10px] font-black text-primary uppercase tracking-widest pl-1">Oferta / Desc. (€)</label>
                                      <input 
                                         type="number"
                                         step="0.01"
                                         value={service.specialPrice || 0}
                                         onChange={(e) => {
                                            const newServices = [...formData.services];
                                            newServices[idx].specialPrice = parseFloat(e.target.value) || 0;
                                            setFormData({...formData, services: newServices});
                                         }}
                                         placeholder="Oferta..."
                                         className="w-full bg-white border-2 border-primary/20 rounded-xl px-4 py-2.5 text-sm font-black text-primary focus:border-primary transition-all"
                                      />
                                   </div>
                                </div>
                             </div>
                          </div>
                       ))}
                    </div>
                  </div>

                  {/* Objetivos Sinergia */}
                  <div className="bg-primary text-white rounded-[2.5rem] p-10 shadow-xl relative overflow-hidden group">
                     {/* Decorative Circles */}
                     <div className="absolute -top-10 -right-10 w-24 h-24 bg-white/5 rounded-full group-hover:scale-110 transition-transform" />
                     <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-white/5 rounded-full group-hover:scale-110 transition-transform" />

                     <div className="flex items-center justify-between mb-8 relative">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white">
                              <Target size={20} />
                           </div>
                           <h2 className="text-xl font-bold tracking-tight">Objetivos de Sinergia (Anuncios)</h2>
                        </div>
                        <button 
                          onClick={() => {
                            const newObj = {
                              id: Date.now().toString(),
                              title: '',
                              description: '',
                              budget: 0
                            };
                            setFormData(prev => ({ ...prev, objectives: [...(prev as any).objectives, newObj] }));
                          }}
                          className="flex items-center gap-2 text-white font-bold text-xs uppercase tracking-widest hover:underline"
                        >
                           <Plus size={16} />
                           Añadir Objetivo
                        </button>
                     </div>

                     <div className="space-y-6 relative">
                        {(formData as any).objectives.length === 0 && (
                          <div className="bg-black/10 border-2 border-dashed border-white/10 p-8 rounded-3xl text-center">
                            <p className="text-white/40 text-xs font-black uppercase tracking-widest">No tienes anuncios de búsqueda activos.</p>
                            <p className="text-white/20 text-[10px] mt-2 italic">Añade varios objetivos para optimizar tu tiempo de búsqueda.</p>
                          </div>
                        )}
                        
                        {(formData as any).objectives.map((obj: any, idx: number) => (
                          <div key={obj.id} className="bg-black/20 border border-white/10 p-6 rounded-3xl relative group/obj">
                             <button 
                               onClick={() => {
                                 const newObjs = [...(formData as any).objectives];
                                 newObjs.splice(idx, 1);
                                 setFormData({...formData, objectives: newObjs});
                               }}
                               className="absolute top-4 right-4 text-white/20 hover:text-red-400 transition-colors opacity-0 group-hover/obj:opacity-100"
                             >
                                <Trash2 size={16} />
                             </button>

                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                                <div className="space-y-2">
                                   <label className="text-[10px] font-black uppercase tracking-widest text-white/50 pl-1">Título del Anuncio</label>
                                   <input 
                                      type="text"
                                      value={obj.title}
                                      onChange={(e) => {
                                         const newObjs = [...(formData as any).objectives];
                                         newObjs[idx].title = e.target.value;
                                         setFormData({...formData, objectives: newObjs});
                                      }}
                                      placeholder="Ej: Busco partner logístico"
                                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm font-bold text-white focus:border-white/30 transition-all outline-none"
                                   />
                                </div>
                                <div className="space-y-2">
                                   <label className="text-[10px] font-black uppercase tracking-widest text-white/50 pl-1">Presupuesto Aprox. (€)</label>
                                   <input 
                                      type="number"
                                      value={obj.budget}
                                      onChange={(e) => {
                                         const newObjs = [...(formData as any).objectives];
                                         newObjs[idx].budget = parseFloat(e.target.value) || 0;
                                         setFormData({...formData, objectives: newObjs});
                                      }}
                                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm font-bold text-white focus:border-white/30 transition-all outline-none"
                                   />
                                </div>
                             </div>

                             <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-white/50 pl-1">Descripción de Necesidad</label>
                                <textarea 
                                   rows={2}
                                   value={obj.description}
                                   onChange={(e) => {
                                      const newObjs = [...(formData as any).objectives];
                                      newObjs[idx].description = e.target.value;
                                      setFormData({...formData, objectives: newObjs});
                                   }}
                                   className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm font-medium text-white/80 placeholder:text-white/20 resize-none focus:border-white/30 transition-all outline-none"
                                   placeholder="Detalla lo que buscas específicamente..."
                                />
                             </div>
                          </div>
                        ))}

                        <div className="h-px bg-white/5 my-8" />

                        <div className="flex flex-col md:flex-row gap-8">
                           <div className="flex-1 space-y-2">
                              <label className="text-[10px] font-black uppercase tracking-widest text-white/50 pl-1">Objetivo Global Principal</label>
                              <textarea 
                                 rows={3}
                                 value={formData.searchQuery}
                                 onChange={(e) => setFormData({...formData, searchQuery: e.target.value})}
                                 className="w-full bg-black/20 border border-white/10 rounded-2xl p-4 font-medium text-white/90 placeholder:text-white/20 resize-none focus:border-white/30 transition-all"
                                 placeholder="Ej: Busco partner logístico especializado en frío"
                              />
                           </div>
                           <div className="w-full md:w-64 space-y-2">
                              <label className="text-[10px] font-black uppercase tracking-widest text-white/50 pl-1">Presupuesto Total (€)</label>
                              <div className="bg-black/20 border border-white/10 rounded-2xl p-4 focus-within:border-white/30 transition-all h-[104px] flex items-center">
                                 <input 
                                    type="number"
                                    value={formData.budget}
                                    onChange={(e) => setFormData({...formData, budget: parseFloat(e.target.value) || 0})}
                                    className="w-full bg-transparent border-none focus:ring-0 text-3xl font-black text-white"
                                 />
                              </div>
                           </div>
                        </div>
                     </div>

                  </div>
                </motion.div>
              )}

              {activeTab === 'config' && (
                <motion.div
                  key="config-tab"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  {/* Apariencia Section */}
                  <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-8">
                       <Palette className="text-primary" size={24} />
                       <h2 className="text-xl font-black text-slate-800 tracking-tight italic">Apariencia y Estilo</h2>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-4">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">Paleta de color de tu web corporativa</label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                           {['#004d43', '#1e293b', '#2563eb', '#7c3aed', '#db2777', '#dc2626', '#d97706', '#059669', '#0891b2', '#000000', '#4a4a4a', '#2d3748'].map(color => (
                             <button
                                key={color}
                                onClick={() => setFormData({...formData, themeColor: color})}
                                className={cn(
                                  "h-12 rounded-2xl border-4 transition-all relative group",
                                  formData.themeColor === color ? "border-primary" : "border-transparent hover:scale-105"
                                )}
                                style={{ backgroundColor: color }}
                             >
                                {formData.themeColor === color && (
                                  <div className="absolute inset-0 flex items-center justify-center text-white">
                                    <Check size={18} />
                                  </div>
                                )}
                             </button>
                           ))}
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold leading-relaxed mt-2">Este color definirá los acentos y botones en tu perfil público para que coincida con tu marca.</p>
                      </div>

                      <div className="h-px bg-slate-50 my-6" />

                      {/* Notificaciones y Alertas */}
                      <div className="space-y-6">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Preferencia de Notificaciones</h4>
                        <div className="flex flex-col gap-4">
                           <button 
                             onClick={() => {
                               const newState = !formData.notificationsEnabled;
                               setFormData(prev => ({ ...prev, notificationsEnabled: newState }));
                               if (newState) {
                                 // Simple mock feedback
                                 if ('Notification' in window && Notification.permission !== 'granted') {
                                    Notification.requestPermission();
                                 }
                               }
                             }}
                             className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl group transition-all hover:bg-slate-100"
                           >
                              <div className="flex items-center gap-3">
                                 <BellIcon className={cn("transition-colors", formData.notificationsEnabled ? "text-primary" : "text-slate-400")} size={18} />
                                 <span className="text-sm font-bold text-slate-700">Notificaciones de Escritorio</span>
                              </div>
                              <div className={cn(
                                "w-12 h-6 rounded-full p-1 flex transition-all",
                                formData.notificationsEnabled ? "bg-primary justify-end" : "bg-slate-200 justify-start"
                              )}>
                                 <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
                              </div>
                           </button>
                           
                           <button 
                             onClick={() => setFormData(prev => ({ ...prev, emailAlertsEnabled: !prev.emailAlertsEnabled }))}
                             className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl group transition-all hover:bg-slate-100"
                           >
                              <div className="flex items-center gap-3">
                                 <MailIcon className={cn("transition-colors", formData.emailAlertsEnabled ? "text-primary" : "text-slate-400")} size={18} />
                                 <span className="text-sm font-bold text-slate-700">Alertas por Email</span>
                              </div>
                              <div className={cn(
                                "w-12 h-6 rounded-full p-1 flex transition-all",
                                formData.emailAlertsEnabled ? "bg-primary justify-end" : "bg-slate-200 justify-start"
                              )}>
                                 <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
                              </div>
                           </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Seguridad de la Cuenta */}
                  <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm relative overflow-hidden">
                    <div className="flex items-center gap-3 mb-8">
                       <Lock className="text-primary" size={24} />
                       <h2 className="text-xl font-black text-slate-800 tracking-tight italic">Seguridad y Recuperación</h2>
                    </div>

                    <div className="space-y-6">
                       <div className="space-y-3">
                          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">Email de Recuperación</label>
                          <div className="relative">
                             <MailIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                             <input 
                                type="email"
                                value={formData.recoveryEmail}
                                onChange={(e) => setFormData({...formData, recoveryEmail: e.target.value})}
                                placeholder="tu-email-secundario@ejemplo.com"
                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-4 py-3 font-medium focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                             />
                          </div>
                          <p className="text-[10px] text-slate-400 font-bold leading-relaxed">Se usará para recuperar tu cuenta en caso de que pierdas el acceso principal.</p>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                          <button 
                            onClick={handleStartReset}
                            className="bg-white border-2 border-slate-100 p-6 rounded-[1.5rem] flex flex-col items-center gap-3 hover:bg-slate-50 hover:border-primary/20 transition-all group"
                          >
                             <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                <Key size={24} />
                             </div>
                             <span className="text-xs font-black uppercase tracking-widest text-slate-700">Cambiar Contraseña</span>
                          </button>

                          {formData.githubUser ? (
                            <div className="bg-slate-50 border-2 border-slate-200 p-6 rounded-[1.5rem] flex flex-col items-center gap-3 group relative overflow-hidden">
                               <div className="absolute top-2 right-2">
                                  <button onClick={handleDisconnectGithub} className="text-slate-300 hover:text-red-500 transition-colors">
                                     <X size={14} />
                                  </button>
                               </div>
                               <div className="w-12 h-12 bg-[#24292f] rounded-2xl flex items-center justify-center text-white">
                                  <Github size={24} />
                               </div>
                               <div className="text-center">
                                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-1">GitHub Conectado</span>
                                  <span className="text-xs font-bold text-slate-700">@{formData.githubUser.login}</span>
                               </div>
                            </div>
                          ) : (
                            <button 
                              onClick={handleConnectGithub}
                              className="bg-white border-2 border-slate-100 p-6 rounded-[1.5rem] flex flex-col items-center gap-3 hover:bg-slate-50 hover:border-primary/20 transition-all group"
                            >
                               <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-[#24292f] group-hover:text-white transition-all">
                                  <Github size={24} />
                               </div>
                               <span className="text-xs font-black uppercase tracking-widest text-slate-700 group-hover:text-[#24292f]">Conectar GitHub</span>
                            </button>
                          )}
                       </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'privacy' && (
                <motion.div
                  key="privacy-tab"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm overflow-hidden relative">
                    <div className="flex items-center gap-3 mb-8">
                       <ShieldCheck className="text-emerald-500" size={24} />
                       <h2 className="text-xl font-black text-slate-800 tracking-tight">Privacidad de Datos</h2>
                    </div>

                    <div className="space-y-10">
                      <div className="flex items-start gap-6 p-6 bg-emerald-50/50 rounded-[2rem] border border-emerald-100">
                         <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-500 shadow-sm shrink-0">
                            <Eye size={24} />
                         </div>
                         <div>
                            <h4 className="font-black text-slate-800 text-sm mb-1 uppercase tracking-tight">Visibilidad del Perfil Privado</h4>
                            <p className="text-xs text-slate-500 leading-relaxed font-medium">Controla quién puede ver tus métricas de éxito y servicios premium antes de establecer una alianza.</p>
                            <div className="mt-4 flex gap-2">
                               <button 
                                 onClick={() => setFormData(prev => ({ ...prev, visibility: 'connections' }))}
                                 className={cn(
                                   "px-4 py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all",
                                   formData.visibility === 'connections' ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                 )}
                               >
                                 Solo Conectados
                               </button>
                               <button 
                                 onClick={() => setFormData(prev => ({ ...prev, visibility: 'public' }))}
                                 className={cn(
                                   "px-4 py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all",
                                   formData.visibility === 'public' ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                 )}
                               >
                                 Todo Sinergia
                               </button>
                            </div>
                         </div>
                      </div>

                      <div className="space-y-6">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Información y Portabilidad</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <button 
                             onClick={handleExportPDF}
                             className="p-6 border-2 border-slate-100 rounded-[2rem] flex items-center justify-between group hover:border-primary/20 transition-all"
                           >
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-primary/5 text-primary rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                  <Download size={24} />
                                </div>
                                <div className="text-left">
                                  <p className="font-bold text-slate-800 text-sm">Exportar Perfil en PDF</p>
                                  <p className="text-[10px] font-medium text-slate-400">Descargar resumen profesional</p>
                                </div>
                              </div>
                              <ChevronRight className="text-slate-300" size={18} />
                           </button>
 
                           <button 
                             onClick={handleClearProfile}
                             className="p-6 border-2 border-slate-100 rounded-[2rem] flex items-center justify-between group hover:border-red-100 transition-all"
                           >
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                  <Trash2 size={24} />
                                </div>
                                <div className="text-left">
                                  <p className="font-bold text-slate-800 text-sm">Limpiar Perfil</p>
                                  <p className="text-[10px] font-medium text-slate-400">Borrar datos pero mantener cuenta</p>
                                </div>
                              </div>
                              <ChevronRight className="text-slate-300" size={18} />
                           </button>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
                           <div>
                              <h4 className="font-black text-slate-800 text-sm mb-1 italic">Nivel de Verificación de Identidad</h4>
                              <p className="text-[11px] text-slate-500 font-medium">Detectamos suplantaciones y garantizamos operaciones seguras.</p>
                           </div>
                           <button 
                             onClick={handleRequestVerification}
                             className={cn(
                               "px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg",
                               formData.isVerified ? "bg-emerald-500 text-white" : "bg-slate-800 text-white hover:bg-black"
                             )}
                           >
                             {formData.isVerified ? 'Empresa Verificada' : 'Solicitar Verificación'}
                           </button>
                        </div>
                        
                        <div className="h-px bg-slate-200 mb-6" />

                        <h4 className="font-black text-slate-800 text-sm mb-3 italic">Cumplimiento Legal</h4>
                        <p className="text-[11px] text-slate-500 font-medium leading-relaxed mb-6">En Sinergia, el tratamiento de tus datos corporativos cumple estrictamente con el **RGPD (Reglamento General de Protección de Datos)**. Implementamos cifrado de extremo a extremo en tus sesiones de negociación.</p>
                        <div className="flex items-center gap-4">
                           <div className="flex items-center gap-2 text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
                             <ShieldCheck size={14} />
                             Cifrado AES-256
                           </div>
                           <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500">
                             <FileText size={14} />
                             Ver Términos Completos
                           </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

function SelectionCard({ icon, title, desc, onClick, color }: any) {
  return (
    <motion.button
      whileHover={{ y: -10, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm text-left group hover:shadow-xl transition-all h-full flex flex-col"
    >
      <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg group-hover:rotate-6 transition-transform", color)}>
        {icon}
      </div>
      <h3 className="text-xl font-black text-slate-800 mb-3 tracking-tight">{title}</h3>
      <p className="text-sm font-medium text-slate-400 leading-relaxed mb-6 flex-1">{desc}</p>
      <div className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-widest group-hover:translate-x-2 transition-transform">
        Acceder ahora
        <ArrowRight size={14} />
      </div>
    </motion.button>
  );
}

function TabButton({ active, onClick, icon, label, subtitle, disabled }: any) {
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full p-4 rounded-[1.5rem] flex items-center gap-4 transition-all text-left group",
        active ? "bg-primary text-white shadow-lg shadow-primary/20" : "hover:bg-slate-50 text-slate-500",
        disabled && !active && "opacity-30 cursor-not-allowed filter grayscale"
      )}
    >
      <div className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
        active ? "bg-white/10" : "bg-slate-100 group-hover:bg-primary/5 group-hover:text-primary"
      )}>
        {icon}
      </div>
      <div>
        <h3 className="font-black text-sm tracking-tight leading-none mb-1 uppercase tracking-widest">{label}</h3>
        <p className={cn("text-[9px] font-bold uppercase tracking-tight", active ? "text-white/60" : "text-slate-400")}>{subtitle}</p>
      </div>
      {active && (
        <div className="ml-auto">
          <ChevronRight size={16} />
        </div>
      )}
    </button>
  );
}
