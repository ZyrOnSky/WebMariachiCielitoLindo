import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { Review } from '../types';
import toast from 'react-hot-toast';
import { Check, X, Medal, Trash2, ShieldAlert, Eye } from 'lucide-react';

function ReviewDetailModal({ review, onClose }: { review: Review; onClose: () => void }) {
  const stars = review.rating ?? 0;
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-surface-container-low border border-outline-variant/20 rounded-2xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="font-serif text-xl text-on-surface">{review.userName}</p>
            <div className="flex items-center gap-1 mt-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className={`text-lg ${i < stars ? 'text-primary' : 'text-outline-variant/30'}`}>★</span>
              ))}
              <span className="ml-2 text-xs text-on-surface-variant">
                {review.createdAt ? new Date(review.createdAt.toMillis()).toLocaleDateString('es-EC', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface transition-colors p-1">
            <X size={20} />
          </button>
        </div>

        {/* Divider */}
        <div className="border-t border-outline-variant/15 my-4" />

        {/* Full comment */}
        <div className="bg-surface-container-lowest rounded-xl p-4 max-h-72 overflow-y-auto custom-scrollbar">
          <p className="text-sm text-on-surface leading-relaxed whitespace-pre-wrap">{review.comment}</p>
        </div>

        {/* Status badge */}
        <div className="mt-4 flex items-center gap-2">
          <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${
            review.status === 'approved'
              ? 'bg-green-500/10 border-green-500/30 text-green-400'
              : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
          }`}>
            {review.status === 'approved' ? '✓ Publicada' : '⏳ Pendiente de aprobación'}
          </span>
          {review.isFeatured && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border bg-primary/10 border-primary/30 text-primary">
              ★ Destacada
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminReviews() {
  const [pendingReviews, setPendingReviews] = useState<Review[]>([]);
  const [approvedReviews, setApprovedReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);

  useEffect(() => {
    // Listen to Pending
    const qPending = query(collection(db, 'reviews'), where('status', '==', 'pending'), orderBy('createdAt', 'desc'));
    const unsubPending = onSnapshot(qPending, (snapshot) => {
      setPendingReviews(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Review)));
      setLoading(false);
    });

    // Listen to Approved
    const qApproved = query(collection(db, 'reviews'), where('status', '==', 'approved'), orderBy('createdAt', 'desc'));
    const unsubApproved = onSnapshot(qApproved, (snapshot) => {
      setApprovedReviews(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Review)));
    });

    return () => {
      unsubPending();
      unsubApproved();
    };
  }, []);

  const handleApprove = async (id: string) => {
    try {
      await updateDoc(doc(db, 'reviews', id), { status: 'approved' });
      toast.success('Reseña aprobada. Ya es visible públicamente.');
    } catch {
      toast.error('Error al aprobar.');
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar permanentemente esta reseña?')) return;
    try {
      await deleteDoc(doc(db, 'reviews', id));
      toast.success('Reseña descartada/borrada.');
      if (selectedReview?.id === id) setSelectedReview(null);
    } catch {
      toast.error('Error al borrar.');
    }
  };

  const handleToggleFeature = async (id: string, current: boolean) => {
    try {
      await updateDoc(doc(db, 'reviews', id), { isFeatured: !current });
      toast.success(current ? 'Removida de destacadas' : '¡Reseña destacada en el carrusel!');
    } catch {
      toast.error('Error al modificar.');
    }
  };

  if (loading) return <div className="p-8">Cargando módulo de reseñas...</div>;

  return (
    <>
      {selectedReview && (
        <ReviewDetailModal review={selectedReview} onClose={() => setSelectedReview(null)} />
      )}

      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-serif text-on-surface mb-2 flex items-center gap-2">
            <ShieldAlert className="text-primary" /> Bandeja de Moderación ({pendingReviews.length})
          </h2>
          <p className="text-on-surface-variant mb-4">Estas reseñas fueron enviadas por los usuarios y esperan tu aprobación. <span className="text-primary/70 text-xs">Toca una tarjeta para leerla completa.</span></p>
          
          {pendingReviews.length === 0 ? (
            <div className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/20 text-center text-on-surface-variant">
              No hay reseñas pendientes por revisar.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingReviews.map(rev => (
                <div
                  key={rev.id}
                  className="bg-surface-container-lowest p-5 rounded-2xl border border-yellow-500/30 cursor-pointer hover:border-yellow-400/60 hover:bg-surface-container transition-all group relative"
                  onClick={() => setSelectedReview(rev)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-primary font-bold">{rev.rating} ★</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-on-surface-variant">{rev.createdAt ? new Date(rev.createdAt.toMillis()).toLocaleDateString() : ''}</span>
                      <Eye size={14} className="text-on-surface-variant/40 group-hover:text-primary/60 transition-colors" />
                    </div>
                  </div>
                  <p className="font-serif mb-2 text-on-surface">{rev.userName}</p>
                  <p className="text-sm text-on-surface-variant mb-4 line-clamp-3">{rev.comment}</p>
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => handleApprove(rev.id!)} className="flex-1 flex justify-center items-center gap-1 bg-green-500/20 text-green-500 hover:bg-green-500 hover:text-white py-2 rounded-lg transition-colors text-sm">
                      <Check size={16} /> Aprobar
                    </button>
                    <button onClick={() => handleReject(rev.id!)} className="flex-1 flex justify-center items-center gap-1 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white py-2 rounded-lg transition-colors text-sm">
                      <Trash2 size={16} /> Descartar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-2xl font-serif text-on-surface mb-2">Reseñas Públicas ({approvedReviews.length})</h2>
          <p className="text-on-surface-variant mb-4">Estas son las reseñas actualmente visibles en el sitio. <span className="text-primary/70 text-xs">Toca una fila para ver el comentario completo.</span></p>

          <div className="bg-surface-container rounded-2xl overflow-hidden border border-outline-variant/20">
            <table className="w-full text-left text-sm text-on-surface-variant">
              <thead className="bg-surface-container-high text-on-surface">
                <tr>
                  <th className="p-4 font-label tracking-wide uppercase text-xs">Usuario</th>
                  <th className="p-4 font-label tracking-wide uppercase text-xs">Comentario</th>
                  <th className="p-4 font-label tracking-wide uppercase text-xs text-center">Pts</th>
                  <th className="p-4 font-label tracking-wide uppercase text-xs text-right">Admin</th>
                </tr>
              </thead>
              <tbody>
                {approvedReviews.map(rev => (
                  <tr
                    key={rev.id}
                    className="border-b border-outline-variant/10 hover:bg-surface-container-highest transition-colors cursor-pointer group"
                    onClick={() => setSelectedReview(rev)}
                  >
                    <td className="p-4 font-serif text-on-surface whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {rev.userName}
                        <Eye size={13} className="text-on-surface-variant/30 group-hover:text-primary/60 transition-colors" />
                      </div>
                    </td>
                    <td className="p-4 line-clamp-2 max-w-xs">{rev.comment}</td>
                    <td className="p-4 text-center text-primary font-bold">{rev.rating}</td>
                    <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleToggleFeature(rev.id!, rev.isFeatured)} className={`p-2 rounded-lg transition-colors ${rev.isFeatured ? 'bg-primary text-on-primary' : 'bg-surface hover:bg-primary/20 text-primary'}`} title="Destacar">
                          <Medal size={16} />
                        </button>
                        <button onClick={() => handleReject(rev.id!)} className="p-2 rounded-lg bg-surface hover:bg-red-500/20 text-red-500 transition-colors" title="Borrar">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
