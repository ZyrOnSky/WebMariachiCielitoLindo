import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Menu, X, Facebook, Instagram, Youtube, MessageCircle, Sun, Moon } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { ViewState } from './types';
import { HomeView, AboutView, ContactView } from './components/BasicViews';
import ReviewsView from './components/ReviewsView';
import GalleryView from './components/GalleryView';
import RepertoireView from './components/RepertoireView';
import AdminView from './components/AdminView';
import ScrollToTop from './components/ScrollToTop';
import { Toaster, toast } from 'react-hot-toast';
import { Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import logoMain from '../medios/logos/logo.svg';
import logoMobile from '../medios/logos/logmovil.svg';
import logoHeader from '../medios/logos/logo_head_foot.png';
import logoFooter from '../medios/logos/logo_head_foot_gra.png';
import { auth, db } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const BACKGROUND_PLAYLIST = [
  { title: "Cielito Lindo", artist: "Quirino Mendoza y Cortés", url: "/canciones/Cielito%20Lindo.mp3" },
  { title: "El Mariachi Loco", artist: "Román Palomar", url: "/canciones/El%20Mariachi%20Loco.mp3" },
  { title: "Guadalajara", artist: "Pepe Guízar", url: "/canciones/Guadalajara_Mariachi_letra%20original_letra_lyrics.mp3" },
  { title: "Jarabe Tapatío", artist: "Jesús González Rubio", url: "/canciones/Jarabe%20tapat%C3%ADo.mp3" },
  { title: "Jesusita en Chihuahua", artist: "Quirino Mendoza y Cortés", url: "/canciones/Jesusita%20En%20Chihuahua%20by%20Mariachi%20Mexico.mp3" },
  { title: "La Bikina", artist: "Rubén Fuentes", url: "/canciones/LA%20BIKINA%20MARIACHI%20VARGAS%20DE%20TECALITLAN.mp3" },
  { title: "Sabes Una Cosa", artist: "Luis Miguel", url: "/canciones/La%20hija%20del%20mariachi%20%20-%20Sabes%20Una%20cosa.%20CD2.mp3" },
  { title: "El Son de la Negra", artist: "Blas Galindo", url: "/canciones/Mariachi%20Vargas%20%20%20Son%20de%20la%20negra.mp3" },
  { title: "El Aventurero", artist: "Pedro Fernández", url: "/canciones/Pedro%20Fern%C3%A1ndez%20El%20Aventurero%20Letra.mp3" },
  { title: "Hermoso Cariño", artist: "Vicente Fernández", url: "/canciones/Vicente%20Fern%C3%A1ndez%20Hermoso%20Cari%C3%B1o%20Oficial%20En%20Vivo.mp3" }
];

const SEO_CONFIG: Record<string, { title: string, description: string }> = {
  '/': { 
    title: 'Mariachi Guayaquil | Mariachi Internacional Cielito Lindo 🎺', 
    description: 'El mejor mariachi en Guayaquil, Ecuador. 12 músicos en escena para serenatas, bodas, quinceañeras y cumpleaños. ☎ 098 721 6439.' 
  },
  '/nosotros': { 
    title: 'Nuestro Mariachi en Guayaquil | Mariachi Cielito Lindo 🎺', 
    description: 'Conoce la trayectoria del mejor mariachi de Guayaquil. Músicos profesionales brindando serenatas y pasión mexicana en Guayas y Ecuador.' 
  },
  '/galeria': { 
    title: 'Fotos y Videos del Mejor Mariachi en Guayaquil | Cielito Lindo 📸', 
    description: 'Mira las presentaciones, serenatas, bodas y fiestas animadas por el Mariachi Internacional Cielito Lindo en Guayaquil.' 
  },
  '/resenas': { 
    title: 'Reseñas 5 Estrellas | Mariachi Guayaquil Cielito Lindo ★★★★★', 
    description: 'Lee testimonios reales de nuestros clientes en Guayaquil. Somos el mariachi mejor calificado, destacado por puntualidad, talento y carisma.' 
  },
  '/repertorio': { 
    title: 'Canciones para Serenata en Guayaquil | Mariachi Cielito Lindo 🎵', 
    description: 'Explora nuestro repertorio de mariachi: rancheras, boleros, cumbias para cumpleaños, bodas, quinceañeras y velorios en Guayaquil.' 
  },
  '/contacto': { 
    title: 'Contratar Mariachi en Guayaquil | Precios y Reservas 📞', 
    description: 'Contrata el mejor mariachi en Guayaquil. Agenda tu serenata por WhatsApp al 098 721 6439. Atención rápida y precios competitivos.' 
  },
  '/portal-mcl': { 
    title: 'Portal Privado | Mariachi Cielito Lindo', 
    description: 'Acceso administrativo para miembros del Mariachi Cielito Lindo.' 
  }
};

export default function App() {
  type ThemeMode = 'light' | 'dark';
  const location = useLocation();
  const navigate = useNavigate();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(() => Math.floor(Math.random() * BACKGROUND_PLAYLIST.length));
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const savedTheme = window.localStorage.getItem('wmcl-theme');
    if (savedTheme === 'dark' || savedTheme === 'light') {
      return savedTheme;
    }
    return 'dark';
  });

  // Auth & Stealth State
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'musician' | null>(null);
  const [isDoorRevealed, setIsDoorRevealed] = useState(false);
  const [logoClicks, setLogoClicks] = useState(0);
  const lastLogoClickTime = useRef<number>(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeMode);
    window.localStorage.setItem('wmcl-theme', themeMode);
  }, [themeMode]);

  // Dynamic SEO Update
  useEffect(() => {
    const config = SEO_CONFIG[location.pathname] || SEO_CONFIG['/'];
    
    // Update Document Title
    document.title = config.title;

    // Update Meta Description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', config.description);
    }

    // Update OpenGraph tags
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', config.title);

    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription) ogDescription.setAttribute('content', config.description);

    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute('content', window.location.href);
  }, [location.pathname]);

  // Firebase Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          setUserRole(userDoc.data().role);
        }
      } else {
        setUserRole(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Set initial audio volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = 0.1;
    }
  }, []);

  // Handle global click for autoplay
  useEffect(() => {
    const handleInteraction = () => {
      if (!hasInteracted && audioRef.current) {
        audioRef.current.play().then(() => {
          setIsPlaying(true);
          setHasInteracted(true);
          showNowPlayingToast(currentTrackIndex);
        }).catch(err => console.error("Audio playback failed:", err));
      }
    };

    document.addEventListener('click', handleInteraction);
    return () => document.removeEventListener('click', handleInteraction);
  }, [hasInteracted]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
        if (hasInteracted) {
          showNowPlayingToast(currentTrackIndex);
        }
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const navLinks: { id: string, label: string, path: string }[] = [
    { id: 'home', label: 'Inicio', path: '/' },
    { id: 'about', label: 'Nosotros', path: '/nosotros' },
    { id: 'gallery', label: 'Galería', path: '/galeria' },
    { id: 'reviews', label: 'Reseñas', path: '/resenas' },
    { id: 'repertoire', label: 'Repertorio', path: '/repertorio' },
    { id: 'contact', label: 'Contacto', path: '/contacto' },
  ];

  const handleYoutubePlayerStateChange = (isOpen: boolean) => {
    if (!isOpen || !audioRef.current) return;
    audioRef.current.pause();
    setIsPlaying(false);
  };

  const toggleTheme = () => {
    setThemeMode((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  const viewToPath: Record<string, string> = {
    home: '/',
    about: '/nosotros',
    gallery: '/galeria',
    reviews: '/resenas',
    repertoire: '/repertorio',
    contact: '/contacto',
    admin: '/portal-mcl'
  };

  const handleNavigateView = (view: string) => {
    const path = viewToPath[view as string] || '/';
    handleNavigate(path);
  };

  const handleTrackEnd = () => {
    const nextIndex = Math.floor(Math.random() * BACKGROUND_PLAYLIST.length);
    setCurrentTrackIndex(nextIndex);
  };

  const showNowPlayingToast = (index: number) => {
    const track = BACKGROUND_PLAYLIST[index];
    toast.success(
      <span>
        Reproduciendo:<br />
        <strong className="font-bold">{track.title}</strong> - <em className="italic opacity-80">{track.artist}</em>
      </span>,
      {
        icon: '🎵',
        style: {
          borderRadius: '10px',
          background: 'var(--color-surface-container-low)',
          color: 'var(--color-on-surface)',
          border: '1px solid var(--color-primary)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
        },
      }
    );
  };

  // Automatically play when track changes (if user was already playing)
  useEffect(() => {
    if (isPlaying && audioRef.current) {
      audioRef.current.play().then(() => {
        showNowPlayingToast(currentTrackIndex);
      }).catch(console.error);
    }
  }, [currentTrackIndex]);

  return (<>
    <Toaster
      position="top-right"
      toastOptions={{ duration: 4000 }}
      containerStyle={{ top: 100 }}
    />
    <ScrollToTop />
    <div className="min-h-screen relative overflow-hidden bg-surface">
      {/* Audio Element */}
      <audio
        ref={audioRef}
        src={BACKGROUND_PLAYLIST[currentTrackIndex].url}
        onEnded={handleTrackEnd}
      />

      {/* Floating Audio Controls */}
      <div className="fixed bottom-8 right-8 z-50 flex items-center gap-3 glass-effect px-4 py-3 rounded-full border border-outline-variant/30 ambient-shadow">
        <button onClick={togglePlay} className="text-primary hover:text-primary-container transition-colors">
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <div className="w-px h-4 bg-outline-variant/50"></div>
        <button onClick={toggleMute} className="text-on-surface-variant hover:text-on-surface transition-colors">
          {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
        {!hasInteracted && (
          <span className="text-xs text-on-surface-variant ml-2 animate-pulse hidden sm:inline">Haz clic para escuchar</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="site-nav fixed top-0 w-full z-40 glass-effect border-b border-outline-variant/10">
        <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
          <button
            onClick={() => {
              handleNavigate('/');
              if (!user) {
                const now = Date.now();
                const diff = now - lastLogoClickTime.current;

                // If interval is less than 600ms, it's a consecutive click
                if (diff < 600) {
                  const newClicks = logoClicks + 1;
                  if (newClicks >= 3) {
                    setIsDoorRevealed(true);
                    setLogoClicks(0);
                  } else {
                    setLogoClicks(newClicks);
                  }
                } else {
                  setLogoClicks(1); // Reset to first click if too slow
                }

                lastLogoClickTime.current = now;
              }
            }}
            aria-label="Ir al inicio"
            className="hover:opacity-90 transition-opacity select-none"
          >
            <img
              src={logoMain}
              alt="Mariachi Cielito Lindo"
              className="hidden md:block h-12 w-auto object-contain"
              loading="eager"
            />
            <img
              src={logoHeader}
              alt="Mariachi Cielito Lindo"
              className="md:hidden h-14 w-auto object-contain"
              loading="eager"
            />
          </button>
          <div className="hidden md:flex items-center gap-8 font-label text-sm tracking-wide">
            {navLinks.map(link => (
              <button
                key={link.id}
                onClick={() => handleNavigate(link.path)}
                className={`transition-colors pb-1 ${location.pathname === link.path ? 'text-primary border-b border-primary' : 'text-on-surface-variant hover:text-primary'}`}
              >
                {link.label}
              </button>
            ))}
          </div>
          <button
            onClick={toggleTheme}
            aria-label={themeMode === 'dark' ? 'Cambiar a modo día' : 'Cambiar a modo noche'}
            className="hidden md:inline-flex items-center justify-center w-11 h-11 rounded-full border border-outline-variant/40 text-on-surface-variant hover:text-on-surface hover:border-primary transition-colors"
          >
            {themeMode === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          {(user || isDoorRevealed) && (
            <button
              onClick={() => handleNavigate(location.pathname === '/portal-mcl' ? '/' : '/portal-mcl')}
              className="hidden md:block gold-gradient text-on-primary px-6 py-3 font-label font-semibold text-sm hover:shadow-[0_0_20px_rgba(255,203,70,0.3)] transition-all active:scale-95 rounded-full"
            >
              {!user ? 'Acceso Usuarios' : (location.pathname === '/portal-mcl' ? 'Volver al Inicio' : 'Panel Admin')}
            </button>
          )}
          <div className="md:hidden flex items-center gap-1">
            <button
              onClick={toggleTheme}
              aria-label={themeMode === 'dark' ? 'Cambiar a modo día' : 'Cambiar a modo noche'}
              className="text-primary p-2"
            >
              {themeMode === 'dark' ? <Sun size={24} /> : <Moon size={24} />}
            </button>
            <button
              className="text-primary p-2"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              key="mobile-menu"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-surface-container-low border-b border-outline-variant/10 overflow-hidden mobile-dropdown-menu"
            >
              <div className="flex flex-col px-6 py-4 gap-4">
                {navLinks.map(link => (
                  <button
                    key={link.id}
                    onClick={() => handleNavigate(link.path)}
                    className={`text-left text-lg py-2 transition-colors ${location.pathname === link.path ? 'text-primary font-bold' : 'text-on-surface-variant'}`}
                  >
                    {link.label}
                  </button>
                ))}
                {(user || isDoorRevealed) && (
                  <button
                    onClick={() => handleNavigate(location.pathname === '/portal-mcl' ? '/' : '/portal-mcl')}
                    className="gold-gradient text-on-primary px-6 py-3 font-label font-semibold text-sm rounded-full w-full mt-2"
                  >
                    {!user ? 'Acceso Usuarios' : (location.pathname === '/portal-mcl' ? 'Volver al Inicio' : 'Panel Admin')}
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Main Content Area with Transitions */}
      <main className="w-full min-h-screen">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <Routes location={location}>
              <Route path="/" element={<HomeView setView={handleNavigateView} />} />
              <Route path="/nosotros" element={<AboutView setView={handleNavigateView} />} />
              <Route path="/galeria" element={<GalleryView setView={handleNavigateView} onYoutubePlayerStateChange={handleYoutubePlayerStateChange} />} />
              <Route path="/resenas" element={<ReviewsView />} />
              <Route path="/repertorio" element={<RepertoireView setView={handleNavigateView} onYoutubePlayerStateChange={handleYoutubePlayerStateChange} />} />
              <Route path="/contacto" element={<ContactView />} />
              <Route path="/portal-mcl" element={
                (user || isDoorRevealed) ? (
                  <AdminView
                    setView={handleNavigateView}
                    onYoutubePlayerStateChange={handleYoutubePlayerStateChange}
                    user={user}
                    role={userRole}
                  />
                ) : (
                  <Navigate to="/" replace />
                )
              } />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="site-footer w-full py-12 px-6 md:px-12 lg:px-24 bg-surface-container-lowest border-t border-outline-variant/10 flex flex-col md:flex-row justify-between items-center gap-8 relative z-30">
        <div className="w-full md:w-auto flex justify-center md:justify-start">
          <img
            src={logoFooter}
            alt="Mariachi Cielito Lindo"
            className="h-14 md:h-16 w-auto object-contain"
            loading="lazy"
            decoding="async"
          />
        </div>
        <div className="flex flex-wrap justify-center gap-4 md:gap-5 font-label text-sm">
          <a
            href="https://www.facebook.com/Mariachicielitolindoec"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Facebook"
            className="w-10 h-10 rounded-full border border-outline-variant/30 text-on-surface-variant hover:text-primary hover:border-primary transition-colors flex items-center justify-center"
          >
            <Facebook size={18} />
          </a>
          <a
            href="https://www.instagram.com/mariachicielitolindoec/?hl=en"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className="w-10 h-10 rounded-full border border-outline-variant/30 text-on-surface-variant hover:text-primary hover:border-primary transition-colors flex items-center justify-center"
          >
            <Instagram size={18} />
          </a>
          <a
            href="https://www.youtube.com/channel/UCqsvmHSNoKFsSGModRy3yuQ"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="YouTube"
            className="w-10 h-10 rounded-full border border-outline-variant/30 text-on-surface-variant hover:text-primary hover:border-primary transition-colors flex items-center justify-center"
          >
            <Youtube size={18} />
          </a>
          <a
            href="https://api.whatsapp.com/send/?phone=593987216439&text=%21Buen+d%C3%ADa%21+Deseo+la+mejor+serenata+de+Guayaquil%21&type=phone_number&app_absent=0"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="WhatsApp"
            className="w-10 h-10 rounded-full border border-outline-variant/30 text-on-surface-variant hover:text-primary hover:border-primary transition-colors flex items-center justify-center"
          >
            <MessageCircle size={18} />
          </a>
        </div>
        <div className="text-on-surface-variant text-xs font-light text-center md:text-right">
          <div>© 2026 Mariachi Cielito Lindo. Todos los derechos reservados.</div>
          <div className="mt-1">
            Desarrollado por{' '}
            <a
              href="https://digitalconstructions.netlify.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary-container underline underline-offset-2"
            >
              ABVC Digital Constructions
            </a>
          </div>
        </div>
      </footer>
    </div>
  </>
  );
}
