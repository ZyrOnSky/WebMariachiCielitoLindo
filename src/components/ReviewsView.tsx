import { useState, useEffect, useMemo, memo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, MessageCircle, X, ThumbsUp, Medal, ShieldAlert, Check, ChevronDown, Quote } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, orderBy, getDocs, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, getCountFromServer } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import type { Review } from '../types';
import toast from 'react-hot-toast';

// Rate Limiting Config
const RATE_LIMIT_HOURS = 24;
const STORAGE_KEY = 'wmcl_review_timestamp';

// Basic Bad Words Filter
const PORN_WORDS = ['puta', 'mierda', 'carajo', 'verga', 'pene', 'viagra', 'sexo'];

// Separate Review Card for better performance
const ReviewCard = memo(({ review, isAdmin, onToggleFeature, onDelete, renderStarsList, onView }: {
  review: Review,
  isAdmin: boolean,
  onToggleFeature: (id: string, current: boolean) => void,
  onDelete: (id: string) => void,
  renderStarsList: (score: number) => React.ReactNode,
  onView: (review: Review) => void
}) => (
  <div 
    onClick={() => onView(review)}
    className="break-inside-avoid bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/15 hover:border-primary/30 transition-all group will-change-transform cursor-pointer hover:shadow-lg"
  >
    <div className="flex justify-between items-start mb-3">
      <div className="flex gap-1">{renderStarsList(review.rating)}</div>
      {isAdmin && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
          <button onClick={() => onToggleFeature(review.id!, review.isFeatured)} className={`p-1.5 rounded-full ${review.isFeatured ? 'bg-primary text-on-primary' : 'bg-surface-container hover:text-primary'} text-xs`} title="Destacar en portada">
            <Medal size={14} />
          </button>
          <button onClick={() => onDelete(review.id!)} className="p-1.5 rounded-full bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white transition-colors text-xs" title="Borrar reseña">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
    <p className="text-on-surface text-base mb-4 leading-relaxed whitespace-pre-wrap line-clamp-4">{review.comment}</p>
    <div className="flex justify-between items-end">
      <p className="font-serif text-on-surface-variant">{review.userName}</p>
      <span className="text-xs text-on-surface-variant/50">
        {review.createdAt ? new Date(review.createdAt.toMillis()).toLocaleDateString() : 'Reciente'}
      </span>
    </div>
  </div>
));

const ReviewsList = memo(({ reviews, isAdmin, handleToggleFeature, handleDelete, renderStarsList, onView }: any) => (
  <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
    {reviews.map((review: Review) => (
      <ReviewCard
        key={review.id}
        review={review}
        isAdmin={isAdmin}
        onToggleFeature={handleToggleFeature}
        onDelete={handleDelete}
        renderStarsList={renderStarsList}
        onView={onView}
      />
    ))}
  </div>
));

export default function ReviewsView() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // --- CAROUSEL LOGIC ---
  const carouselRef = useRef<HTMLDivElement>(null);
  const [isInteracting, setIsInteracting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const scrollLeftStart = useRef(0);
  const scrollSpeed = useRef(0.6);

  useEffect(() => {
    const container = carouselRef.current;
    if (!container || reviews.length === 0) return;

    let animationId: number;
    const animate = () => {
      if (!isDragging && container) {
        container.scrollLeft += scrollSpeed.current;
        
        // Loop logic
        const setWidth = container.scrollWidth / 3;
        if (container.scrollLeft >= setWidth * 2) {
          container.scrollLeft = setWidth;
        } else if (container.scrollLeft <= 5) {
          container.scrollLeft = setWidth;
        }
      }
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [isInteracting, isDragging, reviews.length]);

  const handleCarouselInteraction = (active: boolean) => {
    if (!active) {
      scrollSpeed.current = 0.6; // Reset speed when leaving
      setIsInteracting(false);
    } else {
      setIsInteracting(true);
    }
  };

  const onCarouselMouseMove = (e: React.MouseEvent) => {
    if (!carouselRef.current || isDragging) return;
    const rect = carouselRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const p = x / rect.width;
    
    if (p < 0.2) scrollSpeed.current = -4; // Fast reverse
    else if (p > 0.8) scrollSpeed.current = 5; // Fast forward
    else scrollSpeed.current = 0.6; // Normal slow
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!carouselRef.current) return;
    setIsDragging(true);
    startX.current = e.pageX - carouselRef.current.offsetLeft;
    scrollLeftStart.current = carouselRef.current.scrollLeft;
  };

  const handleMouseDrag = (e: React.MouseEvent) => {
    if (!isDragging || !carouselRef.current) return;
    e.preventDefault();
    const x = e.pageX - carouselRef.current.offsetLeft;
    const walk = (x - startX.current) * 2;
    carouselRef.current.scrollLeft = scrollLeftStart.current - walk;
  };
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
  const [viewingReview, setViewingReview] = useState<Review | null>(null);
  const [modalOpenTime, setModalOpenTime] = useState<number>(0);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (viewingReview || isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
  }, [viewingReview, isModalOpen]);

  const getDynamicFontSize = (text: string) => {
    const len = text.length;
    if (len <= 50) return 'text-4xl md:text-6xl';
    if (len <= 150) return 'text-2xl md:text-4xl';
    if (len <= 300) return 'text-xl md:text-3xl';
    return 'text-lg md:text-2xl'; // Minimum reasonable size
  };

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
      if (import.meta.env.DEV) console.error("Error fetching reviews:", error);
      toast.error('Error al cargar reseñas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  // Lock scroll when review modal is open
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isModalOpen]);

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
      const totalSnap = await getCountFromServer(qTotal);
      if (totalSnap.data().count >= 500) {
        setSubmitSuccess(true); // Silent discard
        return;
      }

      // SECURITY GUARD 3: Queue Limit (Max 20 pending)
      const qPending = query(collection(db, 'reviews'), where('status', '==', 'pending'));
      const pendingSnap = await getCountFromServer(qPending);
      if (pendingSnap.data().count >= 20) {
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
      if (import.meta.env.DEV) console.error('[DEV] Review submit error:', error);
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
  const ratingContainerRef = useRef<HTMLDivElement>(null);
  const containerRect = useRef<{ left: number, width: number } | null>(null);

  const handleRatingSlide = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (isLocked) return;

    if (!containerRect.current && ratingContainerRef.current) {
      const { left, width } = ratingContainerRef.current.getBoundingClientRect();
      containerRect.current = { left, width };
    }

    if (!containerRect.current) return;

    const { left, width } = containerRect.current;
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
  }, [isLocked]);

  const resetContainerRect = () => {
    containerRect.current = null;
  };

  const renderStarsList = (score: number) => {
    return Array.from({ length: 5 }).map((_, i) => {
      const fill = score >= i + 1 ? 1 : score > i ? score % 1 : 0;
      const isHalf = fill > 0 && fill < 1;
      return (
        <div key={i} className="relative w-4 h-4 sm:w-5 sm:h-5 text-outline-variant/30 flex items-center justify-center">
          <Star size="100%" className="absolute inset-0" strokeWidth={1} />
          <div 
            className={`absolute inset-0 flex items-center justify-center text-primary ${isHalf ? 'p-[15%]' : 'overflow-hidden'}`} 
            style={{ width: isHalf ? '100%' : `${fill * 100}%` }}
          >
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
          <div className="mb-24 overflow-hidden">
            <div className="flex items-center gap-2 mb-8">
              <Medal className="text-primary" size={24} />
              <h2 className="font-serif text-2xl md:text-3xl text-on-surface">Momentos Destacados</h2>
            </div>
            <div 
              ref={carouselRef}
              onMouseEnter={() => handleCarouselInteraction(true)}
              onMouseLeave={() => { handleCarouselInteraction(false); setIsDragging(false); }}
              onMouseMove={onCarouselMouseMove}
              onMouseDown={handleMouseDown}
              onMouseUp={() => setIsDragging(false)}
              onMouseMoveCapture={handleMouseDrag}
              onTouchStart={() => {
                handleCarouselInteraction(true);
                setIsDragging(true); // Pause on touch
              }}
              onTouchEnd={() => {
                handleCarouselInteraction(false);
                setIsDragging(false); // Resume after touch
              }}
              className={`flex gap-4 overflow-x-hidden pt-4 pb-8 select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} scroll-smooth-none`}
              style={{ 
                scrollBehavior: 'auto',
                WebkitMaskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
                maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)'
              }}
            >
              {[...featuredReviews, ...featuredReviews, ...featuredReviews].map((review, idx) => (
                <div 
                  key={`${review.id}-${idx}`} 
                  onClick={() => setViewingReview(review)}
                  className="shrink-0 w-[300px] md:w-[420px] p-8 md:p-10 rounded-[2.5rem] bg-surface-container-low/40 backdrop-blur-xl border border-white/5 relative overflow-hidden group transition-all duration-500 hover:bg-surface-container-low/60 cursor-pointer"
                >
                  {/* Decorative Glow */}
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 blur-[50px] rounded-full group-hover:bg-primary/20 transition-colors" />
                  
                  {/* Glint effect on top border */}
                  <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
                  
                  {/* Decorative Rating Number */}
                  <span className="absolute top-4 right-8 text-primary/5 text-[120px] font-serif font-black -rotate-12 transition-all duration-1000 group-hover:rotate-0 group-hover:scale-110 pointer-events-none select-none">
                    {review.rating.toFixed(1)}
                  </span>

                  <div className="relative z-10 flex flex-col h-full">
                    <div className="flex mb-6 scale-90 origin-left">
                      {renderStarsList(review.rating)}
                    </div>
                    
                    <p className="text-on-surface-variant font-script text-2xl md:text-3xl mb-10 leading-relaxed flex-grow opacity-90 group-hover:opacity-100 transition-opacity line-clamp-6">
                      "{review.comment}"
                    </p>
                    
                    <div className="flex items-center gap-3 border-t border-primary/10 pt-6">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <p className="font-serif text-primary text-xl font-medium tracking-wide">
                        {review.userName}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* REVIEWS GRID & FILTERS */}
        <div className="mb-10 flex flex-col md:flex-row justify-between items-center gap-4">
          <h2 className="font-serif text-3xl md:text-4xl text-on-surface">Todas las Opiniones</h2>
          <div className="relative w-full md:w-auto group">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="appearance-none bg-surface-container-low pl-6 pr-12 py-3.5 rounded-full text-on-surface-variant border border-primary/20 text-sm font-medium outline-none w-full md:w-auto cursor-pointer focus:border-primary/60 hover:border-primary/40 focus:bg-surface-container transition-all shadow-sm group-hover:shadow-md"
            >
              <option value="newest">Más recientes primero</option>
              <option value="oldest">Más antiguas primero</option>
              <option value="highest">Puntuación más alta</option>
              <option value="lowest">Puntuación más baja</option>
            </select>
            <ChevronDown size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-primary pointer-events-none transition-transform group-hover:scale-110" strokeWidth={2.5} />
          </div>
        </div>

        {loading ? (
          <div className="h-40 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : (
          <ReviewsList
            reviews={sortedReviews}
            isAdmin={isAdmin}
            handleToggleFeature={handleToggleFeature}
            handleDelete={handleDelete}
            renderStarsList={renderStarsList}
            onView={setViewingReview}
          />
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

                  <div 
                    onClick={() => { if (isLocked) setIsLocked(false); }}
                    className={`flex flex-col items-center gap-4 py-6 rounded-2xl border transition-all duration-200 ${isLocked ? 'bg-primary/20 border-primary/50 shadow-[0_0_30px_rgba(255,203,70,0.2)] cursor-pointer' : 'bg-primary/5 border-primary/10'}`}
                  >
                    {/* The entire container acts as the slider touch-target */}
                    <div
                      ref={ratingContainerRef}
                      className="flex justify-center gap-1 sm:gap-3 cursor-pointer touch-none select-none px-4 py-2"
                      onMouseMove={handleRatingSlide}
                      onTouchMove={handleRatingSlide}
                      onMouseDown={(e) => {
                        resetContainerRect();
                        handleRatingSlide(e);
                      }}
                      onTouchStart={(e) => {
                        resetContainerRect();
                        handleRatingSlide(e);
                      }}
                      onMouseLeave={() => {
                        if (!isLocked) setHoverRating(0);
                        resetContainerRect();
                      }}
                      onTouchEnd={() => {
                        resetContainerRect();
                        if (!isLocked && ratingInput > 0) {
                          setIsLocked(true);
                          setHoverRating(0);
                        }
                      }}
                      onClick={(e) => {
                        if (isLocked) {
                          setIsLocked(false);
                        } else {
                          e.stopPropagation(); // Avoid card click when locking
                          setIsLocked(true);
                          setHoverRating(0);
                        }
                      }}
                    >
                      {[1, 2, 3, 4, 5].map((index) => {
                        const displayScore = ratingInput || hoverRating;
                        const fill = displayScore >= index ? 1 : displayScore === index - 0.5 ? 0.5 : 0;
                        const isHalf = fill > 0 && fill < 1;

                        return (
                          <motion.div
                            key={index}
                            className="relative w-12 h-12 sm:w-14 sm:h-14 pointer-events-none flex items-center justify-center text-primary"
                          >
                            <Star size="100%" className={`absolute inset-0 transition-colors ${isLocked ? 'text-primary/40' : 'text-outline-variant/20'}`} strokeWidth={1} />
                            <div
                              className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${isHalf ? 'p-[18%]' : 'overflow-hidden'} ${isLocked ? 'drop-shadow-[0_0_15px_rgba(255,203,70,0.8)]' : 'drop-shadow-[0_0_5px_rgba(255,203,70,0.2)]'}`}
                              style={{ width: isHalf ? '100%' : `${fill * 100}%` }}
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
                          {isLocked ? '(Haz clic en cualquier parte para ajustar)' : '(Haz clic para fijar)'}
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

      {/* REVIEW DETAIL MODAL */}
      <AnimatePresence>
        {viewingReview && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingReview(null)}
              className="absolute inset-0 bg-surface/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden bg-surface-container-low border border-primary/30 rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex flex-col"
            >
              <button 
                onClick={() => setViewingReview(null)}
                className="absolute top-6 right-6 p-3 text-on-surface-variant hover:text-on-surface bg-surface-container rounded-full z-20 transition-all hover:scale-110 active:scale-95"
              >
                <X size={24} />
              </button>

              <div className="absolute -top-10 -left-10 w-64 h-64 bg-primary/5 blur-[80px] rounded-full pointer-events-none" />
              
              {/* Decorative Rating Number */}
              <span className="absolute top-12 right-12 text-primary/5 text-[180px] font-serif font-black pointer-events-none select-none -z-10">
                {viewingReview.rating.toFixed(1)}
              </span>

              <div className="p-8 md:p-12 overflow-y-auto custom-scrollbar flex-grow z-10">
                <div className="flex mb-8">
                  {renderStarsList(viewingReview.rating)}
                </div>

                <p className={`font-script ${getDynamicFontSize(viewingReview.comment)} text-on-surface leading-[1.4] md:leading-[1.6] mb-12 italic opacity-95 transition-all duration-300`}>
                  "{viewingReview.comment}"
                </p>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-t border-primary/10 pt-8 mt-auto">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                      {viewingReview.userName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-serif text-primary text-2xl font-medium tracking-wide">
                        {viewingReview.userName}
                      </p>
                      <p className="text-xs text-on-surface-variant font-label uppercase tracking-widest mt-1">
                        Cliente Verificado
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-label uppercase tracking-[0.2em] text-on-surface-variant/40">
                      Fecha de Experiencia
                    </span>
                    <p className="text-on-surface-variant font-medium mt-1">
                      {viewingReview.createdAt ? new Date(viewingReview.createdAt.toMillis()).toLocaleDateString('es-ES', { 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric' 
                      }) : 'Recientemente'}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
