import { useEffect, useRef, useState, MouseEvent } from 'react';
import { Play, Pause, Volume2, VolumeX, Menu, X, Facebook, Instagram, Youtube, MessageCircle, Sun, Moon } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { ViewState } from './types';
import { HomeView, AboutView, ContactView } from './components/BasicViews';
import GalleryView from './components/GalleryView';
import RepertoireView from './components/RepertoireView';
import AdminView from './components/AdminView';
import { Toaster, toast } from 'react-hot-toast';
import logoMain from '../medios/logos/logo.svg';
import logoMobile from '../medios/logos/logmovil.svg';
import logoHeader from '../medios/logos/logo_head_foot.png';
import logoFooter from '../medios/logos/logo_head_foot_gra.png';

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

export default function App() {
  type ThemeMode = 'light' | 'dark';
  const [currentView, setCurrentView] = useState<ViewState>('home');
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
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeMode);
    window.localStorage.setItem('wmcl-theme', themeMode);
  }, [themeMode]);

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

  const togglePlay = (e: MouseEvent) => {
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

  const toggleMute = (e: MouseEvent) => {
    e.stopPropagation();
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const navLinks: { id: ViewState, label: string }[] = [
    { id: 'home', label: 'Inicio' },
    { id: 'about', label: 'Nosotros' },
    { id: 'gallery', label: 'Galería' },
    { id: 'repertoire', label: 'Repertorio' },
    { id: 'contact', label: 'Contacto' },
  ];

  const handleYoutubePlayerStateChange = (isOpen: boolean) => {
    if (!isOpen || !audioRef.current) return;
    audioRef.current.pause();
    setIsPlaying(false);
  };

  const toggleTheme = () => {
    setThemeMode((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleTrackEnd = () => {
    const nextIndex = Math.floor(Math.random() * BACKGROUND_PLAYLIST.length);
    setCurrentTrackIndex(nextIndex);
  };

  const showNowPlayingToast = (index: number) => {
    const track = BACKGROUND_PLAYLIST[index];
    toast.success(
      <span>
        Reproduciendo:<br/>
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

  return (    <>
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />    <div className="min-h-screen relative overflow-hidden bg-surface">
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
            onClick={() => setCurrentView('home')}
            aria-label="Ir al inicio"
            className="hover:opacity-90 transition-opacity"
          >
            <img
              src={logoMain}
              alt="Mariachi Cielito Lindo"
              className="hidden md:block h-12 w-auto object-contain"
              loading="eager"
              decoding="async"
            />
            <img
              src={logoHeader}
              alt="Mariachi Cielito Lindo"
              className="md:hidden h-14 w-auto object-contain"
              loading="eager"
              decoding="async"
            />
          </button>
          <div className="hidden md:flex items-center gap-8 font-label text-sm tracking-wide">
            {navLinks.map(link => (
              <button 
                key={link.id}
                onClick={() => setCurrentView(link.id)}
                className={`transition-colors pb-1 ${currentView === link.id ? 'text-primary border-b border-primary' : 'text-on-surface-variant hover:text-primary'}`}
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
          <button 
            onClick={() => setCurrentView(currentView === 'admin' ? 'home' : 'admin')} 
            className="hidden md:block gold-gradient text-on-primary px-6 py-3 font-label font-semibold text-sm hover:shadow-[0_0_20px_rgba(255,203,70,0.3)] transition-all active:scale-95 rounded-full"
          >
            {currentView === 'admin' ? 'Volver al Inicio' : 'Acceso Usuarios'}
          </button>
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
                    onClick={() => {
                      setCurrentView(link.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`text-left text-lg py-2 transition-colors ${currentView === link.id ? 'text-primary font-bold' : 'text-on-surface-variant'}`}
                  >
                    {link.label}
                  </button>
                ))}
                <button 
                  onClick={() => {
                    setCurrentView(currentView === 'admin' ? 'home' : 'admin');
                    setIsMobileMenuOpen(false);
                  }} 
                  className="gold-gradient text-on-primary px-6 py-3 font-label font-semibold text-sm rounded-full w-full mt-2"
                >
                  {currentView === 'admin' ? 'Volver al Inicio' : 'Acceso Usuarios'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Main Content Area with Transitions */}
      <main className="w-full min-h-screen">
        <AnimatePresence mode="wait">
          {currentView === 'home' && <HomeView key="home" setView={setCurrentView} />}
          {currentView === 'about' && <AboutView key="about" setView={setCurrentView} />}
          {currentView === 'gallery' && <GalleryView key="gallery" setView={setCurrentView} onYoutubePlayerStateChange={handleYoutubePlayerStateChange} />}
          {currentView === 'repertoire' && <RepertoireView key="repertoire" setView={setCurrentView} onYoutubePlayerStateChange={handleYoutubePlayerStateChange} />}
          {currentView === 'contact' && <ContactView key="contact" />}
          {currentView === 'admin' && (
            <AdminView 
              key="admin" 
              setView={setCurrentView} 
              onYoutubePlayerStateChange={handleYoutubePlayerStateChange} 
            />
          )}
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
              href="https://abvcdigital.netlify.app/"
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
