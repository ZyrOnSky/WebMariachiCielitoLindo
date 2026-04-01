import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Play, ArrowRight, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { ViewState } from '../types';

const PHOTO_MODULES = import.meta.glob('../../medios/fotos_pasarela/*.{jpg,jpeg,png,JPG,JPEG,PNG}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

const HERO_MAIN_PHOTO = new URL('../../medios/foto_principal/gradasOK.png', import.meta.url).href;
const FEATURED_YOUTUBE_ID = '24xCQqxjg4M';

const YOUTUBE_SHOWCASE_VIDEOS = [
  {
    id: 'Ha9BfNNvm4w',
    title: 'Presentacion en Vivo 1',
    desc: 'Interpretacion especial de Mariachi Cielito Lindo',
    time: 'YouTube',
  },
  {
    id: 'tz18k7XmvBg',
    title: 'Presentacion en Vivo 2',
    desc: 'Show en evento social con repertorio romantico',
    time: 'YouTube',
  },
  {
    id: 'x8G1Wecswuw',
    title: 'Presentacion en Vivo 3',
    desc: 'Actuacion destacada con ambiente de gala',
    time: 'YouTube',
  },
];

const PRETTY_PHOTO_LABELS = [
  { title: 'Noche de Serenata', subtitle: 'Presentacion especial en evento privado' },
  { title: 'Elegancia en Escena', subtitle: 'Show en recepcion social' },
  { title: 'Tradicion Viva', subtitle: 'Interpretacion clasica con traje de gala' },
  { title: 'Gala Mariachi', subtitle: 'Ambientacion premium y repertorio romantico' },
  { title: 'Boda Inolvidable', subtitle: 'Acompanamiento musical para novios' },
  { title: 'Fiesta de Quince', subtitle: 'Entrada especial y canciones dedicadas' },
  { title: 'Celebracion Familiar', subtitle: 'Momentos unicos con musica en vivo' },
  { title: 'Escenario Corporativo', subtitle: 'Presentacion para eventos de marca' },
  { title: 'Noche Mexicana', subtitle: 'Color, tradicion y alegria en cada tema' },
  { title: 'Repertorio Premium', subtitle: 'Seleccion de clasicos y actuales' },
  { title: 'Encuentro Social', subtitle: 'Experiencia musical para invitados' },
  { title: 'Momento Especial', subtitle: 'Detalle artistico para una fecha importante' },
  { title: 'Pasion Mariachi', subtitle: 'Voces e instrumentos con alta calidad' },
  { title: 'Cierre de Gala', subtitle: 'Final emotivo para una gran noche' },
];

const PHOTO_SLIDES = Object.entries(PHOTO_MODULES)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([_, src], index) => {
    const label = PRETTY_PHOTO_LABELS[index % PRETTY_PHOTO_LABELS.length];
    return {
      src,
      title: label.title,
      subtitle: label.subtitle,
    };
  });

export default function GalleryView({ setView }: { setView: (v: ViewState) => void, key?: string }) {
  const [activePhoto, setActivePhoto] = useState(0);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [modalPhotoIndex, setModalPhotoIndex] = useState(0);
  const [activeVideoPlayer, setActiveVideoPlayer] = useState<{ id: string; title: string; desc: string } | null>(null);

  const totalPhotos = PHOTO_SLIDES.length;

  useEffect(() => {
    if (totalPhotos <= 1) return;
    const timer = window.setInterval(() => {
      setActivePhoto((prev) => (prev + 1) % totalPhotos);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [totalPhotos]);

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
              <p className="text-on-surface font-serif text-xl leading-tight">Somos la musica de tus historias, de tus logros y tus momentos.</p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-surface-container-low min-h-[380px] lg:min-h-[640px] group">
            <img
              src={`https://img.youtube.com/vi/${FEATURED_YOUTUBE_ID}/maxresdefault.jpg`}
              alt="Video destacado de Mariachi Cielito Lindo"
              className="absolute inset-0 w-full h-full object-cover"
              loading="eager"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/35 to-black/15" />

            <div className="absolute inset-0 flex items-center justify-center">
              <button
                onClick={() =>
                  setActiveVideoPlayer({
                    id: FEATURED_YOUTUBE_ID,
                    title: 'Mariachi Internacional Cielito Lindo',
                    desc: 'Comparte con nosotros nuesros recuerdos mas simbolicos junto a ustedes.',
                  })
                }
                className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-primary/20 backdrop-blur-md border border-primary/50 flex items-center justify-center text-primary hover:bg-primary hover:text-on-primary transition-all group-hover:scale-110"
                aria-label="Reproducir video destacado"
              >
                <Play size={34} className="ml-1" />
              </button>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
              <span className="border border-primary text-primary text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4 inline-block">Video Destacado</span>
              <h3 className="font-serif text-2xl md:text-4xl text-on-surface mb-2">Mariachi Internacional Cielito Lindo</h3>
              <p className="text-sm md:text-base text-on-surface-variant">Comparte con nosotros nuesros recuerdos mas simbolicos junto a ustedes.</p>
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
            <button className="text-primary flex items-center gap-2 font-label text-sm group">
              Ver canal de YouTube <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {YOUTUBE_SHOWCASE_VIDEOS.map((vid) => (
              <button
                key={vid.id}
                type="button"
                onClick={() => setActiveVideoPlayer({ id: vid.id, title: vid.title, desc: vid.desc })}
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
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[1400ms] ${
                      index === activePhoto ? 'opacity-100' : 'opacity-0'
                    }`}
                    loading="lazy"
                  />
                ))}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

                <div className="absolute bottom-0 left-0 right-0 p-5 md:p-7 text-left">
                  <p className="text-primary text-xs md:text-sm uppercase tracking-[0.18em] mb-2 font-bold">Galería en vivo</p>
                  <p className="text-on-surface text-xl md:text-3xl font-serif">{PHOTO_SLIDES[activePhoto].title}</p>
                  <p className="text-on-surface-variant text-sm md:text-base mt-1">{PHOTO_SLIDES[activePhoto].subtitle}</p>
                </div>

                <div className="absolute top-4 right-4 bg-black/45 text-on-surface text-xs md:text-sm px-3 py-1.5 rounded-full border border-white/20">
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
                      <p className="text-on-surface text-xs md:text-sm font-semibold truncate">{photo.subtitle}</p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-3xl border border-outline-variant/20 bg-surface-container-lowest p-8 text-on-surface-variant">
              No se encontraron fotos en la carpeta de pasarela.
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
              <div className="aspect-video bg-black">
                <iframe
                  className="w-full h-full"
                  src={`https://www.youtube.com/embed/${activeVideoPlayer.id}?autoplay=1&rel=0`}
                  title={`YouTube player - ${activeVideoPlayer.title}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
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
