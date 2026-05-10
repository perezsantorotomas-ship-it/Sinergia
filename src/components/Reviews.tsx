import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, X, MessageCircle, Send } from 'lucide-react';
import { db } from '../lib/firebase';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { useAppStore } from '../lib/store';
import { handleFirestoreError, OperationType } from '../lib/userService';
import { cn } from '../lib/utils';

interface Review {
  id: string;
  reviewerName: string;
  rating: number;
  comment: string;
  createdAt: any;
}

export default function CompanyReviews({ companyId, companyName, onClose }: { companyId: string, companyName: string, onClose: () => void }) {
  const { user } = useAppStore();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasAgreement, setHasAgreement] = useState(false);
  const [loadingAgreement, setLoadingAgreement] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'reviews'), 
      where('companyId', '==', companyId),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setReviews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Review[]);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'reviews');
    });
    return () => unsubscribe();
  }, [companyId]);

  useEffect(() => {
    if (!user) return;
    
    // Check if there is an agreement between user and this company
    const q = query(
      collection(db, 'agreements'),
      where('partnerIds', 'array-contains', user.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const agreementsList = snapshot.docs.map(doc => doc.data());
      const exists = agreementsList.some(a => a.partnerIds.includes(companyId) && a.status === 'signed');
      setHasAgreement(exists);
      setLoadingAgreement(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'agreements');
    });

    return () => unsubscribe();
  }, [user, companyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.isPremium) {
      alert("Solo los usuarios Premium pueden dejar reseñas.");
      return;
    }
    if (!hasAgreement) {
      alert("Debes tener un acuerdo firmado con esta empresa para poder valorarla.");
      return;
    }
    if (!comment.trim()) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'reviews'), {
        reviewerId: user.id,
        reviewerName: user.companyName,
        companyId,
        rating,
        comment,
        createdAt: serverTimestamp()
      });
      setComment('');
      setRating(5);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'reviews');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-xl rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
      >
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Reseñas de {companyName}</h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Ecosistema Sinergia B2B</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-200 rounded-2xl transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {reviews.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="text-slate-200" size={32} />
              </div>
              <p className="text-slate-400 font-bold">Todavía no hay reseñas para esta empresa.</p>
            </div>
          ) : (
            reviews.map((review) => (
              <div key={review.id} className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-black text-slate-700 text-sm">{review.reviewerName}</h4>
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        size={12} 
                        fill={i < review.rating ? "#eab308" : "none"} 
                        className={i < review.rating ? "text-yellow-500" : "text-slate-300"} 
                      />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed italic">"{review.comment}"</p>
              </div>
            ))
          )}
        </div>

        {user?.isPremium && hasAgreement && (
          <div className="p-8 border-t border-slate-100 bg-white">
            <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2">
              <MessageCircle size={18} className="text-primary" />
              Deja tu valoración
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex gap-2 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="transition-transform active:scale-90"
                  >
                    <Star 
                      size={24} 
                      fill={star <= rating ? "#eab308" : "none"} 
                      className={star <= rating ? "text-yellow-500" : "text-slate-300"} 
                    />
                  </button>
                ))}
              </div>
              <div className="relative">
                <textarea 
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Comparte tu experiencia colaborando con esta empresa..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all resize-none h-24"
                />
                <button 
                  disabled={isSubmitting || !comment.trim()}
                  className="absolute bottom-4 right-4 bg-primary text-white p-3 rounded-xl hover:brightness-110 active:scale-95 transition-all disabled:bg-slate-200"
                >
                  <Send size={18} />
                </button>
              </div>
            </form>
          </div>
        )}
        
        {user?.isPremium && !hasAgreement && !loadingAgreement && (
          <div className="p-8 border-t border-slate-100 bg-slate-50 text-center">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <p className="text-sm font-bold text-slate-600 mb-2">Colaboración Necesaria</p>
                <p className="text-xs text-slate-400">Para garantizar la autenticidad, solo puedes valorar empresas con las que hayas firmado un acuerdo oficial de colaboración.</p>
            </div>
          </div>
        )}
        
        {!user?.isPremium && (
          <div className="p-6 bg-amber-50 text-center">
             <p className="text-xs font-bold text-amber-700 uppercase tracking-widest">
               Solo las cuentas <span className="text-[#724116]">Sinergia Premium</span> pueden emitir valoraciones.
             </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
