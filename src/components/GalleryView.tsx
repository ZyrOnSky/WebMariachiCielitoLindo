import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Play, ArrowRight, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { ViewState } from '../types';

const MODERN_PHOTOS = import.meta.glob('../../medios/fotos_modernas/*.{jpg,jpeg,png,JPG,JPEG,PNG}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

const PASARELA_PHOTOS = import.meta.glob('../../medios/fotos_pasarela/*.{jpg,jpeg,png,JPG,JPEG,PNG}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

const HERO_MAIN_PHOTO = new URL('../../medios/foto_principal/gradasOK.png', import.meta.url).href;
type FeaturedVideo = {
  id: string;
  type: 'youtube' | 'local';
  src: string;
  thumbSrc?: string;
  title: string;
  desc: string;
};

const FEATURED_VIDEOS: FeaturedVideo[] = [
  {
    id: 'f1',
    type: 'youtube',
    src: '5ZJ32Ax1NL4',
    title: 'Mariachi Internacional Cielito Lindo',
    desc: 'Comparte con nosotros nuestros recuerdos más simbólicos y llenos de tradición.',
  },
  {
    id: 'f2',
    type: 'local',
    src: new URL('../../medios/videos_destacados/IMG_3481.mp4', import.meta.url).href,
    thumbSrc: new URL('../../medios/fotos_pasarela/Pasarela_Cielito_Lindo_02.png', import.meta.url).href,
    title: 'La Excelencia en la Música',
    desc: 'La elegancia y el brillo de nuestra presentación capturados en momentos espontáneos.',
  },
  {
    id: 'f3',
    type: 'local',
    src: new URL('../../medios/videos_destacados/GDBE0890.mp4', import.meta.url).href,
    thumbSrc: new URL('../../medios/fotos_pasarela/Pasarela_Cielito_Lindo_05.jpg', import.meta.url).href,
    title: 'Sentimiento Ranchero',
    desc: 'Reviva la pasión y la energía de nuestra música en cada nota interpretada.',
  }
];

const YOUTUBE_SHOWCASE_VIDEOS = [
  {
    id: 'E1UdKNPtg0M',
    title: 'Serenata para Evento Social',
    desc: 'Mariachi Cielito Lindo acompañando una tarde social con música tradicional y ambiente familiar.',
    time: 'YouTube',
  },
  {
    id: 'FTynxzU390U',
    title: 'Show Romántico en Vivo',
    desc: 'Una presentación apasionada con repertorio romántico pensada para bodas, aniversarios y celebraciones de amor.',
    time: 'YouTube',
  },
  {
    id: '_0pC-9dGAcg',
    title: 'Actuación de Gala',
    desc: 'Actuación elegante de Mariachi Cielito Lindo en un entorno de gala con presencia escénica y energía musical.',
    time: 'YouTube',
  },
];

const SIMPLE_PHOTO_LABELS = [
  { title: 'Aniversarios', subtitle: 'Serenatas para celebrar momentos en pareja.' },
  { title: 'Celebraciones Especiales', subtitle: 'Presentaciones para fechas memorables.' },
  { title: 'Eventos Conmemorativos', subtitle: 'Acompanamiento musical en homenajes y reuniones.' },
  { title: 'Cumpleanos', subtitle: 'Shows en vivo para fiestas de cumpleanos.' },
  { title: 'Fiestas en Familia', subtitle: 'Ambiente alegre para compartir con seres queridos.' },
  { title: 'Gala Quinceanera', subtitle: 'Entrada y repertorio para noches de quince.' },
  { title: 'Graduaciones', subtitle: 'Musica especial para logros academicos.' },
  { title: 'Quinceaneras', subtitle: 'Mariachi en vivo para una celebracion inolvidable.' },
];

const PASARELA_SLIDES = Object.entries(PASARELA_PHOTOS)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([_, src], index) => {
    const label = SIMPLE_PHOTO_LABELS[index % SIMPLE_PHOTO_LABELS.length];
    return {
      src,
      title: label.title,
      subtitle: `Pasarela - ${label.subtitle}`,
    };
  });

const MODERN_SLIDES = Object.entries(MODERN_PHOTOS)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([_, src], index) => {
    const label = SIMPLE_PHOTO_LABELS[(index + PASARELA_SLIDES.length) % SIMPLE_PHOTO_LABELS.length];
    return {
      src,
      title: label.title,
      subtitle: label.subtitle,
    };
  });

const PHOTO_SLIDES = [...PASARELA_SLIDES, ...MODERN_SLIDES];

export default function GalleryView({ setView, onYoutubePlayerStateChange }: { setView: (v: ViewState) => void, onYoutubePlayerStateChange?: (isOpen: boolean) => void, key?: string }) {
  const [activePhoto, setActivePhoto] = useState(0);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [modalPhotoIndex, setModalPhotoIndex] = useState(0);
  const [activeVideoPlayer, setActiveVideoPlayer] = useState<FeaturedVideo | { id: string; type: 'youtube'; src: string; title: string; desc: string } | null>(null);
  const [activeFeaturedIndex, setActiveFeaturedIndex] = useState(0);

  const totalFeatured = FEATURED_VIDEOS.length;

  const totalPhotos = PHOTO_SLIDES.length;

  useEffect(() => {
    onYoutubePlayerStateChange?.(Boolean(activeVideoPlayer));
    return () => onYoutubePlayerStateChange?.(false);
  }, [activeVideoPlayer, onYoutubePlayerStateChange]);

  useEffect(() => {
    if (totalPhotos <= 1) return;
    const photoTimer = window.setInterval(() => {
      setActivePhoto((prev) => (prev + 1) % totalPhotos);
    }, 5000);

    const videoTimer = window.setInterval(() => {
      setActiveFeaturedIndex((prev) => (prev + 1) % totalFeatured);
    }, 8000); // 8 seconds per featured video slide

    return () => {
      window.clearInterval(photoTimer);
      window.clearInterval(videoTimer);
    };
  }, [totalPhotos, totalFeatured]);

  useEffect(() => {
    if (!isPhotoModalOpen || totalPhotos === 0) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsPhotoModalOpen(false);
      if (event.key === 'ArrowRight') setModalPhotoIndex((prev) => (prev + 1) % totalPhotos);
      if (event.key === 'ArrowLeft') setModalPhotoIndex((prev) => (prev - 1 + totalPhotos) % totalPhotos);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isPhotoModalOpen, totalPhotos]);

  const modalPhoto = useMemo(() => {
    if (totalPhotos === 0) return null;
    return PHOTO_SLIDES[modalPhotoIndex];
  }, [modalPhotoIndex, totalPhotos]);

  const openPhotoModal = (index: number) => {
    setModalPhotoIndex(index);
    setIsPhotoModalOpen(true);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="pt-32 pb-24 px-6 md:px-12 lg:px-24 min-h-screen bg-surface">
      <div className="max-w-7xl mx-auto">
        <h1 className="font-serif text-4xl md:text-7xl mb-6 text-on-surface">Galería de <span className="text-primary italic">Momentos</span> Inolvidables</h1>
        <p className="text-on-surface-variant font-light text-base md:text-lg max-w-2xl mb-12">Explore nuestra colección visual de presentaciones excepcionales, donde la tradición del mariachi se encuentra con la elegancia contemporánea.</p>

        {/* Hero Gallery + Featured Video */}
        <div className="grid grid-cols-1 lg:grid-cols-[45%_55%] gap-6 mb-24">
          <div className="relative group overflow-hidden rounded-3xl border border-outline-variant/20 bg-surface-container-low min-h-[360px] lg:min-h-[640px]">
            <img
              src={HERO_MAIN_PHOTO}
              alt="Foto principal de Mariachi Cielito Lindo"
              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-1000"
              loading="eager"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <p className="text-primary text-xs font-bold uppercase tracking-[0.18em] mb-2">Historia viva</p>
              <p className="text-white font-serif text-xl leading-tight">Somos la musica de tus historias, de tus logros y tus momentos.</p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-surface-container-low min-h-[340px] sm:min-h-[380px] lg:min-h-[640px] group cursor-pointer" onClick={() =>
            setActiveVideoPlayer(FEATURED_VIDEOS[activeFeaturedIndex])
          }>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeFeaturedIndex}
                initial={{ opacity: 0, scale: 1.1, x: 20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95, x: -20 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0"
              >
                <img
                  src={FEATURED_VIDEOS[activeFeaturedIndex].type === 'youtube' ? `https://img.youtube.com/vi/${FEATURED_VIDEOS[activeFeaturedIndex].src}/maxresdefault.jpg` : (FEATURED_VIDEOS[activeFeaturedIndex].thumbSrc || HERO_MAIN_PHOTO)}
                  alt={FEATURED_VIDEOS[activeFeaturedIndex].title}
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="lazy"
                />
              </motion.div>
            </AnimatePresence>

            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

            <div className="absolute inset-0 flex items-center justify-center">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveVideoPlayer(FEATURED_VIDEOS[activeFeaturedIndex]);
                }}
                className="hidden sm:flex w-20 h-20 md:w-24 md:h-24 rounded-full bg-primary/20 backdrop-blur-md border border-primary/50 items-center justify-center text-primary hover:bg-primary hover:text-on-primary transition-all"
                aria-label="Reproducir video"
              >
                <Play size={34} className="ml-1" />
              </motion.button>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 md:p-10">
              <motion.div
                key={`text-${activeFeaturedIndex}`}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="border border-primary/50 bg-primary/10 backdrop-blur-sm text-primary text-[10px] sm:text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full inline-block">Destacado</span>
                  <span className="bg-white/10 backdrop-blur-sm text-white/80 text-[10px] sm:text-xs font-medium px-3 py-1.5 rounded-full">
                    {activeFeaturedIndex + 1} de {totalFeatured}
                  </span>
                </div>
                <h3 className="font-serif text-2xl sm:text-3xl md:text-5xl leading-tight text-white mb-3 drop-shadow-lg">
                  {FEATURED_VIDEOS[activeFeaturedIndex].title}
                </h3>
                <p className="text-sm sm:text-base md:text-lg leading-relaxed text-white/80 max-w-2xl font-light">
                  {FEATURED_VIDEOS[activeFeaturedIndex].desc}
                </p>
              </motion.div>
            </div>

            {/* Barra de Progreso Cinematográfica */}
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/10 overflow-hidden">
              <motion.div
                key={`progress-${activeFeaturedIndex}`}
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 8, ease: "linear" }}
                className="h-full bg-primary shadow-[0_0_10px_rgba(255,203,70,0.8)]"
              />
            </div>

            {/* Navegación lateral sutil */}
            <div className="absolute top-1/2 -translate-y-1/2 left-4 right-4 flex justify-between pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => { e.stopPropagation(); setActiveFeaturedIndex(prev => (prev - 1 + totalFeatured) % totalFeatured); }}
                className="p-3 rounded-full bg-black/20 backdrop-blur-md border border-white/10 text-white pointer-events-auto hover:bg-primary hover:text-on-primary transition-all"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setActiveFeaturedIndex(prev => (prev + 1) % totalFeatured); }}
                className="p-3 rounded-full bg-black/20 backdrop-blur-md border border-white/10 text-white pointer-events-auto hover:bg-primary hover:text-on-primary transition-all"
              >
                <ChevronRight size={24} />
              </button>
            </div>
          </div>

        </div>

        {/* Video List */}
        <div className="mb-24">
          <div className="flex justify-between items-end mb-10">
            <div>
              <h2 className="font-serif text-3xl md:text-4xl text-on-surface mb-2">Presentaciones en Video</h2>
              <p className="text-on-surface-variant font-light">Disfrute de nuestra calidad sonora y presencia escénica.</p>
            </div>
            <a
              href="https://www.youtube.com/channel/UCqsvmHSNoKFsSGModRy3yuQ"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary flex items-center gap-2 font-label text-sm group"
            >
              Ver canal de YouTube <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {YOUTUBE_SHOWCASE_VIDEOS.map((vid) => (
              <button
                key={vid.id}
                type="button"
                onClick={() => setActiveVideoPlayer({ id: vid.id, type: 'youtube', src: vid.id, title: vid.title, desc: vid.desc })}
                className="group cursor-pointer block text-left"
              >
                <div className="relative overflow-hidden rounded-2xl mb-4 aspect-video bg-surface-container">
                  <img
                    src={`https://img.youtube.com/vi/${vid.id}/hqdefault.jpg`}
                    alt={vid.title}
                    className="w-full h-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-700"
                    loading="lazy"
                  />
                  <div className="absolute bottom-3 right-3 bg-surface/80 backdrop-blur-sm px-2 py-1 rounded text-xs font-mono text-on-surface">{vid.time}</div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center text-on-primary shadow-lg">
                      <Play size={24} className="ml-1" />
                    </div>
                  </div>
                </div>
                <h4 className="font-serif text-xl text-on-surface mb-1 group-hover:text-primary transition-colors">{vid.title}</h4>
                <p className="text-sm text-on-surface-variant">{vid.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Photo Showcase */}
        <div className="mb-24">
          <div className="flex justify-between items-end mb-10">
            <div>
              <h2 className="font-serif text-3xl md:text-4xl text-on-surface mb-2">Pasarela de Fotos</h2>
              <p className="text-on-surface-variant font-light">Instantes reales de nuestras presentaciones en eventos privados y corporativos.</p>
            </div>
            <a
              href="https://www.instagram.com/mariachicielitolindoec/?hl=en"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary flex items-center gap-2 font-label text-sm group"
            >
              Ver Instagram <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </a>
          </div>

          {totalPhotos > 0 ? (
            <>
              <button
                onClick={() => openPhotoModal(activePhoto)}
                className="relative block w-full overflow-hidden rounded-3xl border border-outline-variant/20 bg-surface-container-lowest aspect-[16/10] md:aspect-[21/9] mb-5 group"
              >
                {PHOTO_SLIDES.map((photo, index) => (
                  <img
                    key={photo.src}
                    src={photo.src}
                    alt={photo.subtitle}
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[1400ms] ${index === activePhoto ? 'opacity-100' : 'opacity-0'
                      }`}
                    loading="lazy"
                  />
                ))}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

                <div className="absolute bottom-0 left-0 right-0 p-5 md:p-7 text-left">
                  <p className="text-primary text-xs md:text-sm uppercase tracking-[0.18em] mb-2 font-bold">Galería en vivo</p>
                  <p className="text-white text-xl md:text-3xl font-serif">{PHOTO_SLIDES[activePhoto].title}</p>
                  <p className="text-white/85 text-sm md:text-base mt-1">{PHOTO_SLIDES[activePhoto].subtitle}</p>
                </div>

                <div className="absolute top-4 right-4 bg-black/45 text-white text-xs md:text-sm px-3 py-1.5 rounded-full border border-white/20">
                  {activePhoto + 1} / {totalPhotos}
                </div>

                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <span className="px-5 py-2.5 rounded-full bg-primary/90 text-on-primary font-bold text-sm">Click para navegar</span>
                </div>
              </button>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {PHOTO_SLIDES.slice(0, 4).map((photo, index) => (
                  <button
                    key={photo.src}
                    onClick={() => openPhotoModal(index)}
                    className="relative overflow-hidden rounded-2xl border border-outline-variant/20 aspect-[4/3] group"
                  >
                    <img src={photo.src} alt={photo.subtitle} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
                    <div className="absolute bottom-2 left-2 right-2 text-left">
                      <p className="text-white text-xs md:text-sm font-semibold truncate">{photo.subtitle}</p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-3xl border border-outline-variant/20 bg-surface-container-lowest p-8 text-on-surface-variant">
              No se encontraron fotos en la carpeta moderna.
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="bg-surface-container-low rounded-3xl p-16 text-center border border-outline-variant/10 ambient-shadow">
          <h2 className="font-serif text-3xl md:text-4xl text-on-surface mb-4">¿Desea capturar estos momentos en su evento?</h2>
          <p className="text-on-surface-variant font-light text-base md:text-lg mb-10 max-w-2xl mx-auto">Solicite una cotización personalizada y permítanos ser la banda sonora de su historia.</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button onClick={() => setView('contact')} className="gold-gradient text-on-primary px-8 py-4 font-bold rounded-full hover:shadow-[0_0_20px_rgba(255,203,70,0.3)] transition-all">Cotizar Evento</button>
            <button onClick={() => setView('repertoire')} className="border border-outline-variant text-on-surface px-8 py-4 font-bold rounded-full hover:bg-surface-container transition-colors">Ver Repertorio</button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {activeVideoPlayer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-sm p-4 md:p-8 flex items-center justify-center"
            onClick={() => setActiveVideoPlayer(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.96 }}
              transition={{ duration: 0.25 }}
              className="w-full max-w-6xl rounded-3xl overflow-hidden border border-outline-variant/20 bg-surface-container-low ambient-shadow"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="px-5 md:px-6 py-4 border-b border-outline-variant/20 flex items-center justify-between gap-3">
                <div>
                  <p className="font-serif text-xl text-on-surface">{activeVideoPlayer.title}</p>
                  <p className="text-xs text-on-surface-variant">{activeVideoPlayer.desc}</p>
                </div>
                <button onClick={() => setActiveVideoPlayer(null)} className="text-on-surface-variant hover:text-on-surface p-2" aria-label="Cerrar reproductor">
                  <X size={20} />
                </button>
              </div>
              <div className="aspect-video bg-black flex items-center justify-center">
                {activeVideoPlayer.type === 'youtube' ? (
                  <iframe
                    className="w-full h-full"
                    src={`https://www.youtube.com/embed/${activeVideoPlayer.src}?autoplay=1&rel=0`}
                    title={`YouTube player - ${activeVideoPlayer.title}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video
                    className="w-full h-full max-h-[80vh] object-contain"
                    controls
                    autoPlay
                    muted
                    playsInline
                    webkit-playsinline="true"
                    preload="metadata"
                    src={activeVideoPlayer.src}
                  >
                    Tu navegador no soporta videos HTML5.
                  </video>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}

        {isPhotoModalOpen && modalPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm p-4 md:p-8 flex items-center justify-center"
            onClick={() => setIsPhotoModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.96 }}
              transition={{ duration: 0.25 }}
              className="w-full max-w-6xl rounded-3xl overflow-hidden border border-outline-variant/20 bg-surface-container-low ambient-shadow"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="relative bg-black aspect-[16/10] md:aspect-[16/9]">
                <img src={modalPhoto.src} alt={modalPhoto.subtitle} className="w-full h-full object-contain" loading="eager" />

                <button
                  onClick={() => setIsPhotoModalOpen(false)}
                  className="absolute top-4 right-4 w-10 h-10 rounded-full border border-white/25 bg-black/45 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                  aria-label="Cerrar visor"
                >
                  <X size={18} />
                </button>

                <button
                  onClick={() => setModalPhotoIndex((prev) => (prev - 1 + totalPhotos) % totalPhotos)}
                  className="absolute left-3 md:left-5 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 rounded-full border border-white/30 bg-black/45 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                  aria-label="Foto anterior"
                >
                  <ChevronLeft size={22} />
                </button>

                <button
                  onClick={() => setModalPhotoIndex((prev) => (prev + 1) % totalPhotos)}
                  className="absolute right-3 md:right-5 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 rounded-full border border-white/30 bg-black/45 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                  aria-label="Foto siguiente"
                >
                  <ChevronRight size={22} />
                </button>
              </div>

              <div className="px-5 md:px-6 py-4 border-t border-outline-variant/20 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <p className="font-serif text-xl text-on-surface">{modalPhoto.title}</p>
                  <p className="text-sm text-on-surface-variant">{modalPhoto.subtitle}</p>
                </div>
                <p className="text-sm text-primary font-semibold">{modalPhotoIndex + 1} de {totalPhotos}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
