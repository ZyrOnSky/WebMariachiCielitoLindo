import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, Trash2, Search, X, GripVertical, Music, PlayCircle,
  Cake, Heart, Star, Flame, Cross, User, Wine, PartyPopper,
  Guitar, Sparkles, ChevronDown, ChevronUp, Save, AlertTriangle,
  Check
} from 'lucide-react';
import { db } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';

interface Song {
  id: string;
  title: string;
  artist: string;
  genres: string[];
  occasions: string[];
  youtubeUrl?: string;
}

interface SimplifiedCategory {
  name: string;
  icon: string;
  songIds: string[];
  order: number;
}

interface SimplifiedConfig {
  categories: SimplifiedCategory[];
  updatedAt?: any;
  updatedBy?: string;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  music: <Music size={18} />,
  cake: <Cake size={18} />,
  heart: <Heart size={18} />,
  star: <Star size={18} />,
  flame: <Flame size={18} />,
  cross: <Cross size={18} />,
  user: <User size={18} />,
  wine: <Wine size={18} />,
  party: <PartyPopper size={18} />,
  guitar: <Guitar size={18} />,
  sparkles: <Sparkles size={18} />,
};

const ICON_OPTIONS = Object.keys(ICON_MAP);

const MAX_CATEGORIES = 15;
const MAX_SONGS_PER_CATEGORY = 12;

function normalizeString(str: string) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export default function AdminSimplifiedRepertoire({
  songs,
  occasions,
  genres,
  userId,
}: {
  songs: Song[];
  occasions: string[];
  genres: string[];
  userId: string;
}) {
  const [config, setConfig] = useState<SimplifiedConfig>({ categories: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<number | null>(null);
  const [songSearch, setSongSearch] = useState('');
  const [addCategoryMode, setAddCategoryMode] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('music');
  const [newCategorySource, setNewCategorySource] = useState<'occasion' | 'genre' | 'custom'>('occasion');

  // Default seed data — titles that we resolve to real song IDs
  const DEFAULT_SEED: { name: string; icon: string; songTitles: string[] }[] = [
    { name: "Ambientación", icon: "music", songTitles: ["Llamarada", "Mi Eterno Amor Secreto", "Sabes Una Cosa", "El triste", "Por el Camino", "Cómo Han Pasado Los Años", "Ya Lo Pasado Pasado", "De Qué Manera Te Olvido", "Despacito", "Collar de Lágrimas"] },
    { name: "Fiestas y Despedidas", icon: "party", songTitles: ["Hasta Las 6 De La Mañana", "Alta y Delgadita", "Pollera Colorada", "La Conga", "El Prendedor", "Muchacho Malo", "Es Mentiroso", "Si Una Vez", "A pesar de todo", "Que Agonia"] },
    { name: "Aniversarios y Románticas", icon: "heart", songTitles: ["Mi Eterno Amor Secreto", "El triste", "Veinticinco Rosas", "Por Debajo de la Mesa", "Malagueña", "La gloria eres tu", "Dulce Pecado", "Mi Mayor Anhelo", "Collar de Lágrimas", "Mía"] },
    { name: "Serenatas", icon: "guitar", songTitles: ["Júrame", "Sabes Una Cosa", "Sabor a Mí", "Secreto de Amor", "Por Una Mujer Bonita", "Canta, Canta", "La gloria eres tu", "El Amor Más Grande del Planeta", "Mi Mayor Anhelo", "Mía"] },
    { name: "Despecho", icon: "wine", songTitles: ["Llamarada", "El triste", "Que sufra, que chupe y que llore", "no sufrire por nadie", "De Qué Manera Te Olvido", "A pesar de todo", "Que Agonia", "Collar de Lágrimas", "Pa' Todo el Año", "Que Nadie Sepa Mi Sufrir"] },
    { name: "Día de la Madre", icon: "heart", songTitles: ["Mi Virgen Bella", "Hoy He Vuelto Madre a Recordar", "Cómo Han Pasado Los Años", "Algo de Mí Se Fue Contigo Madre", "Señora, Señora", "Yo Te Esperaba", "A La Sombra de Mi Madre", "El Amor Más Grande del Planeta", "La Niña de Tus Ojos", "Madre De Los Jóvenes"] },
    { name: "Bodas y Matrimonios", icon: "sparkles", songTitles: ["Qué Bonito Amor", "Reloj", "Por Debajo de la Mesa", "Yo Te Esperaba", "Sabor a Mí", "La gloria eres tu", "El Amor Más Grande del Planeta", "La Gloria de Dios", "Hermoso Cariño", "Dulce Pecado"] },
    { name: "Cumpleaños", icon: "cake", songTitles: ["Happy birthday", "Cómo Han Pasado Los Años", "Señora, Señora", "En Tu Día", "Yo Te Esperaba", "A La Sombra de Mi Madre", "Mi Viejo", "Yo Soy el Aventurero", "Hermoso Cariño", "Quinceañera"] },
    { name: "Música Cristiana/Católica", icon: "cross", songTitles: ["Mi Virgen Bella", "La Guadalupana", "Todopoderoso", "Josué 1:9", "Escalando Peldaños", "Ave María", "Santa María", "Dios Está Aquí", "La Niña de Tus Ojos", "La Gloria de Dios"] },
    { name: "Velorios y Sepelios", icon: "flame", songTitles: ["Vasija de Barro", "Hoy He Vuelto Madre a Recordar", "Algo de Mí Se Fue Contigo Madre", "Collar de Lágrimas", "Cuando Quería Ser Grande", "Mi Viejo", "A La Sombra de Mi Madre", "La Gloria de Dios", "Cuando un Amigo Se Va (Velorio)", "Madre De Los Jóvenes"] },
    { name: "Día del Padre", icon: "user", songTitles: ["Cuando Quería Ser Grande", "Mi Viejo", "La Niña de Tus Ojos", "Cómo Han Pasado Los Años", "Hoy He Vuelto Madre a Recordar", "El Rey", "Pa' Todo el Año", "Hermoso Cariño", "Por el Camino", "Yo Soy el Aventurero"] },
    { name: "Quinceañeras", icon: "star", songTitles: ["Quinceañera", "Yo Te Esperaba", "Hermoso Cariño", "Qué Bonito Amor", "Veinticinco Rosas", "Reloj", "Sabes Una Cosa", "Mi Eterno Amor Secreto", "La gloria eres tu", "Sabor a Mí"] },
    { name: "Graduaciones", icon: "sparkles", songTitles: ["Cómo Han Pasado Los Años", "El triste", "Sabes Una Cosa", "Malagueña", "La Fiesta del Mariachi", "Ya Lo Pasado Pasado", "Por el Camino", "Qué Bonito Amor", "Veinticinco Rosas", "Mi Eterno Amor Secreto"] },
  ];

  // Load config from Firestore — auto-seed if empty
  useEffect(() => {
    if (songs.length === 0) return; // Wait for songs to load first

    const loadConfig = async () => {
      try {
        const docRef = doc(db, 'simplified_repertoire', 'config');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setConfig(snap.data() as SimplifiedConfig);
        } else {
          // Auto-seed: resolve song titles → IDs from the real repertoire
          const seeded: SimplifiedCategory[] = DEFAULT_SEED.map((seed, idx) => {
            const resolvedIds: string[] = [];
            const seen = new Set<string>();

            for (const title of seed.songTitles) {
              const match = songs.find(s =>
                normalizeString(s.title) === normalizeString(title) && !seen.has(s.id)
              );
              if (match) {
                resolvedIds.push(match.id);
                seen.add(match.id);
              }
            }

            return {
              name: seed.name,
              icon: seed.icon,
              songIds: resolvedIds,
              order: idx,
            };
          });

          const seededConfig: SimplifiedConfig = { categories: seeded };
          setConfig(seededConfig);

          // Auto-save to Firestore so it persists
          await setDoc(docRef, {
            categories: seeded,
            updatedAt: serverTimestamp(),
            updatedBy: userId,
          });

          toast.success(`Repertorio simplificado inicializado con ${seeded.length} categorías y ${seeded.reduce((s, c) => s + c.songIds.length, 0)} canciones.`);
        }
      } catch (error) {
        console.error('Error loading simplified repertoire config:', error);
        toast.error('Error al cargar la configuración del repertorio simplificado.');
      } finally {
        setLoading(false);
      }
    };
    loadConfig();
  }, [songs.length]);

  // Save config to Firestore
  const handleSave = async () => {
    setSaving(true);
    try {
      const docRef = doc(db, 'simplified_repertoire', 'config');
      await setDoc(docRef, {
        categories: config.categories,
        updatedAt: serverTimestamp(),
        updatedBy: userId,
      });
      setHasChanges(false);
      toast.success('Repertorio simplificado guardado exitosamente.');
    } catch (error) {
      console.error('Error saving simplified repertoire:', error);
      toast.error('Error al guardar. Verifica tus permisos.');
    } finally {
      setSaving(false);
    }
  };

  // Available occasions/genres not yet used
  const usedNames = useMemo(() => new Set(config.categories.map(c => c.name)), [config.categories]);
  const availableOccasions = useMemo(() => occasions.filter(o => !usedNames.has(o)), [occasions, usedNames]);
  const availableGenres = useMemo(() => genres.filter(g => !usedNames.has(g)), [genres, usedNames]);

  // Songs lookup by ID
  const songsById = useMemo(() => {
    const map = new Map<string, Song>();
    songs.forEach(s => map.set(s.id, s));
    return map;
  }, [songs]);

  // Filtered songs for the picker
  const filteredSongsForPicker = useMemo(() => {
    if (!songSearch.trim()) return [];
    const normalized = normalizeString(songSearch);
    return songs.filter(s =>
      normalizeString(s.title).includes(normalized) ||
      normalizeString(s.artist).includes(normalized)
    ).slice(0, 20);
  }, [songs, songSearch]);

  const updateConfig = (newConfig: SimplifiedConfig) => {
    setConfig(newConfig);
    setHasChanges(true);
  };

  // Add a new category
  const handleAddCategory = () => {
    if (!newCategoryName.trim()) {
      toast.error('Ingresa un nombre para la categoría.');
      return;
    }
    if (usedNames.has(newCategoryName.trim())) {
      toast.error('Esa categoría ya existe.');
      return;
    }
    if (config.categories.length >= MAX_CATEGORIES) {
      toast.error(`Máximo ${MAX_CATEGORIES} categorías permitidas.`);
      return;
    }

    const newCategory: SimplifiedCategory = {
      name: newCategoryName.trim(),
      icon: newCategoryIcon,
      songIds: [],
      order: config.categories.length,
    };

    updateConfig({
      ...config,
      categories: [...config.categories, newCategory],
    });

    setNewCategoryName('');
    setNewCategoryIcon('music');
    setAddCategoryMode(false);
    setExpandedCategory(config.categories.length);
    toast.success(`Categoría "${newCategory.name}" añadida.`);
  };

  // Remove a category
  const handleRemoveCategory = (index: number) => {
    const cat = config.categories[index];
    const songCount = cat.songIds.length;

    if (!window.confirm(
      `¿Eliminar la categoría "${cat.name}"?\n\n` +
      (songCount > 0 ? `⚠️ Se perderán las ${songCount} canciones asociadas a esta categoría.` : 'No tiene canciones asociadas.')
    )) return;

    const updated = config.categories.filter((_, i) => i !== index).map((c, i) => ({ ...c, order: i }));
    updateConfig({ ...config, categories: updated });
    setExpandedCategory(null);
    toast.success(`Categoría "${cat.name}" eliminada.`);
  };

  // Move category (reorder)
  const handleMoveCategory = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= config.categories.length) return;

    const cats = [...config.categories];
    [cats[index], cats[target]] = [cats[target], cats[index]];
    cats.forEach((c, i) => c.order = i);
    updateConfig({ ...config, categories: cats });

    if (expandedCategory === index) setExpandedCategory(target);
    else if (expandedCategory === target) setExpandedCategory(index);
  };

  // Change category icon
  const handleChangeIcon = (index: number, icon: string) => {
    const cats = [...config.categories];
    cats[index] = { ...cats[index], icon };
    updateConfig({ ...config, categories: cats });
  };

  // Add song to a category
  const handleAddSongToCategory = (categoryIndex: number, songId: string) => {
    const cat = config.categories[categoryIndex];
    if (cat.songIds.length >= MAX_SONGS_PER_CATEGORY) {
      toast.error(`Máximo ${MAX_SONGS_PER_CATEGORY} canciones por categoría.`);
      return;
    }
    if (cat.songIds.includes(songId)) {
      toast.error('Esta canción ya está en la categoría.');
      return;
    }

    const cats = [...config.categories];
    cats[categoryIndex] = { ...cats[categoryIndex], songIds: [...cats[categoryIndex].songIds, songId] };
    updateConfig({ ...config, categories: cats });
    setSongSearch('');
  };

  // Remove song from a category
  const handleRemoveSongFromCategory = (categoryIndex: number, songId: string) => {
    const cats = [...config.categories];
    cats[categoryIndex] = {
      ...cats[categoryIndex],
      songIds: cats[categoryIndex].songIds.filter(id => id !== songId),
    };
    updateConfig({ ...config, categories: cats });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-surface-container-low border border-outline-variant/10 rounded-3xl p-5 md:p-6 ambient-shadow">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="font-serif text-2xl text-on-surface mb-1">Repertorio Simplificado</h3>
            <p className="text-sm text-on-surface-variant">
              Gestiona las categorías y canciones recomendadas que aparecen en la vista simplificada del repertorio público.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {hasChanges && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-xs text-primary font-bold uppercase tracking-wider"
              >
                Sin guardar
              </motion.span>
            )}
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all gold-gradient text-on-primary disabled:opacity-40 hover:opacity-90"
            >
              {saving ? (
                <div className="w-4 h-4 rounded-full border-2 border-on-primary border-t-transparent animate-spin" />
              ) : (
                <Save size={16} />
              )}
              Guardar
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          <div className="bg-surface-container-lowest rounded-xl p-3 border border-outline-variant/10 text-center">
            <span className="text-2xl font-serif text-on-surface block">{config.categories.length}</span>
            <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Categorías</span>
          </div>
          <div className="bg-surface-container-lowest rounded-xl p-3 border border-outline-variant/10 text-center">
            <span className="text-2xl font-serif text-on-surface block">{config.categories.reduce((sum, c) => sum + c.songIds.length, 0)}</span>
            <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Canciones Total</span>
          </div>
          <div className="bg-surface-container-lowest rounded-xl p-3 border border-outline-variant/10 text-center col-span-2 sm:col-span-1">
            <span className="text-2xl font-serif text-on-surface block">{MAX_CATEGORIES - config.categories.length}</span>
            <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Disponibles</span>
          </div>
        </div>

        {/* Add Category Button */}
        {config.categories.length < MAX_CATEGORIES && (
          <>
            {!addCategoryMode ? (
              <button
                onClick={() => setAddCategoryMode(true)}
                className="w-full border-2 border-dashed border-primary/30 rounded-2xl py-4 text-primary hover:bg-primary/5 hover:border-primary/50 transition-all flex items-center justify-center gap-2 text-sm font-bold"
              >
                <Plus size={18} /> Añadir Categoría
              </button>
            ) : (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="border border-primary/30 rounded-2xl p-5 bg-primary/5"
              >
                <h4 className="text-sm font-bold text-on-surface mb-4 uppercase tracking-wider">Nueva Categoría</h4>

                {/* Source selector */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    { key: 'occasion' as const, label: 'Ocasión' },
                    { key: 'genre' as const, label: 'Género' },
                    { key: 'custom' as const, label: 'Personalizado' },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => { setNewCategorySource(key); setNewCategoryName(''); }}
                      className={`py-2 rounded-lg text-xs font-bold transition-all ${newCategorySource === key
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container-lowest border border-outline-variant/20 text-on-surface-variant hover:border-primary'
                        }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Name from existing list or custom */}
                {newCategorySource === 'custom' ? (
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Nombre de la categoría..."
                    maxLength={60}
                    className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-4 py-3 text-on-surface text-sm mb-4"
                  />
                ) : (
                  <div className="max-h-40 overflow-y-auto mb-4 border border-outline-variant/10 rounded-xl bg-surface-container-lowest">
                    {(newCategorySource === 'occasion' ? availableOccasions : availableGenres).length === 0 ? (
                      <p className="text-xs text-on-surface-variant py-4 text-center">No hay opciones disponibles.</p>
                    ) : (
                      (newCategorySource === 'occasion' ? availableOccasions : availableGenres).map((item) => (
                        <button
                          key={item}
                          onClick={() => setNewCategoryName(item)}
                          className={`block w-full text-left px-4 py-2.5 text-sm border-b border-outline-variant/5 last:border-b-0 transition-colors ${newCategoryName === item
                            ? 'bg-primary/10 text-primary font-bold'
                            : 'text-on-surface hover:bg-surface-container/50'
                            }`}
                        >
                          {item}
                        </button>
                      ))
                    )}
                  </div>
                )}

                {/* Icon Picker */}
                <div className="mb-4">
                  <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-2">Icono</span>
                  <div className="flex flex-wrap gap-2">
                    {ICON_OPTIONS.map((iconKey) => (
                      <button
                        key={iconKey}
                        onClick={() => setNewCategoryIcon(iconKey)}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${newCategoryIcon === iconKey
                          ? 'bg-primary text-on-primary scale-110 shadow-md'
                          : 'bg-surface-container-lowest border border-outline-variant/20 text-on-surface-variant hover:border-primary hover:text-primary'
                          }`}
                        title={iconKey}
                      >
                        {ICON_MAP[iconKey]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleAddCategory}
                    disabled={!newCategoryName.trim()}
                    className="flex-1 py-2.5 rounded-xl font-bold text-sm gold-gradient text-on-primary disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    <Plus size={16} /> Crear
                  </button>
                  <button
                    onClick={() => { setAddCategoryMode(false); setNewCategoryName(''); }}
                    className="px-4 py-2.5 rounded-xl font-bold text-sm border border-outline-variant/30 text-on-surface-variant hover:border-error hover:text-error transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>

      {/* Categories List */}
      <div className="space-y-3">
        {config.categories.map((category, idx) => {
          const isExpanded = expandedCategory === idx;
          const categorySongs = category.songIds.map(id => songsById.get(id)).filter(Boolean) as Song[];
          const orphanedSongIds = category.songIds.filter(id => !songsById.has(id));

          return (
            <div
              key={`${category.name}-${idx}`}
              className={`bg-surface-container-low border rounded-2xl overflow-hidden transition-all ${isExpanded ? 'border-primary/40 shadow-lg' : 'border-outline-variant/10'
                }`}
            >
              {/* Category Header */}
              <div className="flex items-center gap-3 p-4">
                <div className="flex flex-col gap-1 mr-1">
                  <button
                    onClick={() => handleMoveCategory(idx, 'up')}
                    disabled={idx === 0}
                    className="text-on-surface-variant/40 hover:text-primary disabled:opacity-30 transition-colors"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    onClick={() => handleMoveCategory(idx, 'down')}
                    disabled={idx === config.categories.length - 1}
                    className="text-on-surface-variant/40 hover:text-primary disabled:opacity-30 transition-colors"
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>

                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isExpanded ? 'bg-primary text-on-primary' : 'bg-surface-container-highest text-primary'}`}>
                  {ICON_MAP[category.icon] || <Music size={18} />}
                </div>

                <button
                  onClick={() => setExpandedCategory(isExpanded ? null : idx)}
                  className="flex-1 text-left min-w-0"
                >
                  <h4 className="font-serif text-base sm:text-lg font-bold text-on-surface truncate">
                    {category.name}
                  </h4>
                  <p className="text-xs text-on-surface-variant">
                    {category.songIds.length}/{MAX_SONGS_PER_CATEGORY} canciones
                  </p>
                </button>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {orphanedSongIds.length > 0 && (
                    <span className="text-xs text-error flex items-center gap-1" title="Canciones huérfanas (eliminadas del repertorio)">
                      <AlertTriangle size={14} /> {orphanedSongIds.length}
                    </span>
                  )}
                  <button
                    onClick={() => setExpandedCategory(isExpanded ? null : idx)}
                    className={`p-2 rounded-lg transition-all ${isExpanded ? 'text-primary' : 'text-on-surface-variant'}`}
                  >
                    <ChevronDown size={18} className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>
                  <button
                    onClick={() => handleRemoveCategory(idx)}
                    className="p-2 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-colors"
                    title="Eliminar categoría"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Expanded Content */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-outline-variant/10"
                  >
                    <div className="p-4 space-y-4">
                      {/* Icon Picker (inline) */}
                      <div>
                        <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block mb-2">Icono</span>
                        <div className="flex flex-wrap gap-1.5">
                          {ICON_OPTIONS.map((iconKey) => (
                            <button
                              key={iconKey}
                              onClick={() => handleChangeIcon(idx, iconKey)}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${category.icon === iconKey
                                ? 'bg-primary text-on-primary'
                                : 'bg-surface-container-lowest border border-outline-variant/10 text-on-surface-variant hover:border-primary hover:text-primary'
                                }`}
                            >
                              {ICON_MAP[iconKey]}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Current Songs */}
                      <div>
                        <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block mb-2">
                          Canciones ({categorySongs.length}/{MAX_SONGS_PER_CATEGORY})
                        </span>
                        {categorySongs.length === 0 && orphanedSongIds.length === 0 ? (
                          <p className="text-xs text-on-surface-variant/60 py-3 text-center italic">Sin canciones asignadas</p>
                        ) : (
                          <div className="space-y-1.5">
                            {categorySongs.map((song) => (
                              <div
                                key={song.id}
                                className="flex items-center justify-between gap-2 bg-surface-container-lowest rounded-xl px-3 py-2.5 border border-outline-variant/5 group"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <Music size={14} className="text-primary flex-shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-sm text-on-surface font-medium truncate">{song.title}</p>
                                    <p className="text-[10px] text-on-surface-variant truncate">{song.artist}</p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleRemoveSongFromCategory(idx, song.id)}
                                  className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                                  title="Quitar canción"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ))}

                            {/* Orphaned songs warning */}
                            {orphanedSongIds.map((orphanId) => (
                              <div
                                key={orphanId}
                                className="flex items-center justify-between gap-2 bg-error/5 rounded-xl px-3 py-2.5 border border-error/20"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <AlertTriangle size={14} className="text-error flex-shrink-0" />
                                  <p className="text-xs text-error">Canción eliminada del repertorio</p>
                                </div>
                                <button
                                  onClick={() => handleRemoveSongFromCategory(idx, orphanId)}
                                  className="p-1.5 text-error hover:bg-error/20 rounded-lg transition-colors flex-shrink-0"
                                  title="Remover referencia huérfana"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Add Songs Picker */}
                      {category.songIds.length < MAX_SONGS_PER_CATEGORY && (
                        <div>
                          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block mb-2">Buscar y Añadir Canción</span>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={16} />
                            <input
                              type="text"
                              value={songSearch}
                              onChange={(e) => setSongSearch(e.target.value)}
                              placeholder="Buscar por título o artista..."
                              className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl pl-10 pr-4 py-2.5 text-sm text-on-surface"
                            />
                            {songSearch && (
                              <button
                                onClick={() => setSongSearch('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>

                          {/* Search Results */}
                          {songSearch.trim() && (
                            <div className="mt-2 max-h-52 overflow-y-auto border border-outline-variant/10 rounded-xl bg-surface-container-lowest">
                              {filteredSongsForPicker.length === 0 ? (
                                <p className="text-xs text-on-surface-variant py-4 text-center">No se encontraron resultados.</p>
                              ) : (
                                filteredSongsForPicker.map((song) => {
                                  const alreadyAdded = category.songIds.includes(song.id);
                                  return (
                                    <button
                                      key={song.id}
                                      onClick={() => !alreadyAdded && handleAddSongToCategory(idx, song.id)}
                                      disabled={alreadyAdded}
                                      className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 border-b border-outline-variant/5 last:border-0 text-left transition-colors ${alreadyAdded
                                        ? 'opacity-40 cursor-not-allowed bg-primary/5'
                                        : 'hover:bg-primary/5 cursor-pointer'
                                        }`}
                                    >
                                      <div className="min-w-0">
                                        <p className="text-sm text-on-surface font-medium truncate">{song.title}</p>
                                        <p className="text-[10px] text-on-surface-variant truncate">{song.artist}</p>
                                      </div>
                                      {alreadyAdded ? (
                                        <Check size={16} className="text-primary flex-shrink-0" />
                                      ) : (
                                        <Plus size={16} className="text-primary flex-shrink-0" />
                                      )}
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {config.categories.length === 0 && (
          <div className="text-center py-16 text-on-surface-variant">
            <Music size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-lg font-serif mb-2">No hay categorías configuradas</p>
            <p className="text-sm">Añade categorías desde ocasiones o géneros para comenzar a curar el repertorio simplificado.</p>
          </div>
        )}
      </div>
    </div>
  );
}
