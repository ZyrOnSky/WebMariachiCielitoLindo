import { FormEvent, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Grid3x3,
  Link as LinkIcon,
  List,
  LogOut,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ViewState } from '../types';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import { collection, onSnapshot, query, orderBy, doc, setDoc, deleteDoc, getDoc, serverTimestamp } from 'firebase/firestore';

interface Song {
  id: string;
  title: string;
  artist: string;
  genres: string[];
  occasions: string[];
  link?: string;
  youtubeUrl?: string;
}

interface CatalogData {
  genres: string[];
  occasions: string[];
  artists: string[];
}

interface AccessUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'musician' | 'user';
}

interface PendingUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'musician';
}

interface RejectedUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'musician';
}

type Section = 'songs' | 'users' | 'filters' | 'addSong';
type RoleFilter = 'admin' | 'musician';
type SongFilterDropdown = 'genero' | 'ocasion' | 'artista' | null;
type AuthMode = 'login' | 'register';

const DEFAULT_GENRES = [
  'Ranchera', 'Bolero', 'Huapango', 'Son', 'Paso Doble', 'Vals',
  'Cumbia', 'Corrido', 'Balada', 'Norteña', 'Polka', 'Zapateado',
  'Danzón', 'Chotís', 'Jarabe',
];

const DEFAULT_OCCASIONS = [
  'Boda', 'Serenata', 'Corporativo', 'Cumpleaños', 'Entierro', 'Fiesta',
  'Quinceañera', 'Aniversario', 'Bautizo', 'Graduación', 'Día de la Madre',
  'Día del Padre', 'Despedida', 'Reconciliación', 'Misa / Religioso',
];

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.map((v) => v.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function paginate<T>(list: T[], currentPage: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    totalPages,
    currentPage: safePage,
    pageItems: list.slice(start, start + pageSize),
  };
}

function isValidCorporatePassword(password: string) {
  const minLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  return minLength && hasUpper && hasLower && hasNumber;
}

export default function AdminView({ setView }: { setView: (v: ViewState) => void; key?: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<'admin' | 'musician' | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [songs, setSongs] = useState<Song[]>([]);
  const [loadingSongs, setLoadingSongs] = useState(true);

  const [catalog, setCatalog] = useState<CatalogData>({
    genres: DEFAULT_GENRES,
    occasions: DEFAULT_OCCASIONS,
    artists: [],
  });

  const [users, setUsers] = useState<AccessUser[]>([]);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [rejectedUsers, setRejectedUsers] = useState<RejectedUser[]>([]);

  const [activeSection, setActiveSection] = useState<Section>('songs');
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authBusy, setAuthBusy] = useState(false);
  const [loginCredentials, setLoginCredentials] = useState({ email: '', password: '' });
  const [registerCredentials, setRegisterCredentials] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [newSong, setNewSong] = useState({ title: '', artist: '', link: '', youtubeUrl: '' });
  const [newSongGenres, setNewSongGenres] = useState<string[]>([]);
  const [newSongOccasions, setNewSongOccasions] = useState<string[]>([]);
  const [newSongGenreSearch, setNewSongGenreSearch] = useState('');
  const [newSongOccasionSearch, setNewSongOccasionSearch] = useState('');

  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [editSongGenres, setEditSongGenres] = useState<string[]>([]);
  const [editSongOccasions, setEditSongOccasions] = useState<string[]>([]);
  const [editSongGenreSearch, setEditSongGenreSearch] = useState('');
  const [editSongOccasionSearch, setEditSongOccasionSearch] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [newUser, setNewUser] = useState({ email: '', name: '', role: 'musician' });

  const [showCatalogManager, setShowCatalogManager] = useState(false);
  const [newCatalogValue, setNewCatalogValue] = useState({ genres: '', occasions: '', artists: '' });

  const [songSearchTerm, setSongSearchTerm] = useState('');
  const [songFilterGenres, setSongFilterGenres] = useState<string[]>([]);
  const [songFilterOccasions, setSongFilterOccasions] = useState<string[]>([]);
  const [songFilterArtists, setSongFilterArtists] = useState<string[]>([]);
  const [openSongFilterDropdown, setOpenSongFilterDropdown] = useState<SongFilterDropdown>(null);
  const [songPage, setSongPage] = useState(1);
  const [songViewMode, setSongViewMode] = useState<'detailed' | 'compact'>('compact');
  const [eventSelectionIds, setEventSelectionIds] = useState<string[]>([]);

  const [userRoleFilter, setUserRoleFilter] = useState<RoleFilter>('musician');
  const [pendingPage, setPendingPage] = useState(1);
  const [acceptedPage, setAcceptedPage] = useState(1);
  const [rejectedPage, setRejectedPage] = useState(1);

  const SONGS_PAGE_SIZE = 10;
  const USERS_PAGE_SIZE = 6;

  const GENRES = catalog.genres;
  const OCCASIONS = catalog.occasions;
  const ARTISTS = catalog.artists;

  const filteredNewSongGenres = useMemo(
    () => GENRES.filter((g) => g.toLowerCase().includes(newSongGenreSearch.toLowerCase())),
    [GENRES, newSongGenreSearch]
  );
  const filteredNewSongOccasions = useMemo(
    () => OCCASIONS.filter((o) => o.toLowerCase().includes(newSongOccasionSearch.toLowerCase())),
    [OCCASIONS, newSongOccasionSearch]
  );

  const filteredEditSongGenres = useMemo(
    () => GENRES.filter((g) => g.toLowerCase().includes(editSongGenreSearch.toLowerCase())),
    [GENRES, editSongGenreSearch]
  );
  const filteredEditSongOccasions = useMemo(
    () => OCCASIONS.filter((o) => o.toLowerCase().includes(editSongOccasionSearch.toLowerCase())),
    [OCCASIONS, editSongOccasionSearch]
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            setRole(userDoc.data().role);
            setUser(currentUser);
          } else if (currentUser.email === 'zyronsky7@gmail.com') {
            await setDoc(doc(db, 'users', currentUser.uid), {
              email: currentUser.email,
              name: currentUser.displayName || 'Admin',
              role: 'admin',
              createdAt: serverTimestamp(),
            });
            setRole('admin');
            setUser(currentUser);
          } else {
            let pendingDoc = await getDoc(doc(db, 'pending_users', currentUser.email || ''));

            if (!pendingDoc.exists()) {
              pendingDoc = await getDoc(doc(db, 'pending_musicians', currentUser.email || ''));
            }

            if (pendingDoc.exists()) {
              const assignedRole = pendingDoc.data().role || 'musician';
              await setDoc(doc(db, 'users', currentUser.uid), {
                email: currentUser.email,
                name: currentUser.displayName || pendingDoc.data().name,
                role: assignedRole,
                createdAt: serverTimestamp(),
              });

              try {
                await deleteDoc(doc(db, 'pending_users', currentUser.email || ''));
              } catch {
                // no-op
              }
              try {
                await deleteDoc(doc(db, 'pending_musicians', currentUser.email || ''));
              } catch {
                // no-op
              }

              setRole(assignedRole);
              setUser(currentUser);
            } else {
              await signOut(auth);
              setUser(null);
              setRole(null);
              toast.error('Acceso Denegado: Tu cuenta de Google no ha sido autorizada por el administrador. Contáctalo para solicitar acceso.');
            }
          }
        } catch (error: any) {
          console.error('Error checking role:', error);
          await signOut(auth);
          setUser(null);
          setRole(null);

          if (error?.code === 'permission-denied') {
            toast.error('Acceso Denegado: Tu cuenta no tiene permisos para acceder o las reglas de seguridad de Firebase no han sido actualizadas. Contacta al administrador.');
          } else {
            toast.error('Ocurrió un error al verificar tu cuenta. Por favor, intenta de nuevo.');
          }
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || (role !== 'admin' && role !== 'musician')) return;

    const q = query(collection(db, 'songs'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedSongs: Song[] = [];
        snapshot.forEach((songDoc) => {
          fetchedSongs.push({ id: songDoc.id, ...songDoc.data() } as Song);
        });
        setSongs(fetchedSongs);
        setLoadingSongs(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'songs');
        setLoadingSongs(false);
      }
    );

    return () => unsubscribe();
  }, [user, role]);

  useEffect(() => {
    const catalogDoc = doc(db, 'catalog', 'master');
    const unsubscribe = onSnapshot(
      catalogDoc,
      (snapshot) => {
        if (!snapshot.exists()) {
          setCatalog({ genres: DEFAULT_GENRES, occasions: DEFAULT_OCCASIONS, artists: [] });
          return;
        }

        const data = snapshot.data();
        setCatalog({
          genres: uniqueSorted(Array.isArray(data.genres) ? data.genres : DEFAULT_GENRES),
          occasions: uniqueSorted(Array.isArray(data.occasions) ? data.occasions : DEFAULT_OCCASIONS),
          artists: uniqueSorted(Array.isArray(data.artists) ? data.artists : []),
        });
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'catalog/master');
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || role !== 'admin') {
      setUsers([]);
      setPendingUsers([]);
      setRejectedUsers([]);
      return;
    }

    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const nextUsers: AccessUser[] = [];
        snapshot.forEach((userDoc) => {
          const data = userDoc.data();
          if (data.role === 'admin' || data.role === 'musician' || data.role === 'user') {
            nextUsers.push({
              id: userDoc.id,
              email: data.email || '',
              name: data.name || '',
              role: data.role,
            });
          }
        });
        setUsers(nextUsers);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'users')
    );

    const unsubPending = onSnapshot(
      collection(db, 'pending_users'),
      (snapshot) => {
        const nextPending: PendingUser[] = [];
        snapshot.forEach((pendingDoc) => {
          const data = pendingDoc.data();
          if (data.role === 'admin' || data.role === 'musician') {
            nextPending.push({
              id: pendingDoc.id,
              email: data.email || pendingDoc.id,
              name: data.name || '',
              role: data.role,
            });
          }
        });
        setPendingUsers(nextPending);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'pending_users')
    );

    const unsubRejected = onSnapshot(
      collection(db, 'rejected_users'),
      (snapshot) => {
        const nextRejected: RejectedUser[] = [];
        snapshot.forEach((rejectedDoc) => {
          const data = rejectedDoc.data();
          if (data.role === 'admin' || data.role === 'musician') {
            nextRejected.push({
              id: rejectedDoc.id,
              email: data.email || rejectedDoc.id,
              name: data.name || '',
              role: data.role,
            });
          }
        });
        setRejectedUsers(nextRejected);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'rejected_users')
    );

    return () => {
      unsubUsers();
      unsubPending();
      unsubRejected();
    };
  }, [user, role]);

  useEffect(() => {
    setSongPage(1);
  }, [songSearchTerm, songFilterGenres, songFilterOccasions, songFilterArtists]);

  useEffect(() => {
    setPendingPage(1);
    setAcceptedPage(1);
    setRejectedPage(1);
  }, [userRoleFilter]);

  useEffect(() => {
    if (role !== 'admin' && activeSection !== 'songs') {
      setActiveSection('songs');
    }
  }, [role, activeSection]);

  const filteredSongs = useMemo(() => {
    return songs.filter((song) => {
      const matchesSearch =
        song.title.toLowerCase().includes(songSearchTerm.toLowerCase()) ||
        song.artist.toLowerCase().includes(songSearchTerm.toLowerCase());
      const matchesGenre = songFilterGenres.length === 0 || (song.genres && song.genres.some((g) => songFilterGenres.includes(g)));
      const matchesOccasion =
        songFilterOccasions.length === 0 || (song.occasions && song.occasions.some((o) => songFilterOccasions.includes(o)));
      const matchesArtist = songFilterArtists.length === 0 || songFilterArtists.includes(song.artist);

      return matchesSearch && matchesGenre && matchesOccasion && matchesArtist;
    });
  }, [songs, songSearchTerm, songFilterGenres, songFilterOccasions, songFilterArtists]);

  const songPagination = useMemo(
    () => paginate(filteredSongs, songPage, SONGS_PAGE_SIZE),
    [filteredSongs, songPage]
  );

  const eventSelectionSongs = useMemo(() => {
    if (eventSelectionIds.length === 0) return [];
    const songsById = new Map(songs.map((song) => [song.id, song]));
    return eventSelectionIds.map((id) => songsById.get(id)).filter(Boolean) as Song[];
  }, [eventSelectionIds, songs]);

  const pendingByRole = useMemo(
    () => pendingUsers.filter((u) => u.role === userRoleFilter),
    [pendingUsers, userRoleFilter]
  );
  const acceptedByRole = useMemo(
    () => users.filter((u) => u.role === userRoleFilter),
    [users, userRoleFilter]
  );
  const rejectedByRole = useMemo(
    () => rejectedUsers.filter((u) => u.role === userRoleFilter),
    [rejectedUsers, userRoleFilter]
  );

  const pendingPagination = useMemo(
    () => paginate(pendingByRole, pendingPage, USERS_PAGE_SIZE),
    [pendingByRole, pendingPage]
  );
  const acceptedPagination = useMemo(
    () => paginate(acceptedByRole, acceptedPage, USERS_PAGE_SIZE),
    [acceptedByRole, acceptedPage]
  );
  const rejectedPagination = useMemo(
    () => paginate(rejectedByRole, rejectedPage, USERS_PAGE_SIZE),
    [rejectedByRole, rejectedPage]
  );

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error('Error signing in:', error);
      toast.error(`No se pudo iniciar sesión con Google: ${error.message}`);
    }
  };

  const handleEmailLogin = async (e: FormEvent) => {
    e.preventDefault();
    const email = loginCredentials.email.trim().toLowerCase();
    const password = loginCredentials.password;

    if (!email || !password) {
      toast.error('Ingresa correo y contraseña.');
      return;
    }

    setAuthBusy(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.error('Error email login:', error);
      if (error?.code === 'auth/invalid-credential' || error?.code === 'auth/wrong-password' || error?.code === 'auth/user-not-found') {
        toast.error('Credenciales inválidas. Verifica correo y contraseña.');
      } else {
        toast.error(`No se pudo iniciar sesión: ${error?.message || 'Error desconocido.'}`);
      }
    } finally {
      setAuthBusy(false);
    }
  };

  const handleEmailRegister = async (e: FormEvent) => {
    e.preventDefault();
    const email = registerCredentials.email.trim().toLowerCase();
    const password = registerCredentials.password;
    const confirmPassword = registerCredentials.confirmPassword;

    if (!email || !password || !confirmPassword) {
      toast.error('Completa todos los campos.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('La confirmación de contraseña no coincide.');
      return;
    }
    if (!isValidCorporatePassword(password)) {
      toast.error('La contraseña debe tener mínimo 8 caracteres, mayúscula, minúscula y número.');
      return;
    }

    setAuthBusy(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      toast.success('Cuenta creada. Si tu correo está autorizado en invitaciones, entrarás automáticamente al panel.');
      setRegisterCredentials({ email: '', password: '', confirmPassword: '' });
    } catch (error: any) {
      console.error('Error email register:', error);
      if (error?.code === 'auth/email-already-in-use') {
        toast.error('Este correo ya está registrado. Usa iniciar sesión.');
      } else if (error?.code === 'auth/invalid-email') {
        toast.error('Correo inválido.');
      } else if (error?.code === 'auth/weak-password') {
        toast.error('Contraseña débil. Usa una más fuerte.');
      } else {
        toast.error(`No se pudo registrar: ${error?.message || 'Error desconocido.'}`);
      }
    } finally {
      setAuthBusy(false);
    }
  };

  const handlePasswordReset = async () => {
    const email = loginCredentials.email.trim().toLowerCase();
    if (!email) {
      toast.error('Escribe tu correo primero para enviar recuperación.');
      return;
    }

    setAuthBusy(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('Se envió un correo para restablecer la contraseña.');
    } catch (error: any) {
      console.error('Error password reset:', error);
      toast.error(`No se pudo enviar recuperación: ${error?.message || 'Error desconocido.'}`);
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const upsertCatalogList = async (type: keyof CatalogData, values: string[]) => {
    if (!user || role !== 'admin') return;

    const nextCatalog: CatalogData = {
      ...catalog,
      [type]: uniqueSorted(values),
    };

    await setDoc(doc(db, 'catalog', 'master'), nextCatalog, { merge: true });
  };

  const toggleSelection = (item: string, list: string[], setList: (l: string[]) => void) => {
    if (list.includes(item)) {
      setList(list.filter((i) => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  const handleAddSong = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || role !== 'admin') return;

    try {
      const cleanedArtist = newSong.artist.trim();
      const cleanedGenres = uniqueSorted(newSongGenres);
      const cleanedOccasions = uniqueSorted(newSongOccasions);

      const newDocRef = doc(collection(db, 'songs'));
      await setDoc(newDocRef, {
        title: newSong.title.trim(),
        artist: cleanedArtist,
        link: newSong.link.trim(),
        youtubeUrl: newSong.youtubeUrl.trim(),
        genres: cleanedGenres,
        occasions: cleanedOccasions,
        createdAt: serverTimestamp(),
        createdBy: user.uid,
      });

      if (cleanedArtist && !ARTISTS.includes(cleanedArtist)) {
        await upsertCatalogList('artists', [...ARTISTS, cleanedArtist]);
      }

      setNewSong({ title: '', artist: '', link: '', youtubeUrl: '' });
      setNewSongGenres([]);
      setNewSongOccasions([]);
      setNewSongGenreSearch('');
      setNewSongOccasionSearch('');
      setActiveSection('songs');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'songs');
    }
  };

  const handleStartEditSong = (song: Song) => {
    setEditingSong(song);
    setEditSongGenres(song.genres || []);
    setEditSongOccasions(song.occasions || []);
    setEditSongGenreSearch('');
    setEditSongOccasionSearch('');
  };

  const handleSaveSongEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || role !== 'admin' || !editingSong || isSavingEdit) return;

    setIsSavingEdit(true);
    try {
      const cleanedArtist = editingSong.artist.trim();
      const cleanedGenres = uniqueSorted(editSongGenres);
      const cleanedOccasions = uniqueSorted(editSongOccasions);

      await setDoc(
        doc(db, 'songs', editingSong.id),
        {
          title: editingSong.title.trim(),
          artist: cleanedArtist,
          link: (editingSong.link || '').trim(),
          youtubeUrl: (editingSong.youtubeUrl || '').trim(),
          genres: cleanedGenres,
          occasions: cleanedOccasions,
        },
        { merge: true }
      );

      if (cleanedArtist && !ARTISTS.includes(cleanedArtist)) {
        await upsertCatalogList('artists', [...ARTISTS, cleanedArtist]);
      }

      toast.success('Canción guardada correctamente');
      setEditingSong(null);
    } catch (error) {
      console.error(error);
      toast.error('Error updating song: Ensure fields match constraints (max labels limits). Check console for details.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteSong = async (id: string) => {
    if (!user || role !== 'admin') return;
    if (!window.confirm('¿Estás seguro de eliminar esta canción?')) return;
    try {
      await deleteDoc(doc(db, 'songs', id));
      toast.success('Canción eliminada exitosamente');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `songs/${id}`);
    }
  };

  const toggleEventSelectionSong = (songId: string) => {
    setEventSelectionIds((prev) => {
      if (prev.includes(songId)) {
        return prev.filter((id) => id !== songId);
      }
      return [...prev, songId];
    });
  };

  const copyEventMegaLinks = async () => {
    const text = eventSelectionSongs
      .map((song) => `${song.title} - ${song.artist}${song.link ? `\n${song.link}` : '\n(Sin enlace Mega)'}`)
      .join('\n\n');

    if (!text.trim()) return;

    try {
      await navigator.clipboard.writeText(text);
      toast.success('Lista de enlaces Mega copiada al portapapeles.');
    } catch {
      toast.error('No se pudo copiar la lista.');
    }
  };

  const handleAddUser = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || role !== 'admin') return;

    try {
      await setDoc(doc(db, 'pending_users', newUser.email), {
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        addedBy: user.uid,
        createdAt: serverTimestamp(),
      });

      await deleteDoc(doc(db, 'rejected_users', newUser.email)).catch(() => undefined);

      setNewUser({ email: '', name: '', role: 'musician' });
      toast.success('Invitación enviada correctamente. El usuario podrá acceder cuando inicie sesión con su cuenta de Google.');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'pending_users');
    }
  };

  const handleDiscardPendingUser = async (pendingUser: PendingUser) => {
    if (!user || role !== 'admin') return;

    try {
      await setDoc(doc(db, 'rejected_users', pendingUser.email), {
        email: pendingUser.email,
        name: pendingUser.name,
        role: pendingUser.role,
        discardedBy: user.uid,
        discardedAt: serverTimestamp(),
      });
      await deleteDoc(doc(db, 'pending_users', pendingUser.email));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `pending_users/${pendingUser.email}`);
    }
  };

  const handleReinviteRejectedUser = async (rejectedUser: RejectedUser) => {
    if (!user || role !== 'admin') return;

    try {
      await setDoc(doc(db, 'pending_users', rejectedUser.email), {
        email: rejectedUser.email,
        name: rejectedUser.name,
        role: rejectedUser.role,
        addedBy: user.uid,
        createdAt: serverTimestamp(),
      });
      await deleteDoc(doc(db, 'rejected_users', rejectedUser.email));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `rejected_users/${rejectedUser.email}`);
    }
  };

  const handleAddCatalogValue = async (type: keyof CatalogData) => {
    if (!user || role !== 'admin') return;
    const inputValue = newCatalogValue[type].trim();
    if (!inputValue) return;
    if (catalog[type].some((v) => v.toLowerCase() === inputValue.toLowerCase())) return;

    try {
      await upsertCatalogList(type, [...catalog[type], inputValue]);
      setNewCatalogValue((prev) => ({ ...prev, [type]: '' }));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'catalog/master');
    }
  };

  const handleRemoveCatalogValue = async (type: keyof CatalogData, value: string) => {
    if (!user || role !== 'admin') return;
    try {
      await upsertCatalogList(type, catalog[type].filter((v) => v !== value));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'catalog/master');
    }
  };

  const handleRenameCatalogValue = async (type: keyof CatalogData, previousValue: string) => {
    if (!user || role !== 'admin') return;
    const nextValue = window.prompt('Nuevo nombre', previousValue)?.trim();
    if (!nextValue || nextValue === previousValue) return;
    if (catalog[type].some((v) => v.toLowerCase() === nextValue.toLowerCase())) {
      toast.error('Ese valor ya existe.');
      return;
    }

    try {
      await upsertCatalogList(type, catalog[type].map((v) => (v === previousValue ? nextValue : v)));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'catalog/master');
    }
  };

  const handleQuickAddFromSongForm = async (type: 'genres' | 'occasions' | 'artists', rawValue: string) => {
    const value = rawValue.trim();
    if (!value) return;
    if (catalog[type].some((v) => v.toLowerCase() === value.toLowerCase())) return;
    await upsertCatalogList(type, [...catalog[type], value]);
  };

  if (loadingAuth) {
    return <div className="min-h-screen bg-surface flex items-center justify-center text-on-surface-variant">Cargando...</div>;
  }

  if (!user || (role !== 'admin' && role !== 'musician')) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="min-h-screen bg-surface flex items-start justify-center px-4 sm:px-6 pt-40 sm:pt-36 md:pt-32 pb-24">
        <div className="w-full max-w-md bg-surface-container-low p-6 sm:p-8 rounded-3xl border border-outline-variant/10 ambient-shadow mt-4">
          <div className="mb-10 text-center">
            <span className="text-error text-xs font-bold uppercase tracking-widest mb-3 block">Acceso Restringido</span>
            <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl leading-tight text-on-surface mb-4">Portal de Músicos <br className="sm:hidden" />y Admin</h1>
            <p className="text-sm text-on-surface-variant">
              Inicia sesión con tu cuenta de Google. Sólo los correos habilitados por la administración podrán ingresar al panel y ver la información.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4 bg-surface-container-lowest p-1 rounded-xl border border-outline-variant/20">
            <button
              onClick={() => setAuthMode('login')}
              className={`py-2 rounded-lg text-sm ${authMode === 'login' ? 'bg-primary/10 text-primary border border-primary/30' : 'text-on-surface-variant'}`}
            >
              Ingresar
            </button>
            <button
              onClick={() => setAuthMode('register')}
              className={`py-2 rounded-lg text-sm ${authMode === 'register' ? 'bg-primary/10 text-primary border border-primary/30' : 'text-on-surface-variant'}`}
            >
              Crear Cuenta
            </button>
          </div>

          {authMode === 'login' ? (
            <form onSubmit={handleEmailLogin} className="space-y-3 mb-4">
              <input
                type="email"
                required
                value={loginCredentials.email}
                onChange={(e) => setLoginCredentials((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="correo@empresa.com"
                className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-4 py-3 text-on-surface"
              />
              <input
                type="password"
                required
                value={loginCredentials.password}
                onChange={(e) => setLoginCredentials((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="Contraseña"
                className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-4 py-3 text-on-surface"
              />
              <button
                type="submit"
                disabled={authBusy}
                className="w-full gold-gradient text-on-primary py-3 font-bold rounded-xl disabled:opacity-60"
              >
                {authBusy ? 'Ingresando...' : 'Ingresar con correo'}
              </button>
              <button
                type="button"
                onClick={handlePasswordReset}
                disabled={authBusy}
                className="w-full text-xs text-on-surface-variant hover:text-primary"
              >
                Recuperar contraseña
              </button>
            </form>
          ) : (
            <form onSubmit={handleEmailRegister} className="space-y-3 mb-4">
              <input
                type="email"
                required
                value={registerCredentials.email}
                onChange={(e) => setRegisterCredentials((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="correo@empresa.com"
                className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-4 py-3 text-on-surface"
              />
              <input
                type="password"
                required
                value={registerCredentials.password}
                onChange={(e) => setRegisterCredentials((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="Contraseña"
                className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-4 py-3 text-on-surface"
              />
              <input
                type="password"
                required
                value={registerCredentials.confirmPassword}
                onChange={(e) => setRegisterCredentials((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="Confirmar contraseña"
                className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-4 py-3 text-on-surface"
              />
              <p className="text-[11px] text-on-surface-variant">Mínimo 8 caracteres, mayúscula, minúscula y número.</p>
              <button
                type="submit"
                disabled={authBusy}
                className="w-full border border-primary/40 text-primary py-3 font-semibold rounded-xl hover:bg-primary/10 disabled:opacity-60"
              >
                {authBusy ? 'Creando cuenta...' : 'Crear cuenta corporativa'}
              </button>
            </form>
          )}

          <button onClick={handleLogin} className="w-full bg-surface-container-lowest border border-outline-variant/30 text-on-surface py-4 font-semibold rounded-xl hover:border-primary hover:text-primary transition-all mt-2 flex items-center justify-center gap-3">
            <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
              <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                <path fill="#4285F4" d="M -3.264,51.509 C -3.264,50.719 -3.334,49.969 -3.454,49.239 L -14.754,49.239 L -14.754,53.749 L -8.284,53.749 C -8.574,55.229 -9.424,56.479 -10.684,57.329 L -10.684,60.329 L -6.824,60.329 C -4.564,58.239 -3.264,55.159 -3.264,51.509 Z" />
                <path fill="#34A853" d="M -14.754,63.239 C -11.514,63.239 -8.804,62.159 -6.824,60.329 L -10.684,57.329 C -11.764,58.049 -13.134,58.489 -14.754,58.489 C -17.884,58.489 -20.534,56.379 -21.484,53.529 L -25.464,53.529 L -25.464,56.619 C -23.494,60.539 -19.444,63.239 -14.754,63.239 Z" />
                <path fill="#FBBC05" d="M -21.484,53.529 C -21.734,52.809 -21.864,52.039 -21.864,51.239 C -21.864,50.439 -21.724,49.669 -21.484,48.949 L -21.484,45.859 L -25.464,45.859 C -26.284,47.479 -26.754,49.299 -26.754,51.239 C -26.754,53.179 -26.284,54.999 -25.464,56.619 L -21.484,53.529 Z" />
                <path fill="#EA4335" d="M -14.754,43.989 C -12.984,43.989 -11.404,44.599 -10.154,45.789 L -6.734,41.939 C -8.804,40.009 -11.514,39.239 -14.754,39.239 C -19.444,39.239 -23.494,41.939 -25.464,45.859 L -21.484,48.949 C -20.534,46.099 -17.884,43.989 -14.754,43.989 Z" />
              </g>
            </svg>
            Ingresar con Google
          </button>

          <button onClick={() => setView('home')} className="mt-6 text-on-surface-variant text-xs hover:text-primary transition-colors w-full text-center">
            Volver a la página principal
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="pt-40 sm:pt-36 md:pt-32 pb-24 px-4 sm:px-6 md:px-12 lg:px-24 min-h-screen bg-surface">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl leading-tight mb-2 text-on-surface">Panel de Control</h1>
            <p className="text-on-surface-variant font-light">Bienvenido, {user.displayName} ({role})</p>
          </div>
          <button onClick={handleLogout} className="border border-error/50 text-error px-6 py-3 font-medium rounded-xl hover:bg-error/10 transition-colors flex items-center gap-2">
            <LogOut size={18} /> Salir
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          <button
            onClick={() => setActiveSection('songs')}
            className={`px-4 py-3 rounded-xl border text-sm font-semibold transition-colors ${
              activeSection === 'songs' ? 'border-primary text-primary bg-primary/10' : 'border-outline-variant/30 text-on-surface hover:border-primary'
            }`}
          >
            Lista de Canciones
          </button>

          {role === 'admin' && (
            <button
              onClick={() => setActiveSection('users')}
              className={`px-4 py-3 rounded-xl border text-sm font-semibold transition-colors ${
                activeSection === 'users' ? 'border-primary text-primary bg-primary/10' : 'border-outline-variant/30 text-on-surface hover:border-primary'
              }`}
            >
              Usuarios
            </button>
          )}

          {role === 'admin' && (
            <button
              onClick={() => setActiveSection('filters')}
              className={`px-4 py-3 rounded-xl border text-sm font-semibold transition-colors ${
                activeSection === 'filters' ? 'border-primary text-primary bg-primary/10' : 'border-outline-variant/30 text-on-surface hover:border-primary'
              }`}
            >
              Gestionar Filtros
            </button>
          )}

          {role === 'admin' && (
            <button
              onClick={() => setActiveSection('addSong')}
              className={`px-4 py-3 rounded-xl border text-sm font-semibold transition-colors ${
                activeSection === 'addSong' ? 'border-primary text-primary bg-primary/10' : 'border-outline-variant/30 text-on-surface hover:border-primary'
              }`}
            >
              Añadir Canción
            </button>
          )}
        </div>

        {activeSection === 'songs' && (
          <div className="space-y-5 mb-12">
            <div className="bg-surface-container-low border border-outline-variant/10 rounded-3xl p-5 md:p-6 ambient-shadow">
              <h3 className="font-serif text-2xl text-on-surface mb-4">Listado de Canciones</h3>

              <div className="flex flex-col gap-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
                  <input
                    type="text"
                    placeholder="Buscar por titulo o artista..."
                    value={songSearchTerm}
                    onChange={(e) => setSongSearchTerm(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-full pl-11 pr-4 py-3 text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <div className="relative">
                    <button
                      onClick={() => setOpenSongFilterDropdown(openSongFilterDropdown === 'ocasion' ? null : 'ocasion')}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                        songFilterOccasions.length > 0
                          ? 'bg-on-surface-variant/10 border-on-surface-variant text-on-surface-variant'
                          : 'bg-surface-container-lowest border-outline-variant/30 text-on-surface hover:border-on-surface-variant'
                      }`}
                    >
                      Ocasión {songFilterOccasions.length > 0 ? `(${songFilterOccasions.length})` : ''}
                    </button>
                    {openSongFilterDropdown === 'ocasion' && (
                      <div className="absolute top-full mt-1 left-0 bg-surface-container-low border border-outline-variant/30 rounded-xl shadow-lg z-50 min-w-max max-w-xs max-h-64 overflow-y-auto">
                        {OCCASIONS.map((occasion) => (
                          <button
                            key={occasion}
                            onClick={() => toggleSelection(occasion, songFilterOccasions, setSongFilterOccasions)}
                            className={`block w-full text-left px-4 py-2.5 border-b border-outline-variant/10 last:border-b-0 text-sm transition-colors ${
                              songFilterOccasions.includes(occasion)
                                ? 'bg-on-surface-variant/20 text-on-surface-variant font-semibold'
                                : 'text-on-surface hover:bg-surface-container/50'
                            }`}
                          >
                            {occasion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <button
                      onClick={() => setOpenSongFilterDropdown(openSongFilterDropdown === 'genero' ? null : 'genero')}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                        songFilterGenres.length > 0
                          ? 'bg-primary/10 border-primary text-primary'
                          : 'bg-surface-container-lowest border-outline-variant/30 text-on-surface hover:border-primary'
                      }`}
                    >
                      Género {songFilterGenres.length > 0 ? `(${songFilterGenres.length})` : ''}
                    </button>
                    {openSongFilterDropdown === 'genero' && (
                      <div className="absolute top-full mt-1 left-0 bg-surface-container-low border border-outline-variant/30 rounded-xl shadow-lg z-50 min-w-max max-w-xs max-h-64 overflow-y-auto">
                        {GENRES.map((genre) => (
                          <button
                            key={genre}
                            onClick={() => toggleSelection(genre, songFilterGenres, setSongFilterGenres)}
                            className={`block w-full text-left px-4 py-2.5 border-b border-outline-variant/10 last:border-b-0 text-sm transition-colors ${
                              songFilterGenres.includes(genre)
                                ? 'bg-primary/20 text-primary font-semibold'
                                : 'text-on-surface hover:bg-surface-container/50'
                            }`}
                          >
                            {genre}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <button
                      onClick={() => setOpenSongFilterDropdown(openSongFilterDropdown === 'artista' ? null : 'artista')}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                        songFilterArtists.length > 0
                          ? 'bg-error/10 border-error text-error'
                          : 'bg-surface-container-lowest border-outline-variant/30 text-on-surface hover:border-error'
                      }`}
                    >
                      Artista {songFilterArtists.length > 0 ? `(${songFilterArtists.length})` : ''}
                    </button>
                    {openSongFilterDropdown === 'artista' && (
                      <div className="absolute top-full mt-1 left-0 bg-surface-container-low border border-outline-variant/30 rounded-xl shadow-lg z-50 min-w-max max-w-xs max-h-64 overflow-y-auto">
                        {ARTISTS.map((artist) => (
                          <button
                            key={artist}
                            onClick={() => toggleSelection(artist, songFilterArtists, setSongFilterArtists)}
                            className={`block w-full text-left px-4 py-2.5 border-b border-outline-variant/10 last:border-b-0 text-sm transition-colors ${
                              songFilterArtists.includes(artist)
                                ? 'bg-error/20 text-error font-semibold'
                                : 'text-on-surface hover:bg-surface-container/50'
                            }`}
                          >
                            {artist}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {(songFilterGenres.length > 0 || songFilterOccasions.length > 0 || songFilterArtists.length > 0 || songSearchTerm) && (
                    <button
                      onClick={() => {
                        setSongSearchTerm('');
                        setSongFilterGenres([]);
                        setSongFilterOccasions([]);
                        setSongFilterArtists([]);
                      }}
                      className="px-3 py-2 rounded-full border border-outline-variant/30 text-on-surface-variant text-xs hover:text-on-surface"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
              </div>
            </div>

            {openSongFilterDropdown && <div className="fixed inset-0 z-40" onClick={() => setOpenSongFilterDropdown(null)} />}

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
              <div className="xl:col-span-2 bg-surface-container-lowest border border-outline-variant/10 rounded-3xl overflow-hidden ambient-shadow">
                <div className="px-5 py-3 border-b border-outline-variant/10 flex items-center justify-end gap-2">
                  <button
                    onClick={() => setSongViewMode('detailed')}
                    className={`p-2 rounded-lg border transition-colors ${
                      songViewMode === 'detailed'
                        ? 'border-primary text-primary bg-primary/10'
                        : 'border-outline-variant/30 text-on-surface-variant hover:text-on-surface'
                    }`}
                    title="Vista detallada"
                  >
                    <Grid3x3 size={16} />
                  </button>
                  <button
                    onClick={() => setSongViewMode('compact')}
                    className={`p-2 rounded-lg border transition-colors ${
                      songViewMode === 'compact'
                        ? 'border-primary text-primary bg-primary/10'
                        : 'border-outline-variant/30 text-on-surface-variant hover:text-on-surface'
                    }`}
                    title="Vista compacta"
                  >
                    <List size={16} />
                  </button>
                </div>

                {songViewMode === 'detailed' ? (
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-outline-variant/10">
                          <th className="py-5 px-6 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Canción</th>
                          <th className="py-5 px-6 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Filtros</th>
                          <th className="py-5 px-6 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Enlaces</th>
                          <th className="py-5 px-6 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadingSongs ? (
                          <tr>
                            <td colSpan={4} className="py-12 text-center text-on-surface-variant">Cargando canciones...</td>
                          </tr>
                        ) : songPagination.pageItems.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-12 text-center text-on-surface-variant">No se encontraron canciones con esos filtros.</td>
                          </tr>
                        ) : (
                          songPagination.pageItems.map((song, i) => {
                            const isInEventList = eventSelectionIds.includes(song.id);
                            return (
                              <tr key={song.id} className={i !== songPagination.pageItems.length - 1 ? 'border-b border-outline-variant/5' : ''}>
                                <td className="py-5 px-6">
                                  <p className="font-serif text-xl text-on-surface">{song.title}</p>
                                  <p className="text-[10px] text-primary uppercase tracking-wider mt-1">ARTISTA: {song.artist}</p>
                                </td>
                                <td className="py-5 px-6">
                                  <div className="flex flex-wrap gap-2 mb-2">
                                    {(song.genres || []).slice(0, 3).map((g, idx) => (
                                      <span key={`g-${idx}`} className="text-[9px] font-bold uppercase tracking-wider text-primary border border-primary/30 px-2 py-1 rounded-md bg-primary/5">{g}</span>
                                    ))}
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {(song.occasions || []).slice(0, 2).map((o, idx) => (
                                      <span key={`o-${idx}`} className="text-[9px] font-bold uppercase tracking-wider text-on-surface-variant border border-on-surface-variant/30 px-2 py-1 rounded-md bg-on-surface-variant/5">{o}</span>
                                    ))}
                                  </div>
                                </td>
                                <td className="py-5 px-6">
                                  <div className="flex flex-col gap-2 text-sm">
                                    {song.link ? (
                                      <a href={song.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-2">
                                        <LinkIcon size={14} /> Mega (notas)
                                      </a>
                                    ) : (
                                      <span className="text-on-surface-variant italic">Sin enlace Mega</span>
                                    )}
                                    {song.youtubeUrl ? (
                                      <a href={song.youtubeUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-2">
                                        <LinkIcon size={14} /> YouTube
                                      </a>
                                    ) : (
                                      <span className="text-on-surface-variant italic">Sin YouTube</span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-5 px-6">
                                  <div className="flex items-center justify-end gap-2 text-on-surface-variant">
                                    <button
                                      onClick={() => toggleEventSelectionSong(song.id)}
                                      className={`px-2 py-1 rounded border text-xs transition-colors ${
                                        isInEventList
                                          ? 'border-error/40 text-error hover:bg-error/10'
                                          : 'border-primary/40 text-primary hover:bg-primary/10'
                                      }`}
                                      title={isInEventList ? 'Quitar de mi lista' : 'Agregar a mi lista'}
                                    >
                                      {isInEventList ? 'Quitar' : 'Añadir'}
                                    </button>

                                    {role === 'admin' && (
                                      <>
                                        <button onClick={() => handleStartEditSong(song)} className="hover:text-primary transition-colors p-2" title="Editar canción">
                                          <Pencil size={16} />
                                        </button>
                                        <button onClick={() => handleDeleteSong(song.id)} className="hover:text-error transition-colors p-2" title="Eliminar canción">
                                          <Trash2 size={16} />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="divide-y divide-outline-variant/10">
                    {loadingSongs ? (
                      <div className="py-12 text-center text-on-surface-variant">Cargando canciones...</div>
                    ) : songPagination.pageItems.length === 0 ? (
                      <div className="py-12 text-center text-on-surface-variant">No se encontraron canciones con esos filtros.</div>
                    ) : (
                      songPagination.pageItems.map((song) => {
                        const isInEventList = eventSelectionIds.includes(song.id);
                        return (
                          <div key={song.id} className="px-4 py-3 flex items-center justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm md:text-base text-on-surface truncate">{song.title}</p>
                              <p className="text-[11px] text-on-surface-variant truncate">{song.artist}</p>
                              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                {(song.genres || []).slice(0, 2).map((g, idx) => (
                                  <span key={`cg-${idx}`} className="text-[9px] px-1.5 py-0.5 rounded border border-primary/30 text-primary bg-primary/5 uppercase">{g}</span>
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {song.link && (
                                <a href={song.link} target="_blank" rel="noopener noreferrer" className="px-2 py-1 rounded border border-primary/40 text-primary text-[11px] hover:bg-primary/10">
                                  Mega
                                </a>
                              )}
                              <button
                                onClick={() => toggleEventSelectionSong(song.id)}
                                className={`px-2 py-1 rounded border text-[11px] transition-colors ${
                                  isInEventList
                                    ? 'border-error/40 text-error hover:bg-error/10'
                                    : 'border-primary/40 text-primary hover:bg-primary/10'
                                }`}
                              >
                                {isInEventList ? 'Quitar' : 'Añadir'}
                              </button>
                              {role === 'admin' && (
                                <>
                                  <button onClick={() => handleStartEditSong(song)} className="p-1.5 text-on-surface-variant hover:text-primary" title="Editar">
                                    <Pencil size={15} />
                                  </button>
                                  <button onClick={() => handleDeleteSong(song.id)} className="p-1.5 text-on-surface-variant hover:text-error" title="Eliminar">
                                    <Trash2 size={15} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between px-5 py-4 border-t border-outline-variant/10">
                  <p className="text-xs text-on-surface-variant">
                    Mostrando {songPagination.pageItems.length} de {filteredSongs.length} canciones
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSongPage((p) => Math.max(1, p - 1))}
                      disabled={songPagination.currentPage <= 1}
                      className="px-2 py-1.5 rounded border border-outline-variant/30 text-on-surface disabled:opacity-40"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-xs text-on-surface">{songPagination.currentPage} / {songPagination.totalPages}</span>
                    <button
                      onClick={() => setSongPage((p) => Math.min(songPagination.totalPages, p + 1))}
                      disabled={songPagination.currentPage >= songPagination.totalPages}
                      className="px-2 py-1.5 rounded border border-outline-variant/30 text-on-surface disabled:opacity-40"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-surface-container-low border border-outline-variant/10 rounded-3xl p-4 md:p-5 ambient-shadow h-fit xl:sticky xl:top-28">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h4 className="font-serif text-xl text-on-surface">Mi Lista de Evento</h4>
                  <span className="text-xs px-2 py-1 rounded-full border border-primary/30 text-primary bg-primary/10">
                    {eventSelectionSongs.length}
                  </span>
                </div>

                {eventSelectionSongs.length === 0 ? (
                  <p className="text-sm text-on-surface-variant">Agrega canciones desde la tabla para preparar el setlist del evento.</p>
                ) : (
                  <>
                    <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
                      {eventSelectionSongs.map((song) => (
                        <div key={song.id} className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm text-on-surface font-medium leading-tight">{song.title}</p>
                              <p className="text-[11px] text-on-surface-variant">{song.artist}</p>
                            </div>
                            <button onClick={() => toggleEventSelectionSong(song.id)} className="text-on-surface-variant hover:text-error" title="Quitar">
                              <X size={14} />
                            </button>
                          </div>
                          <div className="mt-2">
                            {song.link ? (
                              <a href={song.link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1.5">
                                <LinkIcon size={12} /> Ver notas en Mega
                              </a>
                            ) : (
                              <p className="text-[11px] text-on-surface-variant italic">Sin enlace Mega</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 pt-3 border-t border-outline-variant/20 flex flex-col gap-2">
                      <button onClick={copyEventMegaLinks} className="w-full px-3 py-2 rounded-lg border border-primary/40 text-primary hover:bg-primary/10 text-sm flex items-center justify-center gap-2">
                        <Copy size={14} /> Copiar lista de enlaces
                      </button>
                      <button onClick={() => setEventSelectionIds([])} className="w-full px-3 py-2 rounded-lg border border-error/40 text-error hover:bg-error/10 text-sm">
                        Limpiar lista
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {activeSection === 'users' && role === 'admin' && (
          <div className="space-y-5 mb-12">
            <div className="bg-surface-container-low border border-outline-variant/10 rounded-3xl p-6 ambient-shadow">
              <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
                <h3 className="font-serif text-2xl text-on-surface">Administrar Usuarios</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setUserRoleFilter('musician')}
                    className={`px-3 py-2 rounded-lg border text-sm ${
                      userRoleFilter === 'musician' ? 'border-primary text-primary bg-primary/10' : 'border-outline-variant/30 text-on-surface'
                    }`}
                  >
                    Músicos
                  </button>
                  <button
                    onClick={() => setUserRoleFilter('admin')}
                    className={`px-3 py-2 rounded-lg border text-sm ${
                      userRoleFilter === 'admin' ? 'border-primary text-primary bg-primary/10' : 'border-outline-variant/30 text-on-surface'
                    }`}
                  >
                    Admin
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-surface-container-low border border-outline-variant/10 rounded-3xl p-6 ambient-shadow">
              <h4 className="font-semibold text-on-surface mb-4 flex items-center gap-2"><UserPlus size={16} /> Invitar Usuario</h4>
              <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input type="text" required value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} placeholder="Nombre" className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2 text-on-surface" />
                <input type="email" required value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value.toLowerCase() })} placeholder="correo@gmail.com" className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2 text-on-surface" />
                <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2 text-on-surface">
                  <option value="musician">Músico</option>
                  <option value="admin">Admin</option>
                </select>
                <button type="submit" className="gold-gradient text-on-primary rounded-xl px-4 py-2 font-bold">Enviar Invitación</button>
              </form>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <div className="bg-surface-container-low border border-outline-variant/10 rounded-2xl p-4">
                <h5 className="text-sm font-bold text-on-surface mb-3">Pendientes ({pendingByRole.length})</h5>
                <div className="space-y-2 min-h-52">
                  {pendingPagination.pageItems.length === 0 ? (
                    <p className="text-xs text-on-surface-variant">Sin invitaciones pendientes.</p>
                  ) : (
                    pendingPagination.pageItems.map((pendingUser) => (
                      <div key={pendingUser.id} className="bg-surface-container-lowest rounded-lg p-3 border border-outline-variant/20">
                        <p className="text-sm text-on-surface font-medium">{pendingUser.name}</p>
                        <p className="text-xs text-on-surface-variant">{pendingUser.email}</p>
                        <div className="mt-2 flex justify-end">
                          <button onClick={() => handleDiscardPendingUser(pendingUser)} className="text-xs px-2 py-1 rounded border border-error/40 text-error hover:bg-error/10">Descartar</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <button onClick={() => setPendingPage((p) => Math.max(1, p - 1))} disabled={pendingPagination.currentPage <= 1} className="px-2 py-1 rounded border border-outline-variant/30 disabled:opacity-40">Anterior</button>
                  <span>{pendingPagination.currentPage}/{pendingPagination.totalPages}</span>
                  <button onClick={() => setPendingPage((p) => Math.min(pendingPagination.totalPages, p + 1))} disabled={pendingPagination.currentPage >= pendingPagination.totalPages} className="px-2 py-1 rounded border border-outline-variant/30 disabled:opacity-40">Siguiente</button>
                </div>
              </div>

              <div className="bg-surface-container-low border border-outline-variant/10 rounded-2xl p-4">
                <h5 className="text-sm font-bold text-on-surface mb-3">Aceptados ({acceptedByRole.length})</h5>
                <div className="space-y-2 min-h-52">
                  {acceptedPagination.pageItems.length === 0 ? (
                    <p className="text-xs text-on-surface-variant">Sin usuarios aceptados.</p>
                  ) : (
                    acceptedPagination.pageItems.map((acceptedUser) => (
                      <div key={acceptedUser.id} className="bg-surface-container-lowest rounded-lg p-3 border border-outline-variant/20">
                        <p className="text-sm text-on-surface font-medium">{acceptedUser.name}</p>
                        <p className="text-xs text-on-surface-variant">{acceptedUser.email}</p>
                        <span className="mt-2 inline-flex text-[10px] px-2 py-1 rounded border border-primary/40 text-primary">Activo</span>
                      </div>
                    ))
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <button onClick={() => setAcceptedPage((p) => Math.max(1, p - 1))} disabled={acceptedPagination.currentPage <= 1} className="px-2 py-1 rounded border border-outline-variant/30 disabled:opacity-40">Anterior</button>
                  <span>{acceptedPagination.currentPage}/{acceptedPagination.totalPages}</span>
                  <button onClick={() => setAcceptedPage((p) => Math.min(acceptedPagination.totalPages, p + 1))} disabled={acceptedPagination.currentPage >= acceptedPagination.totalPages} className="px-2 py-1 rounded border border-outline-variant/30 disabled:opacity-40">Siguiente</button>
                </div>
              </div>

              <div className="bg-surface-container-low border border-outline-variant/10 rounded-2xl p-4">
                <h5 className="text-sm font-bold text-on-surface mb-3">Descartados ({rejectedByRole.length})</h5>
                <div className="space-y-2 min-h-52">
                  {rejectedPagination.pageItems.length === 0 ? (
                    <p className="text-xs text-on-surface-variant">Sin usuarios descartados.</p>
                  ) : (
                    rejectedPagination.pageItems.map((rejectedUser) => (
                      <div key={rejectedUser.id} className="bg-surface-container-lowest rounded-lg p-3 border border-outline-variant/20">
                        <p className="text-sm text-on-surface font-medium">{rejectedUser.name}</p>
                        <p className="text-xs text-on-surface-variant">{rejectedUser.email}</p>
                        <div className="mt-2 flex justify-end">
                          <button onClick={() => handleReinviteRejectedUser(rejectedUser)} className="text-xs px-2 py-1 rounded border border-primary/40 text-primary hover:bg-primary/10">Reinvitar</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <button onClick={() => setRejectedPage((p) => Math.max(1, p - 1))} disabled={rejectedPagination.currentPage <= 1} className="px-2 py-1 rounded border border-outline-variant/30 disabled:opacity-40">Anterior</button>
                  <span>{rejectedPagination.currentPage}/{rejectedPagination.totalPages}</span>
                  <button onClick={() => setRejectedPage((p) => Math.min(rejectedPagination.totalPages, p + 1))} disabled={rejectedPagination.currentPage >= rejectedPagination.totalPages} className="px-2 py-1 rounded border border-outline-variant/30 disabled:opacity-40">Siguiente</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'filters' && role === 'admin' && (
          <div className="mb-12">
            <div className="bg-surface-container-low border border-outline-variant/10 rounded-3xl p-6 mb-4 ambient-shadow">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-2xl text-on-surface">Gestionar Filtros</h3>
                <button onClick={() => setShowCatalogManager((v) => !v)} className="px-3 py-2 rounded-lg border border-outline-variant/30 text-sm text-on-surface hover:border-primary">
                  {showCatalogManager ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
            </div>

            {showCatalogManager && (
              <div className="bg-surface-container-low border border-outline-variant/10 rounded-3xl p-6 ambient-shadow">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  {(['genres', 'occasions', 'artists'] as const).map((type) => (
                    <div key={type} className="bg-surface-container-lowest border border-outline-variant/10 rounded-2xl p-4">
                      <h4 className="font-semibold text-on-surface mb-3 capitalize">
                        {type === 'genres' ? 'Géneros' : type === 'occasions' ? 'Ocasiones' : 'Artistas'}
                      </h4>
                      <div className="flex gap-2 mb-3">
                        <input
                          value={newCatalogValue[type]}
                          onChange={(e) => setNewCatalogValue((prev) => ({ ...prev, [type]: e.target.value }))}
                          placeholder={`Añadir ${type === 'genres' ? 'género' : type === 'occasions' ? 'ocasión' : 'artista'}`}
                          className="flex-1 bg-surface-container border border-outline-variant/20 rounded-lg px-3 py-2 text-sm text-on-surface"
                        />
                        <button onClick={() => handleAddCatalogValue(type)} className="px-3 py-2 rounded-lg border border-primary/40 text-primary hover:bg-primary/10">
                          <Plus size={16} />
                        </button>
                      </div>
                      <div className="max-h-64 overflow-auto custom-scrollbar space-y-2 pr-1">
                        {catalog[type].map((value) => (
                          <div key={value} className="flex items-center justify-between gap-2 bg-surface-container p-2 rounded-lg">
                            <span className="text-sm text-on-surface truncate">{value}</span>
                            <div className="flex items-center gap-1">
                              <button onClick={() => handleRenameCatalogValue(type, value)} className="p-1 text-on-surface-variant hover:text-primary" title="Renombrar">
                                <Pencil size={14} />
                              </button>
                              <button onClick={() => handleRemoveCatalogValue(type, value)} className="p-1 text-on-surface-variant hover:text-error" title="Eliminar">
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeSection === 'addSong' && role === 'admin' && (
          <div className="bg-surface-container-low border border-outline-variant/10 rounded-3xl p-8 mb-12 ambient-shadow">
            <h3 className="font-serif text-2xl text-on-surface mb-8">Añadir Nueva Canción</h3>
            <form onSubmit={handleAddSong} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-2">Título de la Canción</label>
                  <input type="text" required value={newSong.title} onChange={(e) => setNewSong({ ...newSong, title: e.target.value })} placeholder="Ej. El Rey" className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-4 py-3 text-on-surface" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-2">Artista / Compositor</label>
                  <input list="artists-catalog" type="text" required value={newSong.artist} onChange={(e) => setNewSong({ ...newSong, artist: e.target.value })} placeholder="Ej. José Alfredo Jiménez" className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-4 py-3 text-on-surface" />
                  <datalist id="artists-catalog">
                    {ARTISTS.map((artist) => <option key={artist} value={artist} />)}
                  </datalist>
                  {newSong.artist.trim() && !ARTISTS.some((a) => a.toLowerCase() === newSong.artist.trim().toLowerCase()) && (
                    <button type="button" onClick={() => handleQuickAddFromSongForm('artists', newSong.artist)} className="mt-2 text-xs text-primary hover:underline">
                      Registrar artista "{newSong.artist.trim()}"
                    </button>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-2">Enlace Mega</label>
                  <input type="url" value={newSong.link} onChange={(e) => setNewSong({ ...newSong, link: e.target.value })} placeholder="https://mega.nz/..." className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-4 py-3 text-on-surface" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-2">URL de YouTube</label>
                  <input type="url" value={newSong.youtubeUrl} onChange={(e) => setNewSong({ ...newSong, youtubeUrl: e.target.value })} placeholder="https://www.youtube.com/watch?v=..." className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-4 py-3 text-on-surface" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-4">Géneros</label>
                  <div className="mb-3 flex gap-2">
                    <input value={newSongGenreSearch} onChange={(e) => setNewSongGenreSearch(e.target.value)} placeholder="Buscar o crear género" className="flex-1 bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2 text-on-surface text-sm" />
                    {newSongGenreSearch.trim() && !GENRES.some((g) => g.toLowerCase() === newSongGenreSearch.trim().toLowerCase()) && (
                      <button type="button" onClick={() => handleQuickAddFromSongForm('genres', newSongGenreSearch)} className="px-3 py-2 rounded-xl border border-primary/40 text-primary text-xs">Crear</button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {filteredNewSongGenres.map((g) => (
                      <label key={g} className="flex items-center gap-2 text-sm text-on-surface-variant cursor-pointer">
                        <input type="checkbox" checked={newSongGenres.includes(g)} onChange={() => toggleSelection(g, newSongGenres, setNewSongGenres)} className="rounded border-outline-variant/30 text-primary focus:ring-primary bg-surface-container-lowest" /> {g}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-4">Ocasiones</label>
                  <div className="mb-3 flex gap-2">
                    <input value={newSongOccasionSearch} onChange={(e) => setNewSongOccasionSearch(e.target.value)} placeholder="Buscar o crear ocasión" className="flex-1 bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2 text-on-surface text-sm" />
                    {newSongOccasionSearch.trim() && !OCCASIONS.some((o) => o.toLowerCase() === newSongOccasionSearch.trim().toLowerCase()) && (
                      <button type="button" onClick={() => handleQuickAddFromSongForm('occasions', newSongOccasionSearch)} className="px-3 py-2 rounded-xl border border-primary/40 text-primary text-xs">Crear</button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {filteredNewSongOccasions.map((o) => (
                      <label key={o} className="flex items-center gap-2 text-sm text-on-surface-variant cursor-pointer">
                        <input type="checkbox" checked={newSongOccasions.includes(o)} onChange={() => toggleSelection(o, newSongOccasions, setNewSongOccasions)} className="rounded border-outline-variant/30 text-primary focus:ring-primary bg-surface-container-lowest" /> {o}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-6 border-t border-outline-variant/10">
                <button type="submit" disabled={newSongGenres.length === 0 || newSongOccasions.length === 0} className="gold-gradient text-on-primary px-8 py-3 font-bold rounded-xl hover:shadow-[0_0_20px_rgba(255,203,70,0.3)] transition-all disabled:opacity-50">
                  Guardar Canción
                </button>
              </div>
            </form>
          </div>
        )}

        {editingSong && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" onClick={() => setEditingSong(null)}>
            <div className="w-full max-w-3xl bg-surface-container-low rounded-2xl border border-outline-variant/20 p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-serif text-2xl text-on-surface">Editar Canción</h3>
                <button onClick={() => setEditingSong(null)} className="text-on-surface-variant hover:text-on-surface">
                  <X size={22} />
                </button>
              </div>

              <form onSubmit={handleSaveSongEdit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input type="text" value={editingSong.title} onChange={(e) => setEditingSong({ ...editingSong, title: e.target.value })} placeholder="Título" className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-4 py-3 text-on-surface" required />
                  <input type="text" value={editingSong.artist} onChange={(e) => setEditingSong({ ...editingSong, artist: e.target.value })} placeholder="Artista" className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-4 py-3 text-on-surface" required />
                  <input type="url" value={editingSong.link || ''} onChange={(e) => setEditingSong({ ...editingSong, link: e.target.value })} placeholder="Enlace Mega" className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-4 py-3 text-on-surface" />
                  <input type="url" value={editingSong.youtubeUrl || ''} onChange={(e) => setEditingSong({ ...editingSong, youtubeUrl: e.target.value })} placeholder="URL YouTube" className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-4 py-3 text-on-surface" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-on-surface-variant mb-2">Géneros</p>
                    <input value={editSongGenreSearch} onChange={(e) => setEditSongGenreSearch(e.target.value)} placeholder="Buscar género" className="w-full mb-2 bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2 text-on-surface text-sm" />
                    <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                      {filteredEditSongGenres.map((g) => (
                        <label key={g} className="flex items-center gap-2 text-sm text-on-surface-variant cursor-pointer">
                          <input type="checkbox" checked={editSongGenres.includes(g)} onChange={() => toggleSelection(g, editSongGenres, setEditSongGenres)} className="rounded border-outline-variant/30 text-primary focus:ring-primary bg-surface-container-lowest" /> {g}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-on-surface-variant mb-2">Ocasiones</p>
                    <input value={editSongOccasionSearch} onChange={(e) => setEditSongOccasionSearch(e.target.value)} placeholder="Buscar ocasión" className="w-full mb-2 bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2 text-on-surface text-sm" />
                    <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                      {filteredEditSongOccasions.map((o) => (
                        <label key={o} className="flex items-center gap-2 text-sm text-on-surface-variant cursor-pointer">
                          <input type="checkbox" checked={editSongOccasions.includes(o)} onChange={() => toggleSelection(o, editSongOccasions, setEditSongOccasions)} className="rounded border-outline-variant/30 text-primary focus:ring-primary bg-surface-container-lowest" /> {o}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-outline-variant/20">
                  <button type="button" onClick={() => setEditingSong(null)} disabled={isSavingEdit} className="px-4 py-2 rounded-lg border border-outline-variant/30 text-on-surface disabled:opacity-50 disabled:cursor-not-allowed">
                    Cancelar
                  </button>
                  <button type="submit" disabled={isSavingEdit} className="px-4 py-2 rounded-lg border border-primary/40 text-primary bg-primary/10 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                    {isSavingEdit ? "Guardando..." : <><Check size={16} /> Guardar cambios</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {activeSection === 'users' && role === 'admin' && (
          <div className="text-[11px] text-on-surface-variant mt-2 mb-8 flex items-start gap-2">
            <Users size={14} className="mt-[2px]" />
            <span>Esta sección separa usuarios por estado (Pendiente, Aceptado, Descartado), divididos por rol (Músico/Admin), con paginado independiente.</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
