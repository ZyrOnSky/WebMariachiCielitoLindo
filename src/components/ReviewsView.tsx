import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, MessageCircle, X, ThumbsUp, Medal, ShieldAlert, Check } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, orderBy, getDocs, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import type { Review } from '../types';
import toast from 'react-hot-toast';

// Rate Limiting Config
const RATE_LIMIT_HOURS = 24;
const STORAGE_KEY = 'wmcl_review_timestamp';

// Basic Bad Words Filter
const PORN_WORDS = ['puta', 'mierda', 'carajo', 'verga', 'pene', 'viagra', 'sexo'];

export default function ReviewsView() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ratingInput, setRatingInput] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [name, setName] = useState('');
  const [comment, setComment] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [shouldShake, setShouldShake] = useState(false);
  const [modalOpenTime, setModalOpenTime] = useState<number>(0);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // Basic check, true security is in Firestore Rules
      setIsAdmin(!!user);
    });
    return () => unsubscribe();
  }, []);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'reviews'),
        where('status', '==', 'approved'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Review));
      setReviews(data);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      toast.error('Error al cargar reseñas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const sortedReviews = useMemo(() => {
    return [...reviews].sort((a, b) => {
      if (sortBy === 'newest') return (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0);
      if (sortBy === 'oldest') return (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0);
      if (sortBy === 'highest') return b.rating - a.rating;
      if (sortBy === 'lowest') return a.rating - b.rating;
      return 0;
    });
  }, [reviews, sortBy]);

  const featuredReviews = useMemo(() => reviews.filter(r => r.isFeatured), [reviews]);

  // --- STATS ---
  const totalScore = reviews.length > 0 ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) : '5.0';

  // --- SUBMIT ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // ANTI-SPAM 1: Honeypot
    if (honeypot.length > 0) {
      // Fake success for bots
      setSubmitSuccess(true);
      return;
    }

    // ANTI-SPAM 2: Rate Limit Client
    const lastSent = localStorage.getItem(STORAGE_KEY);
    if (lastSent && !isAdmin) {
      const hoursSince = (Date.now() - parseInt(lastSent)) / (1000 * 60 * 60);
      if (hoursSince < RATE_LIMIT_HOURS) {
        toast.error(`Solo puedes enviar una reseña cada ${RATE_LIMIT_HOURS} horas.`, { icon: '⏳' });
        return;
      }
    }

    // ANTI-SPAM 3: Filters
    const lwComment = comment.toLowerCase();
    const errors: Record<string, string> = {};

    if (PORN_WORDS.some(w => lwComment.includes(w))) {
      errors.comment = 'Contenido inapropiado detectado.';
      toast.error('Lenguaje no permitido detectado.', { id: 'spam-err' });
    }

    if (name.trim().length < 2) {
      errors.name = 'El nombre debe tener al menos 2 caracteres.';
    }
    
    if (comment.trim().length < 5) {
      errors.comment = errors.comment || 'El comentario es muy corto (mín. 5 caracteres).';
    }

    if (ratingInput < 0 || ratingInput > 5) {
      errors.rating = 'Calificación inválida.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setShouldShake(true);
      setTimeout(() => setShouldShake(false), 500);
      toast.error('Revisa los campos marcados en rojo.', { id: 'val-err' });
      return;
    }

    setFormErrors({});

    setIsSubmitting(true);
    try {
      // SECURITY GUARD 1: Human Speed Check (Bot Trap)
      const timeToSubmit = (Date.now() - modalOpenTime) / 1000;
      if (timeToSubmit < 3 && !isAdmin) {
        setSubmitSuccess(true); // Silent discard
        return;
      }

      // SECURITY GUARD 2: Global Limit (Max 500 reviews total)
      const qTotal = query(collection(db, 'reviews'));
      const totalSnap = await getDocs(qTotal);
      if (totalSnap.size >= 500) {
        setSubmitSuccess(true); // Silent discard
        return;
      }

      // SECURITY GUARD 3: Queue Limit (Max 20 pending)
      const qPending = query(collection(db, 'reviews'), where('status', '==', 'pending'));
      const pendingSnap = await getDocs(qPending);
      if (pendingSnap.size >= 20) {
        setSubmitSuccess(true); // Silent discard
        return;
      }

      // SECURITY GUARD 3: Duplicate Check
      const isDuplicate = reviews.some(r => r.comment.trim() === comment.trim() && r.userName.trim() === name.trim());
      if (isDuplicate) {
        setSubmitSuccess(true); // Silent discard
        return;
      }

      await addDoc(collection(db, 'reviews'), {
        userName: name.trim(),
        comment: comment.trim(),
        rating: ratingInput,
        status: 'pending', 
        isFeatured: false,
        createdAt: serverTimestamp()
      });

      localStorage.setItem(STORAGE_KEY, Date.now().toString());
      setSubmitSuccess(true);
      
      // Reset form silently after 3s
      setTimeout(() => {
        setIsModalOpen(false);
        setSubmitSuccess(false);
        setName('');
        setComment('');
        setRatingInput(0);
        setIsLocked(false);
      }, 3000);
      
    } catch (error) {
      console.error(error);
      toast.error('Hubo un error de conexión. Intente más tarde.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- INLINE ADMIN ---
  const handleToggleFeature = async (id: string, current: boolean) => {
    try {
      await updateDoc(doc(db, 'reviews', id), { isFeatured: !current });
      toast.success(current ? 'Removida de destacadas' : '¡Reseña destacada en el carrusel!');
      fetchReviews();
    } catch {
      toast.error('Error de permisos.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Borrar definitivamente esta reseña pública?')) return;
    try {
      await deleteDoc(doc(db, 'reviews', id));
      toast.success('Reseña eliminada.');
      fetchReviews();
    } catch {
      toast.error('Error de permisos.');
    }
  };

  // Star Rating Interaction Helper (Slider Logic for Touches/Mouse)
  const handleRatingSlide = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (isLocked) return;

    const target = e.currentTarget;
    const { left, width } = target.getBoundingClientRect();
    let clientX;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
    } else {
      clientX = e.clientX;
    }

    // Relative position 0.0 to 1.0 inside the container
    const x = Math.max(0, Math.min(clientX - left, width));
    const percent = x / width;
    
    // Calculate raw score 0 to 5
    const rawScore = percent * 5;
    
    // Round to nearest 0.5
    let roundedScore = Math.ceil(rawScore * 2) / 2;
    
    // Zona Muerta Inteligente: Permitir 0 estrellas fácilmente si el mouse/dedo está pegado al borde izquierdo (primeros 0.3 puntos)
    if (rawScore < 0.3) {
      roundedScore = 0;
    }

    setHoverRating(roundedScore);
    setRatingInput(roundedScore);
  };

  const renderStarsList = (score: number) => {
    return Array.from({ length: 5 }).map((_, i) => {
      const fill = score >= i + 1 ? 1 : score > i ? score % 1 : 0;
      return (
        <div key={i} className="relative w-4 h-4 sm:w-5 sm:h-5 text-outline-variant/30">
          <Star size="100%" className="absolute inset-0" strokeWidth={1} />
          <div className="absolute inset-0 overflow-hidden text-primary" style={{ width: `${fill * 100}%` }}>
            <Star size="100%" className="fill-current" strokeWidth={1} />
          </div>
        </div>
      );
    });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-32 pb-24 px-6 md:px-12 lg:px-24 min-h-screen bg-surface">
      <div className="max-w-7xl mx-auto">
        
        {/* HERO SECTION */}
        <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16 mb-20 bg-surface-container-lowest rounded-3xl p-8 border border-outline-variant/20 ambient-shadow">
          <div className="flex-1 text-center md:text-left">
            <h1 className="font-serif text-4xl md:text-6xl mb-4 text-on-surface">Experiencias <span className="text-primary italic">Inolvidables</span></h1>
            <p className="text-on-surface-variant font-light text-base md:text-lg">Nuestro mayor orgullo no es la música, sino lo que la música hace sentir. Descubre lo que nuestros clientes comparten sobre su experiencia con el Mariachi Cielito Lindo.</p>
          </div>
          <div className="flex flex-col items-center justify-center p-8 rounded-full border border-primary/20 bg-primary/5 min-w-[200px] min-h-[200px]">
            <span className="text-6xl font-serif text-on-surface mb-2 leading-none">{totalScore}</span>
            <div className="flex mb-2">{renderStarsList(parseFloat(totalScore))}</div>
            <span className="text-xs font-label uppercase tracking-widest text-on-surface-variant">{reviews.length} Reseñas</span>
          </div>
        </div>

        {/* FEATURED CAROUSEL */}
        {featuredReviews.length > 0 && (
          <div className="mb-24">
            <div className="flex items-center gap-2 mb-8">
              <Medal className="text-primary" size={24} />
              <h2 className="font-serif text-2xl md:text-3xl text-on-surface">Momentos Destacados</h2>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-8 snap-x snap-mandatory slide-scrollbar">
              {featuredReviews.map((review) => (
                <div key={review.id} className="snap-start shrink-0 w-[300px] md:w-[400px] p-6 md:p-8 rounded-3xl bg-surface-container-low border border-primary/30 shadow-[0_10px_30px_-15px_rgba(255,203,70,0.2)]">
                  <div className="flex mb-4">{renderStarsList(review.rating)}</div>
                  <p className="text-on-surface-variant font-light italic mb-6 leading-relaxed">"{review.comment}"</p>
                  <p className="font-serif text-primary text-lg">— {review.userName}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* REVIEWS GRID & FILTERS */}
        <div className="mb-10 flex flex-col md:flex-row justify-between items-center gap-4">
          <h2 className="font-serif text-3xl md:text-4xl text-on-surface">Todas las Opiniones</h2>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-surface-container p-3 rounded-full text-on-surface-variant border border-outline-variant/30 text-sm outline-none w-full md:w-auto px-6 cursor-pointer"
          >
            <option value="newest">Más recientes primero</option>
            <option value="oldest">Más antiguas primero</option>
            <option value="highest">Puntuación más alta</option>
            <option value="lowest">Puntuación más baja</option>
          </select>
        </div>

        {loading ? (
          <div className="h-40 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : (
          <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
            {sortedReviews.map(review => (
              <div key={review.id} className="break-inside-avoid bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/15 hover:border-primary/30 transition-colors group">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex gap-1">{renderStarsList(review.rating)}</div>
                  {isAdmin && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                       <button onClick={() => handleToggleFeature(review.id!, review.isFeatured)} className={`p-1.5 rounded-full ${review.isFeatured ? 'bg-primary text-on-primary' : 'bg-surface-container hover:text-primary'} text-xs`} title="Destacar en portada">
                         <Medal size={14} />
                       </button>
                       <button onClick={() => handleDelete(review.id!)} className="p-1.5 rounded-full bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white transition-colors text-xs" title="Borrar reseña">
                         <X size={14} />
                       </button>
                    </div>
                  )}
                </div>
                <p className="text-on-surface text-base mb-4 leading-relaxed whitespace-pre-wrap">{review.comment}</p>
                <div className="flex justify-between items-end">
                  <p className="font-serif text-on-surface-variant">{review.userName}</p>
                  <span className="text-xs text-on-surface-variant/50">
                    {review.createdAt ? new Date(review.createdAt.toMillis()).toLocaleDateString() : 'Reciente'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB - FLOATING ACTION BUTTON */}
      <button 
        onClick={() => {
          setIsModalOpen(true);
          setModalOpenTime(Date.now());
        }}
        className="fixed bottom-8 left-1/2 -translate-x-1/2 md:-translate-x-0 md:left-auto md:right-8 z-50 flex items-center gap-3 gold-gradient text-on-primary px-6 py-4 rounded-full shadow-[0_10px_30px_rgba(255,203,70,0.4)] hover:scale-105 transition-transform"
      >
        <MessageCircle size={22} className="fill-current/20" />
        <span className="font-bold tracking-wide">Dejar Reseña</span>
      </button>

      {/* MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
              onClick={() => !isSubmitting && setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ 
                opacity: 1, 
                scale: 1, 
                y: 0,
                x: shouldShake ? [0, -10, 10, -10, 10, 0] : 0
              }} 
              transition={shouldShake ? { duration: 0.4 } : { duration: 0.3 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg max-h-[95dvh] sm:max-h-[90vh] overflow-y-auto slide-scrollbar bg-surface-container-low border border-primary/20 rounded-3xl p-6 sm:p-8 shadow-2xl z-10"
            >
              <button onClick={() => !isSubmitting && setIsModalOpen(false)} className="absolute top-4 right-4 p-2 text-on-surface-variant hover:text-on-surface bg-surface-container rounded-full z-20">
                <X size={20} />
              </button>

              {submitSuccess ? (
                <div className="text-center py-10">
                  <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Check size={40} />
                  </div>
                  <h3 className="font-serif text-3xl text-on-surface mb-2">¡Mil Gracias!</h3>
                  <p className="text-on-surface-variant">Tu opinión nos ayuda a perfeccionar nuestro arte cada día más.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                  <div className="text-center">
                    <h3 className="font-serif text-3xl text-on-surface mb-2">Califícanos</h3>
                    <p className="text-sm text-on-surface-variant">¿Qué tal fue tu experiencia con nuestra agrupación?</p>
                  </div>

                  {/* Interactive Star Rating */}
                  <div className={`flex flex-col items-center gap-4 py-6 rounded-2xl border transition-all duration-300 ${isLocked ? 'bg-primary/20 border-primary/50 shadow-[0_0_30px_rgba(255,203,70,0.2)]' : 'bg-primary/5 border-primary/10'}`}>
                    {/* The entire container acts as the slider touch-target */}
                    <div 
                      className="flex justify-center gap-1 sm:gap-3 cursor-pointer touch-none select-none px-4"
                      onMouseMove={handleRatingSlide}
                      onTouchMove={handleRatingSlide}
                      onMouseDown={handleRatingSlide}
                      onTouchStart={handleRatingSlide}
                      onMouseLeave={() => {
                        if (!isLocked) setHoverRating(0);
                      }}
                      onTouchEnd={() => {
                        if (!isLocked && ratingInput > 0) {
                          setIsLocked(true);
                          setHoverRating(0);
                          toast.success('Calificación fijada', { id: 'touch-lock', duration: 1000, icon: '📍' });
                        }
                      }}
                      onClick={() => {
                        if (isLocked) {
                          setIsLocked(false);
                        } else {
                          setIsLocked(true);
                          setHoverRating(0); 
                        }
                      }}
                    >
                      {[1, 2, 3, 4, 5].map((index) => {
                        const displayScore = ratingInput || hoverRating;
                        const fill = displayScore >= index ? 1 : displayScore === index - 0.5 ? 0.5 : 0;
                        
                        return (
                          <motion.div 
                            key={index}
                            className="relative w-12 h-12 sm:w-14 sm:h-14 pointer-events-none"
                          >
                            <Star size="100%" className={`absolute inset-0 transition-colors ${isLocked ? 'text-primary/40' : 'text-outline-variant/20'}`} strokeWidth={1} />
                            <div 
                              className={`absolute inset-0 overflow-hidden text-primary transition-all duration-300 ${isLocked ? 'drop-shadow-[0_0_15px_rgba(255,203,70,0.8)]' : 'drop-shadow-[0_0_5px_rgba(255,203,70,0.2)]'}`} 
                              style={{ width: `${fill * 100}%` }}
                            >
                              <Star size="100%" className="fill-current" strokeWidth={1} />
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>
                    <div className="flex flex-col items-center">
                      <motion.div
                        key={ratingInput}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`font-serif text-3xl font-black transition-all ${isLocked ? 'text-primary scale-110' : 'text-on-surface-variant'}`}
                      >
                        {ratingInput.toFixed(1)}
                      </motion.div>
                      <div className="flex flex-col items-center gap-1">
                        <span className={`text-xs font-label uppercase tracking-widest font-bold transition-colors ${isLocked ? 'text-primary' : 'text-on-surface-variant/70'}`}>
                          {isLocked ? 'Calificación Bloqueada' : 'Desliza para calificar'}
                        </span>
                        <span className="text-[10px] text-on-surface-variant/40 italic">
                          {isLocked ? '(Haz clic para ajustar de nuevo)' : '(Haz clic para fijar)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className={`block text-xs font-label uppercase tracking-widest mb-2 transition-colors ${formErrors.name ? 'text-red-500' : 'text-on-surface-variant'}`}>Tu Nombre / Nickname</label>
                    <input 
                      type="text" 
                      value={name} 
                      onChange={e => {
                        setName(e.target.value);
                        if (formErrors.name) setFormErrors(prev => ({ ...prev, name: '' }));
                      }}
                      maxLength={50}
                      className={`w-full bg-surface-container border rounded-xl p-4 text-on-surface outline-none transition-all input-light-fix ${formErrors.name ? 'border-red-500/50 bg-red-500/5' : 'border-outline-variant/20 focus:border-primary/50'}`} 
                      placeholder="Ej. Familia Rodríguez"
                    />
                    <AnimatePresence>
                      {formErrors.name && (
                        <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-[10px] text-red-500 mt-2 font-medium flex items-center gap-1">
                          <ShieldAlert size={12} /> {formErrors.name}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>

                  <div>
                    <label className={`block text-xs font-label uppercase tracking-widest mb-2 transition-colors ${formErrors.comment ? 'text-red-500' : 'text-on-surface-variant'}`}>Comentario</label>
                    <textarea 
                      value={comment} 
                      onChange={e => {
                        setComment(e.target.value);
                        if (formErrors.comment) setFormErrors(prev => ({ ...prev, comment: '' }));
                      }}
                      maxLength={1000}
                      rows={4}
                      className={`w-full bg-surface-container border rounded-xl p-4 text-on-surface outline-none transition-all resize-none input-light-fix ${formErrors.comment ? 'border-red-500/50 bg-red-500/5' : 'border-outline-variant/20 focus:border-primary/50'}`} 
                      placeholder="Cuéntanos qué te pareció el repertorio, la presentación, la vestimenta..."
                    />
                    <AnimatePresence>
                      {formErrors.comment && (
                        <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-[10px] text-red-500 mt-2 font-medium flex items-center gap-1">
                          <ShieldAlert size={12} /> {formErrors.comment}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* HONEYPOT - ANTI SPAM (Invisible to humans) */}
                  <div className="hidden" aria-hidden="true">
                    <input type="text" name="website" value={honeypot} onChange={e => setHoneypot(e.target.value)} tabIndex={-1} autoComplete="off" />
                  </div>

                  <button 
                    disabled={isSubmitting}
                    className="w-full gold-gradient text-on-primary font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all shadow-lg mt-2"
                  >
                    {isSubmitting ? (
                      <div className="w-5 h-5 rounded-full border-2 border-on-primary border-t-transparent animate-spin" />
                    ) : (
                      <><ThumbsUp size={18} /> Enviar Opinión Pública</>
                    )}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
