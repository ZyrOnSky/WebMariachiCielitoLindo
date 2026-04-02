import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Search, Lock, Plus, ListMusic, Trash2, Phone, Music, Copy, Check, PlayCircle, X, Sliders, CheckSquare2, Grid3x3, List } from 'lucide-react';
import { ViewState } from '../types';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

interface Song {
  id: string;
  title: string;
  artist: string;
  genres: string[];
  occasions: string[];
  link?: string;
  youtubeUrl?: string;
}

function extractYouTubeId(url?: string) {
  if (!url) return null;
  try {
    const parsed = new URL(url);

    if (parsed.hostname.includes('youtu.be')) {
      return parsed.pathname.replace('/', '').trim() || null;
    }

    if (parsed.hostname.includes('youtube.com')) {
      const fromQuery = parsed.searchParams.get('v');
      if (fromQuery) return fromQuery;

      const pathParts = parsed.pathname.split('/').filter(Boolean);
      const embedIndex = pathParts.findIndex(part => part === 'embed' || part === 'shorts');
      if (embedIndex !== -1 && pathParts[embedIndex + 1]) {
        return pathParts[embedIndex + 1];
      }
    }

    return null;
  } catch {
    return null;
  }
}

function getPaginationArray(current: number, total: number): (number | string)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | string)[] = [1];
  let start = Math.max(2, current - 1);
  let end = Math.min(total - 1, current + 1);

  if (current <= 3) {
    end = 4;
  }
  
  if (current >= total - 2) {
    start = total - 3;
  }

  if (start > 2) {
    pages.push('...');
  }

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (end < total - 1) {
    pages.push('...');
  }

  pages.push(total);
  return pages;
}

export default function RepertoireView({
  setView: _setView,
  onYoutubePlayerStateChange,
}: {
  setView: (v: ViewState) => void;
  onYoutubePlayerStateChange?: (isOpen: boolean) => void;
  key?: string;
}) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [selected, setSelected] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedOccasions, setSelectedOccasions] = useState<string[]>([]);
  const [selectedArtists, setSelectedArtists] = useState<string[]>([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [hasCopied, setHasCopied] = useState(false);
  const [playingSong, setPlayingSong] = useState<Song | null>(null);

  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [genreSearch, setGenreSearch] = useState('');
  const [occasionSearch, setOccasionSearch] = useState('');
  const [artistSearch, setArtistSearch] = useState('');
  const [openDropdown, setOpenDropdown] = useState<'ocasion' | 'genero' | 'artista' | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [expandedSongList, setExpandedSongList] = useState<Song | null>(null);

  const itemsPerPage = windowWidth >= 1536 ? 12 : windowWidth >= 1280 ? 8 : 6;

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedGenres, selectedOccasions, selectedArtists]);

  useEffect(() => {
    const q = query(collection(db, 'songs'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedSongs: Song[] = [];
        snapshot.forEach((doc) => {
          fetchedSongs.push({ id: doc.id, ...doc.data() } as Song);
        });
        setSongs(fetchedSongs);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'songs');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    onYoutubePlayerStateChange?.(Boolean(playingSong));
    return () => onYoutubePlayerStateChange?.(false);
  }, [playingSong, onYoutubePlayerStateChange]);

  useEffect(() => {
    if (!showAdvancedFilter) return;

    const scrollY = window.scrollY;
    const { style } = document.body;
    const previousOverflow = style.overflow;
    const previousPosition = style.position;
    const previousTop = style.top;
    const previousWidth = style.width;

    style.overflow = 'hidden';
    style.position = 'fixed';
    style.top = `-${scrollY}px`;
    style.width = '100%';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowAdvancedFilter(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      style.overflow = previousOverflow;
      style.position = previousPosition;
      style.top = previousTop;
      style.width = previousWidth;
      window.scrollTo(0, scrollY);
    };
  }, [showAdvancedFilter]);

  const toggleSelection = (item: string, list: string[], setList: (l: string[]) => void) => {
    if (list.includes(item)) {
      setList(list.filter((i) => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  const toggleSong = (song: Song) => {
    if (selected.some((s) => s.id === song.id)) {
      setSelected(selected.filter((s) => s.id !== song.id));
    } else {
      setSelected([...selected, song]);
    }
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedGenres([]);
    setSelectedOccasions([]);
    setSelectedArtists([]);
    setCurrentPage(1);
  };

  const getSortedGenres = (genres: string[] = []) => {
    if (selectedGenres.length === 0) return genres;
    const matching = genres.filter((g) => selectedGenres.includes(g));
    const others = genres.filter((g) => !selectedGenres.includes(g));
    return [...matching, ...others];
  };

  const getSortedOccasions = (occasions: string[] = []) => {
    if (selectedOccasions.length === 0) return occasions;
    const matching = occasions.filter((o) => selectedOccasions.includes(o));
    const others = occasions.filter((o) => !selectedOccasions.includes(o));
    return [...matching, ...others];
  };

  // Funciones para obtener géneros/ocasiones filtrados y limitados según filtros activos
  const getDisplayedGenres = (genres: string[] = [], limit = 2) => {
    const sorted = getSortedGenres(genres);
    if (selectedGenres.length > 0) {
      // Mostrar solo los que coinciden con el filtro
      return sorted.filter((g) => selectedGenres.includes(g)).slice(0, limit);
    }
    return sorted.slice(0, limit);
  };

  const getDisplayedOccasions = (occasions: string[] = [], limit = 2) => {
    const sorted = getSortedOccasions(occasions);
    if (selectedOccasions.length > 0) {
      // Mostrar solo los que coinciden con el filtro
      return sorted.filter((o) => selectedOccasions.includes(o)).slice(0, limit);
    }
    return sorted.slice(0, limit);
  };

  // Versiones expandidas para el modal (hasta 3 items)
  const getDisplayedGenresExpanded = (genres: string[] = []) => getDisplayedGenres(genres, 3);
  const getDisplayedOccasionsExpanded = (occasions: string[] = []) => getDisplayedOccasions(occasions, 3);

  // Contar etiquetas ocultas en modo tarjeta (limit = 2)
  const getHiddenGenresCount = (genres: string[] = []) => {
    const displayed = getDisplayedGenres(genres, 2);
    const sorted = getSortedGenres(genres);
    const filtered = selectedGenres.length > 0 
      ? sorted.filter((g) => selectedGenres.includes(g))
      : sorted;
    return Math.max(0, filtered.length - displayed.length);
  };

  const getHiddenOccasionsCount = (occasions: string[] = []) => {
    const displayed = getDisplayedOccasions(occasions, 2);
    const sorted = getSortedOccasions(occasions);
    const filtered = selectedOccasions.length > 0 
      ? sorted.filter((o) => selectedOccasions.includes(o))
      : sorted;
    return Math.max(0, filtered.length - displayed.length);
  };

  // Contar etiquetas ocultas en modo expandido (limit = 3)
  const getHiddenGenresCountExpanded = (genres: string[] = []) => {
    const displayed = getDisplayedGenresExpanded(genres);
    const sorted = getSortedGenres(genres);
    const filtered = selectedGenres.length > 0 
      ? sorted.filter((g) => selectedGenres.includes(g))
      : sorted;
    return Math.max(0, filtered.length - displayed.length);
  };

  const getHiddenOccasionsCountExpanded = (occasions: string[] = []) => {
    const displayed = getDisplayedOccasionsExpanded(occasions);
    const sorted = getSortedOccasions(occasions);
    const filtered = selectedOccasions.length > 0 
      ? sorted.filter((o) => selectedOccasions.includes(o))
      : sorted;
    return Math.max(0, filtered.length - displayed.length);
  };

  const allGenres: string[] = Array.from(new Set<string>(songs.flatMap((s) => s.genres || []))).sort();
  const allOccasions: string[] = Array.from(new Set<string>(songs.flatMap((s) => s.occasions || []))).sort();
  const allArtists: string[] = Array.from(new Set<string>(songs.map((s) => s.artist).filter(Boolean))).sort();

  const filteredGenres = allGenres.filter((g: string) => g.toLowerCase().includes(genreSearch.toLowerCase()));
  const filteredOccasions = allOccasions.filter((o: string) => o.toLowerCase().includes(occasionSearch.toLowerCase()));
  const filteredArtists = allArtists.filter((a: string) => a.toLowerCase().includes(artistSearch.toLowerCase()));

  const getTopOptions = (values: string[], topN = 6) => {
    const counts = new Map<string, number>();
    values.forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([value]) => value);
  };

  const quickOccasions = getTopOptions(songs.flatMap((s) => s.occasions || []), 6);
  const quickGenres = getTopOptions(songs.flatMap((s) => s.genres || []), 6);

  const toggleQuickSingle = (value: string, list: string[], setList: (l: string[]) => void) => {
    if (list.length === 1 && list[0] === value) {
      setList([]);
      return;
    }
    setList([value]);
  };

  const filteredSongs = songs.filter((song) => {
    const matchesSearch =
      song.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      song.artist.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGenre = selectedGenres.length === 0 || (song.genres && song.genres.some((g) => selectedGenres.includes(g)));
    const matchesOccasion = selectedOccasions.length === 0 || (song.occasions && song.occasions.some((o) => selectedOccasions.includes(o)));
    const matchesArtist = selectedArtists.length === 0 || selectedArtists.includes(song.artist);

    return matchesSearch && matchesGenre && matchesOccasion && matchesArtist;
  });

  const totalPages = Math.ceil(filteredSongs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedSongs = filteredSongs.slice(startIndex, startIndex + itemsPerPage);
  const playingYouTubeId = extractYouTubeId(playingSong?.youtubeUrl);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="pt-24 sm:pt-28 md:pt-32 pb-20 sm:pb-24 px-3 sm:px-5 md:px-6 lg:px-8 xl:px-10 2xl:px-12 min-h-screen bg-surface"
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_360px] 2xl:grid-cols-[1fr_380px] gap-4 sm:gap-6 md:gap-8 lg:gap-10 max-w-full">
        <div className="min-w-0 order-1 lg:order-1">
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-6xl xl:text-7xl mb-4 sm:mb-5 md:mb-6 text-primary leading-tight">
            Nuestro <br />Repertorio
          </h1>
          <p className="text-on-surface-variant font-light text-base sm:text-lg md:text-base lg:text-lg max-w-2xl mb-8 sm:mb-10 md:mb-12 leading-relaxed">
            Explore nuestra curada seleccion de piezas maestras. Anada sus favoritas a su lista personalizada para solicitar una cotizacion detallada.
          </p>

          <div className="flex flex-col gap-3 sm:gap-4 mb-6 sm:mb-8">
            <div className="flex gap-2 items-center flex-wrap sm:flex-nowrap">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
                <input
                  type="text"
                  placeholder="Buscar por titulo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-full py-2 sm:py-3 pl-10 sm:pl-12 pr-3 sm:pr-4 text-xs sm:text-sm md:text-base text-on-surface focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              <button
                onClick={() => setShowAdvancedFilter(true)}
                className="px-3 sm:px-4 py-2 sm:py-3 bg-surface-container-low border border-outline-variant/30 rounded-full text-on-surface hover:border-primary hover:text-primary transition-colors flex items-center gap-1 sm:gap-2 text-xs sm:text-sm font-medium whitespace-nowrap"
                title="Abrir filtro avanzado"
              >
                <Sliders size={16} /> <span className="hidden sm:inline">Filtro</span>
              </button>

              {(searchTerm || selectedGenres.length > 0 || selectedOccasions.length > 0 || selectedArtists.length > 0) && (
                <button
                  onClick={clearAllFilters}
                  className="px-2.5 sm:px-4 py-2 sm:py-3 bg-surface-container-low border border-outline-variant/30 rounded-full text-on-surface-variant hover:border-error hover:text-error transition-colors text-xs sm:text-sm font-medium"
                  title="Limpiar filtros"
                >
                  <X size={16} />
                </button>
              )}

              <div className="flex gap-1.5 ml-auto">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-2 sm:px-3 py-2 sm:py-3 rounded-full transition-colors border ${
                    viewMode === 'grid'
                      ? 'bg-primary text-on-primary border-primary'
                      : 'bg-surface-container-low border-outline-variant/30 text-on-surface hover:border-primary hover:text-primary'
                  } flex items-center gap-1 sm:gap-2 text-xs sm:text-sm font-medium`}
                  title="Vista de tarjetas"
                >
                  <Grid3x3 size={16} />
                  <span className="hidden sm:inline">Tarjetas</span>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-2 sm:px-3 py-2 sm:py-3 rounded-full transition-colors border ${
                    viewMode === 'list'
                      ? 'bg-primary text-on-primary border-primary'
                      : 'bg-surface-container-low border-outline-variant/30 text-on-surface hover:border-primary hover:text-primary'
                  } flex items-center gap-1 sm:gap-2 text-xs sm:text-sm font-medium`}
                  title="Vista de lista"
                >
                  <List size={16} />
                  <span className="hidden sm:inline">Lista</span>
                </button>
              </div>
            </div>

            {!loading && (quickOccasions.length > 0 || quickGenres.length > 0 || allArtists.length > 0) && (
              <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                {/* Dropdown Ocasión */}
                <div className="relative">
                  <button
                    onClick={() => setOpenDropdown(openDropdown === 'ocasion' ? null : 'ocasion')}
                    className={`px-3 sm:px-4 py-2 sm:py-3 rounded-full text-xs sm:text-sm font-medium transition-all border ${
                      selectedOccasions.length > 0
                        ? 'bg-on-surface-variant/10 border-on-surface-variant text-on-surface-variant'
                        : 'bg-surface-container-low border-outline-variant/30 text-on-surface hover:border-primary'
                    } flex items-center gap-1.5 whitespace-nowrap`}
                  >
                    <Music size={14} />
                    Ocasión
                    {selectedOccasions.length > 0 && <span className="text-[10px] font-bold">{selectedOccasions.length}</span>}
                  </button>
                  {openDropdown === 'ocasion' && (
                    <div className="absolute top-full mt-1 left-0 bg-surface-container-low border border-outline-variant/30 rounded-xl shadow-lg z-50 min-w-max max-w-xs max-h-64 overflow-y-auto">
                      {allOccasions.map((occasion) => (
                        <button
                          key={occasion}
                          onClick={() => {
                            toggleQuickSingle(occasion, selectedOccasions, setSelectedOccasions);
                            setOpenDropdown(null);
                          }}
                          className={`block w-full text-left px-3 sm:px-4 py-2 sm:py-2.5 border-b border-outline-variant/10 last:border-b-0 text-xs sm:text-sm transition-colors ${
                            selectedOccasions.includes(occasion)
                              ? 'bg-on-surface-variant/20 text-on-surface font-semibold'
                              : 'text-on-surface hover:bg-surface-container/50'
                          }`}
                        >
                          {occasion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Dropdown Género */}
                <div className="relative">
                  <button
                    onClick={() => setOpenDropdown(openDropdown === 'genero' ? null : 'genero')}
                    className={`px-3 sm:px-4 py-2 sm:py-3 rounded-full text-xs sm:text-sm font-medium transition-all border ${
                      selectedGenres.length > 0
                        ? 'bg-primary/10 border-primary text-primary'
                        : 'bg-surface-container-low border-outline-variant/30 text-on-surface hover:border-primary'
                    } flex items-center gap-1.5 whitespace-nowrap`}
                  >
                    <ListMusic size={14} />
                    Género
                    {selectedGenres.length > 0 && <span className="text-[10px] font-bold">{selectedGenres.length}</span>}
                  </button>
                  {openDropdown === 'genero' && (
                    <div className="absolute top-full mt-1 left-0 bg-surface-container-low border border-outline-variant/30 rounded-xl shadow-lg z-50 min-w-max max-w-xs max-h-64 overflow-y-auto">
                      {allGenres.map((genre) => (
                        <button
                          key={genre}
                          onClick={() => {
                            toggleQuickSingle(genre, selectedGenres, setSelectedGenres);
                            setOpenDropdown(null);
                          }}
                          className={`block w-full text-left px-3 sm:px-4 py-2 sm:py-2.5 border-b border-outline-variant/10 last:border-b-0 text-xs sm:text-sm transition-colors ${
                            selectedGenres.includes(genre)
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

                {/* Dropdown Artista */}
                <div className="relative">
                  <button
                    onClick={() => setOpenDropdown(openDropdown === 'artista' ? null : 'artista')}
                    className={`px-3 sm:px-4 py-2 sm:py-3 rounded-full text-xs sm:text-sm font-medium transition-all border ${
                      selectedArtists.length > 0
                        ? 'bg-error/10 border-error text-error'
                        : 'bg-surface-container-low border-outline-variant/30 text-on-surface hover:border-error'
                    } flex items-center gap-1.5 whitespace-nowrap`}
                  >
                    <Music size={14} />
                    Artista
                    {selectedArtists.length > 0 && <span className="text-[10px] font-bold">{selectedArtists.length}</span>}
                  </button>
                  {openDropdown === 'artista' && (
                    <div className="absolute top-full mt-1 left-0 bg-surface-container-low border border-outline-variant/30 rounded-xl shadow-lg z-50 min-w-max max-w-xs max-h-64 overflow-y-auto">
                      {allArtists.map((artist) => (
                        <button
                          key={artist}
                          onClick={() => {
                            toggleQuickSingle(artist, selectedArtists, setSelectedArtists);
                            setOpenDropdown(null);
                          }}
                          className={`block w-full text-left px-3 sm:px-4 py-2 sm:py-2.5 border-b border-outline-variant/10 last:border-b-0 text-xs sm:text-sm transition-colors ${
                            selectedArtists.includes(artist)
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
              </div>
            )}

            {/* Dropdown Close Handler - click outside */}
            {openDropdown && (
              <div
                className="fixed inset-0 z-40"
                onClick={() => setOpenDropdown(null)}
              />
            )}

            {(selectedGenres.length > 0 || selectedOccasions.length > 0 || selectedArtists.length > 0) && (
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {selectedGenres.map((g) => (
                  <span key={g} className="bg-primary/10 border border-primary/30 text-primary text-[10px] sm:text-xs px-2 sm:px-3 py-1 rounded-full flex items-center gap-0.5 sm:gap-1">
                    <span className="truncate">{g}</span>
                    <button onClick={() => setSelectedGenres(selectedGenres.filter((x) => x !== g))} className="hover:text-primary/70 flex-shrink-0">
                      <X size={12} />
                    </button>
                  </span>
                ))}

                {selectedOccasions.map((o) => (
                  <span key={o} className="bg-on-surface-variant/10 border border-on-surface-variant/30 text-on-surface-variant text-[10px] sm:text-xs px-2 sm:px-3 py-1 rounded-full flex items-center gap-0.5 sm:gap-1">
                    <span className="truncate">{o}</span>
                    <button onClick={() => setSelectedOccasions(selectedOccasions.filter((x) => x !== o))} className="hover:text-on-surface-variant/70 flex-shrink-0">
                      <X size={12} />
                    </button>
                  </span>
                ))}

                {selectedArtists.map((a) => (
                  <span key={a} className="bg-error/10 border border-error/30 text-error text-[10px] sm:text-xs px-2 sm:px-3 py-1 rounded-full flex items-center gap-0.5 sm:gap-1">
                    <span className="truncate">{a}</span>
                    <button onClick={() => setSelectedArtists(selectedArtists.filter((x) => x !== a))} className="hover:text-error/70 flex-shrink-0">
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-6 mb-8 sm:mb-10 md:mb-12" style={{ gridAutoRows: 'minmax(0, 1fr)' }}>
              {loading ? (
                <div className="col-span-full text-center py-12 text-on-surface-variant">Cargando repertorio...</div>
              ) : paginatedSongs.length === 0 ? (
                <div className="col-span-full text-center py-12 text-on-surface-variant">No se encontraron canciones disponibles en este momento.</div>
              ) : (
                paginatedSongs.map((song) => {
                  const isSelected = selected.some((s) => s.id === song.id);
                  return (
                    <div key={song.id} className={`flex flex-col h-full bg-surface-container-low border ${isSelected ? 'border-primary' : 'border-outline-variant/10'} rounded-2xl sm:rounded-3xl p-3 sm:p-5 md:p-6 relative group transition-colors`}>
                      <Lock size={14} className="absolute top-3 sm:top-6 right-3 sm:right-6 text-on-surface-variant/50" />

                      <div className="flex flex-wrap gap-1.5 mb-3 sm:mb-4 md:mb-6">
                        {getDisplayedGenres(song.genres).map((g) => (
                          <span key={`g-${g}`} className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-primary border border-primary/30 px-2 py-1 rounded-md">
                            {g}
                          </span>
                        ))}
                        {getDisplayedOccasions(song.occasions).map((o) => (
                          <span key={`o-${o}`} className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-on-surface-variant border border-outline-variant/30 px-2 py-1 rounded-md">
                            {o}
                          </span>
                        ))}
                        {(getHiddenGenresCount(song.genres) > 0 || getHiddenOccasionsCount(song.occasions) > 0) && (
                          <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/60 border border-outline-variant/20 px-2 py-1 rounded-md bg-surface-container/30 cursor-pointer hover:border-outline-variant/40 transition-colors">
                            +{getHiddenGenresCount(song.genres) + getHiddenOccasionsCount(song.occasions)} más
                          </span>
                        )}
                      </div>

                      <h4 className="font-serif text-lg sm:text-xl md:text-2xl text-on-surface mb-1 line-clamp-2">{song.title}</h4>
                      <p className="text-xs sm:text-sm text-on-surface-variant italic mb-6 sm:mb-8 flex-1 line-clamp-1">{song.artist}</p>

                      <div className="flex items-center justify-end gap-1.5 sm:gap-2 mt-auto pt-4">
                        {extractYouTubeId(song.youtubeUrl) && (
                          <button
                            onClick={() => setPlayingSong(song)}
                            className="text-[10px] sm:text-xs font-semibold flex items-center gap-0.5 sm:gap-1 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-full border border-primary/40 text-primary hover:bg-primary/10 transition-colors whitespace-nowrap"
                            title="Reproducir en YouTube"
                          >
                            <PlayCircle size={12} className="sm:size-3.5" />
                            <span className="hidden sm:inline">Reproducir</span>
                            <span className="sm:hidden">Play</span>
                          </button>
                        )}

                        <button
                          onClick={() => toggleSong(song)}
                          className={`text-xs sm:text-sm font-bold flex items-center gap-0.5 sm:gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full transition-colors whitespace-nowrap ${isSelected ? 'bg-primary text-on-primary' : 'border border-outline-variant text-on-surface hover:border-primary hover:text-primary'}`}
                        >
                          {isSelected ? 'Anadido' : <><Plus size={14} className="sm:size-4" /> <span className="hidden sm:inline">Anadir</span></>}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="space-y-2 mb-8 sm:mb-10 md:mb-12">
              {loading ? (
                <div className="text-center py-12 text-on-surface-variant">Cargando repertorio...</div>
              ) : paginatedSongs.length === 0 ? (
                <div className="text-center py-12 text-on-surface-variant">No se encontraron canciones disponibles en este momento.</div>
              ) : (
                paginatedSongs.map((song) => {
                  const isSelected = selected.some((s) => s.id === song.id);
                  return (
                    <div
                      key={song.id}
                      onClick={() => setExpandedSongList(song)}
                      className={`flex items-center justify-between gap-3 bg-surface-container-low border ${
                        isSelected ? 'border-primary' : 'border-outline-variant/10'
                      } rounded-lg p-3 sm:p-4 transition-all hover:border-primary/50 cursor-pointer group`}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-lg bg-surface-container-highest flex items-center justify-center text-primary flex-shrink-0">
                          <Music size={14} className="sm:size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-serif text-xs sm:text-sm font-medium text-on-surface line-clamp-1 group-hover:text-primary transition-colors">
                            {song.title}
                          </h4>
                          <p className="text-[10px] sm:text-xs text-on-surface-variant line-clamp-1">{song.artist}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                        {extractYouTubeId(song.youtubeUrl) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPlayingSong(song);
                            }}
                            className="p-1.5 sm:p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                            title="Reproducir en YouTube"
                          >
                            <PlayCircle size={14} className="sm:size-4" />
                          </button>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSong(song);
                          }}
                          className={`p-1.5 sm:p-2 rounded-lg transition-colors font-bold ${
                            isSelected
                              ? 'bg-primary text-on-primary'
                              : 'text-on-surface hover:bg-surface-container border border-outline-variant hover:border-primary'
                          }`}
                        >
                          {isSelected ? <Check size={14} className="sm:size-4" /> : <Plus size={14} className="sm:size-4" />}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Modal Flotante para detalles en modo lista */}
          {expandedSongList && viewMode === 'list' && (
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-full max-w-sm bg-surface-container-low rounded-2xl sm:rounded-3xl border border-outline-variant/20 p-4 sm:p-6 my-8"
              >
                <div className="flex items-start justify-between mb-4 sm:mb-5">
                  <button
                    onClick={() => setExpandedSongList(null)}
                    className="text-on-surface-variant hover:text-on-surface transition-colors"
                    aria-label="Cerrar"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-4 sm:mb-5">
                  {getDisplayedGenresExpanded(expandedSongList.genres).map((g) => (
                    <span key={`g-${g}`} className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-primary border border-primary/30 px-2 py-1 rounded-md">
                      {g}
                    </span>
                  ))}
                  {getDisplayedOccasionsExpanded(expandedSongList.occasions).map((o) => (
                    <span key={`o-${o}`} className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-on-surface-variant border border-outline-variant/30 px-2 py-1 rounded-md">
                      {o}
                    </span>
                  ))}
                  {(getHiddenGenresCountExpanded(expandedSongList.genres) > 0 || getHiddenOccasionsCountExpanded(expandedSongList.occasions) > 0) && (
                    <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/60 border border-outline-variant/20 px-2 py-1 rounded-md bg-surface-container/30">
                      +{getHiddenGenresCountExpanded(expandedSongList.genres) + getHiddenOccasionsCountExpanded(expandedSongList.occasions)} más
                    </span>
                  )}
                </div>

                <h3 className="font-serif text-lg sm:text-xl md:text-2xl text-on-surface mb-1">{expandedSongList.title}</h3>
                <p className="text-xs sm:text-sm text-on-surface-variant italic mb-6 sm:mb-8">{expandedSongList.artist}</p>

                <div className="flex items-center justify-end gap-2 sm:gap-3">
                  {extractYouTubeId(expandedSongList.youtubeUrl) && (
                    <button
                      onClick={() => {
                        setPlayingSong(expandedSongList);
                        setExpandedSongList(null);
                      }}
                      className="text-[10px] sm:text-xs font-semibold flex items-center gap-0.5 sm:gap-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-full border border-primary/40 text-primary hover:bg-primary/10 transition-colors whitespace-nowrap"
                      title="Reproducir en YouTube"
                    >
                      <PlayCircle size={12} className="sm:size-4" />
                      <span className="hidden sm:inline">Reproducir</span>
                      <span className="sm:hidden">Play</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      toggleSong(expandedSongList);
                      setExpandedSongList(null);
                    }}
                    className={`text-xs sm:text-sm font-bold flex items-center gap-0.5 sm:gap-1 px-2 sm:px-4 py-1.5 sm:py-2 rounded-full transition-colors whitespace-nowrap ${
                      selected.some((s) => s.id === expandedSongList.id)
                        ? 'bg-primary text-on-primary'
                        : 'border border-outline-variant text-on-surface hover:border-primary hover:text-primary'
                    }`}
                  >
                    {selected.some((s) => s.id === expandedSongList.id) ? 'Anadido' : (
                      <>
                        <Plus size={14} className="sm:size-4" /> <span className="hidden sm:inline">Anadir</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {/* Cerrar modal al click afuera */}
          {expandedSongList && viewMode === 'list' && (
            <div
              className="fixed inset-0 z-40"
              onClick={() => setExpandedSongList(null)}
            />
          )}

          {totalPages > 1 && (
            <div className="flex justify-center flex-wrap gap-2 mt-8">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors disabled:opacity-50 disabled:hover:text-on-surface-variant"
              >
                &lt;
              </button>

              {getPaginationArray(currentPage, totalPages).map((pageItem, idx) => (
                <button
                  key={`page-${idx}`}
                  onClick={() => typeof pageItem === 'number' ? setCurrentPage(pageItem) : null}
                  disabled={typeof pageItem !== 'number'}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                    currentPage === pageItem
                      ? 'bg-primary/20 text-primary font-bold'
                      : typeof pageItem !== 'number'
                      ? 'bg-transparent text-on-surface-variant cursor-default'
                      : 'bg-surface-container text-on-surface-variant hover:text-primary'
                  }`}
                >
                  {pageItem}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors disabled:opacity-50 disabled:hover:text-on-surface-variant"
              >
                &gt;
              </button>
            </div>
          )}
        </div>

        <div className="order-2 lg:order-2 min-w-0">
          <div className="sticky top-24 sm:top-28 md:top-32 bg-surface-container-lowest border border-outline-variant/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 ambient-shadow">
            <div className="flex items-center justify-between mb-1 sm:mb-2 gap-2">
              <h3 className="font-serif text-base sm:text-lg md:text-xl text-primary flex items-center gap-1 sm:gap-2 min-w-0">
                <ListMusic size={16} className="sm:size-5" />
                <span className="truncate">Mi Seleccion</span>
              </h3>
              <button onClick={() => setSelected([])} className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-on-surface-variant hover:text-error transition-colors flex items-center gap-0.5 flex-shrink-0">
                <Trash2 size={12} /> <span className="hidden sm:inline">Limpiar</span>
              </button>
            </div>

            <p className="text-[10px] sm:text-xs text-on-surface-variant mb-4 sm:mb-6">{selected.length} CANCIONES SELECCIONADAS</p>

            <div className="space-y-2 sm:space-y-3 mb-6 sm:mb-8 max-h-[250px] sm:max-h-[350px] md:max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {selected.length === 0 ? (
                <p className="text-sm text-on-surface-variant/50 italic text-center py-8">No hay canciones seleccionadas</p>
              ) : (
                selected.map((song) => (
                  <div key={song.id} className="bg-surface-container p-2 sm:p-3 rounded-lg sm:rounded-xl flex items-center justify-between gap-2 sm:gap-3 group">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <div className="w-7 sm:w-8 h-7 sm:h-8 rounded-lg bg-surface-container-highest flex items-center justify-center text-primary flex-shrink-0">
                        <Music size={12} className="sm:size-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-on-surface truncate">{song.title}</p>
                        <p className="text-[9px] sm:text-[10px] text-on-surface-variant truncate">{song.artist}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelected(selected.filter((s) => s.id !== song.id))}
                      className="text-on-surface-variant hover:text-error transition-colors flex-shrink-0 opacity-100 p-1"
                      title="Remover canción"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex flex-col gap-2 sm:gap-3">
              <button
                onClick={() => {
                  if (selected.length === 0) return;
                  const text = `Me gustaria solicitar las siguientes canciones:\n${selected.map((s) => `- ${s.title} (${s.artist})`).join('\n')}`;
                  navigator.clipboard.writeText(text);
                  setHasCopied(true);
                  setTimeout(() => setHasCopied(false), 2000);
                }}
                className="w-full bg-surface-container-low border border-outline-variant/30 text-on-surface py-2 sm:py-3 font-semibold text-xs sm:text-sm rounded-lg sm:rounded-xl hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-1 sm:gap-2"
              >
                {hasCopied ? <Check size={14} className="sm:size-4 text-primary" /> : <Copy size={14} className="sm:size-4" />}
                <span>{hasCopied ? 'Copiado' : 'Copiar'}</span>
              </button>

              <button
                onClick={() => {
                  if (selected.length === 0) return;
                  const text = `Me gustaria solicitar las siguientes canciones:\n${selected.map((s) => `- ${s.title} (${s.artist})`).join('\n')}`;
                  window.open(`https://wa.me/525512345678?text=${encodeURIComponent(text)}`, '_blank');
                }}
                className="w-full gold-gradient text-on-primary py-3 sm:py-4 font-bold text-sm sm:text-base rounded-lg sm:rounded-xl hover:shadow-[0_0_20px_rgba(255,203,70,0.3)] transition-all flex items-center justify-center gap-1 sm:gap-2"
              >
                <Phone size={16} className="sm:size-4.5" /> WhatsApp
              </button>
            </div>

            <p className="text-[9px] sm:text-[10px] text-center text-on-surface-variant mt-3 sm:mt-4 leading-relaxed">Copia la lista o envia por WhatsApp.</p>
          </div>
        </div>
      </div>

      {showAdvancedFilter && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto overscroll-contain" onClick={() => setShowAdvancedFilter(false)}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="w-full max-w-2xl bg-surface-container-low rounded-2xl border border-outline-variant/20 p-6 my-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-serif text-2xl text-on-surface">Filtro Avanzado</h2>
              <button onClick={() => setShowAdvancedFilter(false)} className="text-on-surface-variant hover:text-on-surface" aria-label="Cerrar">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6 max-h-[60vh] overflow-y-auto overscroll-contain pr-2 sm:pr-3">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-3">
                  <h3 className="font-semibold text-on-surface text-sm">Generos ({selectedGenres.length})</h3>
                  <div className="flex gap-1.5 sm:gap-2 items-center flex-wrap sm:flex-nowrap">
                    <input type="text" placeholder="Buscar..." value={genreSearch} onChange={(e) => setGenreSearch(e.target.value)} className="flex-1 sm:w-32 bg-surface-container py-1 px-2 rounded-lg text-xs border border-outline-variant/30 focus:outline-none focus:border-primary" />
                    <button onClick={() => setSelectedGenres(allGenres)} className="p-1.5 sm:p-2 bg-primary/10 border border-primary/30 text-primary rounded hover:bg-primary/20 transition-colors" title="Seleccionar todo">
                      <CheckSquare2 size={16} />
                    </button>
                    <button onClick={() => setSelectedGenres([])} className="p-1.5 sm:p-2 bg-on-surface-variant/10 border border-on-surface-variant/30 text-on-surface-variant rounded hover:bg-on-surface-variant/20 transition-colors" title="Limpiar">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="space-y-2 bg-surface-container rounded-lg p-3 max-h-48 overflow-y-auto">
                  {filteredGenres.length > 0 ? (
                    filteredGenres.map((g: string) => (
                      <label key={g} className="flex items-center gap-2 cursor-pointer text-on-surface text-xs sm:text-sm hover:text-primary transition-colors">
                        <input type="checkbox" checked={selectedGenres.includes(g)} onChange={() => toggleSelection(g, selectedGenres, setSelectedGenres)} className="rounded border-outline-variant/30 text-primary focus:ring-primary bg-surface-container-lowest" /> {g}
                      </label>
                    ))
                  ) : (
                    <p className="text-on-surface-variant text-xs italic">No se encontraron generos</p>
                  )}
                </div>
              </div>

              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-3">
                  <h3 className="font-semibold text-on-surface text-sm">Ocasiones ({selectedOccasions.length})</h3>
                  <div className="flex gap-1.5 sm:gap-2 items-center flex-wrap sm:flex-nowrap">
                    <input type="text" placeholder="Buscar..." value={occasionSearch} onChange={(e) => setOccasionSearch(e.target.value)} className="flex-1 sm:w-32 bg-surface-container py-1 px-2 rounded-lg text-xs border border-outline-variant/30 focus:outline-none focus:border-primary" />
                    <button onClick={() => setSelectedOccasions(allOccasions)} className="p-1.5 sm:p-2 bg-on-surface-variant/10 border border-on-surface-variant/30 text-on-surface-variant rounded hover:bg-on-surface-variant/20 transition-colors" title="Seleccionar todo">
                      <CheckSquare2 size={16} />
                    </button>
                    <button onClick={() => setSelectedOccasions([])} className="p-1.5 sm:p-2 bg-on-surface-variant/10 border border-on-surface-variant/30 text-on-surface-variant rounded hover:bg-on-surface-variant/20 transition-colors" title="Limpiar">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="space-y-2 bg-surface-container rounded-lg p-3 max-h-48 overflow-y-auto">
                  {filteredOccasions.length > 0 ? (
                    filteredOccasions.map((o: string) => (
                      <label key={o} className="flex items-center gap-2 cursor-pointer text-on-surface text-xs sm:text-sm hover:text-primary transition-colors">
                        <input type="checkbox" checked={selectedOccasions.includes(o)} onChange={() => toggleSelection(o, selectedOccasions, setSelectedOccasions)} className="rounded border-outline-variant/30 text-primary focus:ring-primary bg-surface-container-lowest" /> {o}
                      </label>
                    ))
                  ) : (
                    <p className="text-on-surface-variant text-xs italic">No se encontraron ocasiones</p>
                  )}
                </div>
              </div>

              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-3">
                  <h3 className="font-semibold text-on-surface text-sm">Artistas ({selectedArtists.length})</h3>
                  <div className="flex gap-1.5 sm:gap-2 items-center flex-wrap sm:flex-nowrap">
                    <input type="text" placeholder="Buscar..." value={artistSearch} onChange={(e) => setArtistSearch(e.target.value)} className="flex-1 sm:w-32 bg-surface-container py-1 px-2 rounded-lg text-xs border border-outline-variant/30 focus:outline-none focus:border-error" />
                    <button onClick={() => setSelectedArtists(allArtists)} className="p-1.5 sm:p-2 bg-error/10 border border-error/30 text-error rounded hover:bg-error/20 transition-colors" title="Seleccionar todo">
                      <CheckSquare2 size={16} />
                    </button>
                    <button onClick={() => setSelectedArtists([])} className="p-1.5 sm:p-2 bg-error/10 border border-error/30 text-error rounded hover:bg-error/20 transition-colors" title="Limpiar">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="space-y-2 bg-surface-container rounded-lg p-3 max-h-48 overflow-y-auto">
                  {filteredArtists.length > 0 ? (
                    filteredArtists.map((a: string) => (
                      <label key={a} className="flex items-center gap-2 cursor-pointer text-on-surface text-xs sm:text-sm hover:text-error transition-colors">
                        <input type="checkbox" checked={selectedArtists.includes(a)} onChange={() => toggleSelection(a, selectedArtists, setSelectedArtists)} className="rounded border-error/30 text-error focus:ring-error bg-surface-container-lowest" /> {a}
                      </label>
                    ))
                  ) : (
                    <p className="text-on-surface-variant text-xs italic">No se encontraron artistas</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t border-outline-variant/20">
              <button
                onClick={() => {
                  setSelectedGenres([]);
                  setSelectedOccasions([]);
                  setSelectedArtists([]);
                  setGenreSearch('');
                  setOccasionSearch('');
                  setArtistSearch('');
                }}
                className="flex-1 py-3 border border-outline-variant/30 text-on-surface rounded-lg hover:border-primary hover:text-primary transition-colors font-medium text-sm"
              >
                Limpiar Seleccion
              </button>

              <button
                onClick={() => setShowAdvancedFilter(false)}
                className="flex-1 gold-gradient text-on-primary py-3 rounded-lg hover:shadow-[0_0_20px_rgba(255,203,70,0.3)] transition-all font-bold text-sm"
              >
                Aplicar Filtros
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {playingSong && playingYouTubeId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-surface-container-low rounded-2xl border border-outline-variant/20 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/20">
              <div>
                <p className="font-serif text-xl text-on-surface">{playingSong.title}</p>
                <p className="text-xs text-on-surface-variant">{playingSong.artist}</p>
              </div>
              <button onClick={() => setPlayingSong(null)} className="text-on-surface-variant hover:text-on-surface p-2" aria-label="Cerrar reproductor">
                <X size={20} />
              </button>
            </div>
            <div className="aspect-video bg-black">
              <iframe
                className="w-full h-full"
                src={`https://www.youtube.com/embed/${playingYouTubeId}?autoplay=1&rel=0`}
                title={`YouTube player - ${playingSong.title}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
