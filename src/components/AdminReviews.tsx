import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { Review } from '../types';
import toast from 'react-hot-toast';
import { Check, X, Medal, Trash2, ShieldAlert } from 'lucide-react';

export default function AdminReviews() {
  const [pendingReviews, setPendingReviews] = useState<Review[]>([]);
  const [approvedReviews, setApprovedReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

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
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-serif text-on-surface mb-2 flex items-center gap-2">
          <ShieldAlert className="text-primary" /> Bandeja de Moderación ({pendingReviews.length})
        </h2>
        <p className="text-on-surface-variant mb-4">Estas reseñas fueron enviadas por los usuarios y esperan tu aprobación antes de ser visibles.</p>
        
        {pendingReviews.length === 0 ? (
          <div className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/20 text-center text-on-surface-variant">
            No hay reseñas pendientes por revisar.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingReviews.map(rev => (
              <div key={rev.id} className="bg-surface-container-lowest p-5 rounded-2xl border border-yellow-500/30">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-primary font-bold">{rev.rating} ★</span>
                  <span className="text-xs text-on-surface-variant">{rev.createdAt ? new Date(rev.createdAt.toMillis()).toLocaleDateString() : ''}</span>
                </div>
                <p className="font-serif mb-2 text-on-surface">{rev.userName}</p>
                <p className="text-sm text-on-surface-variant mb-4 line-clamp-4">{rev.comment}</p>
                <div className="flex gap-2">
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
        <p className="text-on-surface-variant mb-4">Estas son las reseñas actualmente visibles en el sitio. Puedes destacarlas para que aparezcan en el carrusel principal.</p>

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
                <tr key={rev.id} className="border-b border-outline-variant/10 hover:bg-surface-container-highest transition-colors">
                  <td className="p-4 font-serif text-on-surface whitespace-nowrap">{rev.userName}</td>
                  <td className="p-4 line-clamp-2 max-w-xs">{rev.comment}</td>
                  <td className="p-4 text-center text-primary font-bold">{rev.rating}</td>
                  <td className="p-4 text-right">
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
  );
}
