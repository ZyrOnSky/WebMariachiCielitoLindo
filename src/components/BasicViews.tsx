import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronRight, PlayCircle, ArrowRight, Phone, Mail, MapPin, Music } from 'lucide-react';
import { ViewState } from '../types';

const ABOUT_BG_VIDEOS = [
  new URL('../../medios/videos_bg/hero_cinco.mp4', import.meta.url).href,
  new URL('../../medios/videos_bg/hero_doce.mp4', import.meta.url).href,
  new URL('../../medios/videos_bg/hero_seis.mp4', import.meta.url).href,
];

const CONTACT_BG_IMAGE = new URL('../../medios/foto_principal/gradasOK.png', import.meta.url).href;

export const HomeView = ({ setView }: { setView: (v: ViewState) => void, key?: string }) => {
  return (
    <motion.section 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="relative h-screen w-full flex items-center justify-center overflow-hidden"
    >
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-surface/70 z-10 mix-blend-multiply"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-surface/50 to-surface z-10"></div>
        <img src="https://images.unsplash.com/photo-1511192336575-5a79af67a629?q=80&w=2664&auto=format&fit=crop" alt="Mariachi cantando" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
      </div>
      <div className="relative z-20 text-center px-6 max-w-5xl mt-20">
        <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.2 }} className="font-serif text-5xl md:text-7xl lg:text-8xl mb-6 text-primary tracking-tight leading-tight text-shadow-editorial">
          La Excelencia de la <br /> <span className="italic font-light text-on-surface">Música Mexicana</span>
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.6 }} className="font-body text-lg md:text-xl text-on-surface-variant max-w-2xl mx-auto mb-12 font-light tracking-wide">
          Elevamos sus celebraciones con interpretaciones magistrales y la elegancia que solo el mejor Mariachi puede ofrecer.
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.8 }} className="flex flex-col sm:flex-row items-center justify-center gap-6">
          <button onClick={() => setView('repertoire')} className="gold-gradient text-on-primary px-10 py-4 font-bold text-lg hover:shadow-[0_0_30px_rgba(255,203,70,0.3)] transition-all rounded-full flex items-center gap-2">
            Ver Repertorio <ChevronRight size={20} />
          </button>
          <button onClick={() => setView('gallery')} className="border border-outline-variant text-primary px-10 py-4 font-bold text-lg hover:bg-surface-container transition-all flex items-center gap-3 rounded-full">
            <PlayCircle size={24} /> Ver Presentaciones
          </button>
        </motion.div>
      </div>
    </motion.section>
  );
};

export const AboutView = ({ setView }: { setView: (v: ViewState) => void, key?: string }) => {
  const [activeVideo, setActiveVideo] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveVideo((prev) => (prev + 1) % ABOUT_BG_VIDEOS.length);
    }, 9000);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="py-28 px-6 md:px-12 lg:px-24 bg-surface relative">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="relative overflow-hidden rounded-3xl border border-outline-variant/10 min-h-[760px]">
          {ABOUT_BG_VIDEOS.map((src, index) => (
            <video
              key={src}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[1800ms] ${
                index === activeVideo ? 'opacity-100' : 'opacity-0'
              }`}
              src={src}
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
            />
          ))}

          <div className="absolute inset-0 bg-gradient-to-r from-black/15 via-black/40 to-black/82" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-14 items-start p-6 md:p-10 lg:p-12 min-h-[760px]">
            <div className="flex items-end h-full">
              <div className="bg-surface-container-low/90 backdrop-blur-sm p-6 border border-outline-variant/30 max-w-xs ambient-shadow rounded-2xl">
                <p className="font-serif text-2xl text-primary mb-2">Desde 2007</p>
                <p className="text-sm text-on-surface-variant">Trayectoria activa en escenarios institucionales, culturales y televisivos.</p>
              </div>
            </div>

            <div>
              <span className="text-primary font-bold tracking-[0.2em] text-4xl md:text-5xl mb-4 block uppercase">Nuestra Historia</span>
              <h2 className="font-serif text-5xl md:text-7xl mb-8 leading-tight text-white">Cómo Nació Cielito Lindo</h2>
              <div className="space-y-5 text-white/90 font-light text-lg md:text-xl leading-relaxed">
                <p>Mariachi Internacional Cielito Lindo nace como una inspiración musical de la Lcda. Paola Madero, quien ya contaba con trayectoria como violinista en otras agrupaciones de Mariachi de la ciudad de Guayaquil.</p>
                <p>Desde sus inicios, el proyecto fue concebido para recrear los mejores momentos de la música mexicana e internacional, brindando prestancia, alegría y vitalidad en cada actuación.</p>
                <p>A través de los años, la agrupación ha recorrido diversos escenarios y se ha consolidado como un referente artístico por su calidad vocal, su ejecución instrumental y su presencia escénica.</p>
              </div>

              <button onClick={() => setView('gallery')} className="mt-10 text-primary font-bold flex items-center gap-3 group border-b border-primary/30 pb-2 hover:border-primary transition-colors">
                Ver nuestra galería <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-surface-container-low border border-outline-variant/10 rounded-3xl p-6 md:p-10 ambient-shadow">
        <h3 className="font-serif text-4xl md:text-5xl text-on-surface mb-6">Hitos de Trayectoria</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
          <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-2xl p-5">
            <p className="text-primary font-bold text-base mb-2">Julio 2007</p>
            <p className="text-on-surface-variant text-base leading-relaxed">Participación en Las Musimuestras del Municipio de Guayaquil, en colaboración con la Embajada de México.</p>
          </div>
          <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-2xl p-5">
            <p className="text-primary font-bold text-base mb-2">24 Sept 2018</p>
            <p className="text-on-surface-variant text-base leading-relaxed">Presentación en Babahoyo para la festividad de la Virgen de las Mercedes, organizada por la alcaldía de la ciudad.</p>
          </div>
          <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-2xl p-5">
            <p className="text-primary font-bold text-base mb-2">15 Sept 2019</p>
            <p className="text-on-surface-variant text-base leading-relaxed">Participación en mega evento del Museo Julio Jaramillo por las fiestas patrias mexicanas.</p>
          </div>
        </div>
      </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-surface-container-low border border-outline-variant/10 rounded-3xl p-6 md:p-8">
          <h4 className="font-serif text-3xl text-on-surface mb-4">Artistas y Escenarios</h4>
          <p className="text-on-surface-variant leading-relaxed text-base md:text-lg">Nuestra agrupación ha acompañado a destacadas estrellas internacionales como Ana Gabriel, Julio Zavala, Margarita Rosa de Francisco, José Feliciano y Fer (cantante de Maná). En el plano nacional, hemos compartido escenario con Juanita Córdova, Tábata Gálvez, Tito del Salto, Marcia Casanova, Ronex y Freddy Rivadeneira, entre otros.</p>
          <p className="text-on-surface-variant leading-relaxed text-base md:text-lg mt-4">Participamos permanentemente en programas de televisión nacional como En Contacto, Está Clarito, Cosas de Casa, Noche a Noche con Marián, Simplemente Mariela, Viva la Mañana y El Club de la Mañana.</p>
        </div>

        <div className="bg-surface-container-low border border-outline-variant/10 rounded-3xl p-6 md:p-8">
          <h4 className="font-serif text-3xl text-on-surface mb-4">¿Por Qué Nos Prefieren?</h4>
          <div className="space-y-3 text-on-surface-variant text-base md:text-lg leading-relaxed">
            <p>Ofrecemos la mejor calidad en voces e instrumentos, con vestuario de mariachi acorde a la ocasión y una presentación profesional.</p>
            <p>Contamos con un amplio repertorio para cada serenata y cada tipo de evento, adaptando el setlist a lo que el cliente necesita.</p>
            <p>Nuestros músicos son seleccionados bajo un estricto control de calidad, garantizando performance, compromiso y seriedad en cada presentación.</p>
            <p>Creemos que el precio siempre va de la mano con la calidad. Nuestros clientes reciben un servicio responsable, puntual y de alto nivel artístico.</p>
          </div>
        </div>
        </div>
    </div>
    </motion.section>
  );
};

export const ContactView = () => {
  const paymentMethods = [
    { name: 'Banco Guayaquil', src: new URL('../../medios/formas_de_pago/baguayquil.svg', import.meta.url).href },
    { name: 'Banco del Pacifico', src: new URL('../../medios/formas_de_pago/bapacifico.svg', import.meta.url).href },
    { name: 'Diners', src: new URL('../../medios/formas_de_pago/diners.svg', import.meta.url).href },
    { name: 'Google Pay', src: new URL('../../medios/formas_de_pago/googlepay.svg', import.meta.url).href },
    { name: 'MasterCard', src: new URL('../../medios/formas_de_pago/master.svg', import.meta.url).href },
    { name: 'Apple Pay', src: new URL('../../medios/formas_de_pago/payapple.svg', import.meta.url).href },
    { name: 'PayPal', src: new URL('../../medios/formas_de_pago/paypal.svg', import.meta.url).href },
    { name: 'PayPhone', src: new URL('../../medios/formas_de_pago/payphone.svg', import.meta.url).href },
    { name: 'Banco Pichincha', src: new URL('../../medios/formas_de_pago/pichincha.svg', import.meta.url).href },
    { name: 'Produbanco', src: new URL('../../medios/formas_de_pago/produbanco.svg', import.meta.url).href },
    { name: 'American Express', src: new URL('../../medios/formas_de_pago/taamerican.svg', import.meta.url).href },
    { name: 'Western Union', src: new URL('../../medios/formas_de_pago/western.svg', import.meta.url).href },
  ];

  const tickerItems = [...paymentMethods, ...paymentMethods];

  return (
    <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="py-32 px-6 md:px-12 lg:px-24 bg-surface-container-low relative overflow-hidden min-h-screen flex items-center">
      <div className="absolute inset-0 z-0">
        <img src={CONTACT_BG_IMAGE} alt="Fondo Mariachi Cielito Lindo" className="w-full h-full object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-black/80" />
      </div>
      <div className="max-w-7xl mx-auto grid grid-cols-1 gap-14 relative z-10 w-full">
        <div className="w-full flex justify-center lg:justify-start">
          <h2 className="font-serif text-center lg:text-left text-[5.5rem] md:text-[8rem] lg:text-[11rem] leading-[0.82] tracking-[-0.04em] text-white drop-shadow-[0_4px_22px_rgba(0,0,0,0.8)] max-w-none">
            Agende una <br />
            <span className="text-primary italic">Experiencia</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-16 items-start">
          <div>
            <div className="space-y-6 md:space-y-10">
              <div className="flex items-start gap-3 md:gap-6">
                <div className="w-10 h-10 md:w-12 md:h-12 border border-outline-variant/30 flex items-center justify-center text-primary flex-shrink-0 rounded-full"><Phone size={18} className="md:w-5 md:h-5" /></div>
                <div>
                  <p className="text-xs text-white/70 uppercase tracking-widest mb-2 md:mb-3 font-bold">Teléfonos</p>
                  <div className="space-y-1 md:space-y-2">
                    <div>
                      <p className="text-xs text-white/65 mb-0.5 md:mb-1">Llamadas:</p>
                      <p className="text-base md:text-lg font-medium text-white">0992882624</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/65 mb-0.5 md:mb-1">WhatsApp y llamadas:</p>
                      <p className="text-base md:text-lg font-medium text-white">0987216439</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3 md:gap-6">
                <div className="w-10 h-10 md:w-12 md:h-12 border border-outline-variant/30 flex items-center justify-center text-primary flex-shrink-0 rounded-full"><Mail size={18} className="md:w-5 md:h-5" /></div>
                  <div>
                    <p className="text-xs text-white/70 uppercase tracking-widest mb-2 md:mb-2 font-bold">Correo Electrónico</p>
                    <p className="text-xs sm:text-sm md:text-lg lg:text-xl font-medium text-white leading-tight break-normal">
                      mariachicielitolindoecuador<wbr />@gmail.com
                    </p>
                  </div>
              </div>
              <div className="flex items-start gap-3 md:gap-6">
                <div className="w-10 h-10 md:w-12 md:h-12 border border-outline-variant/30 flex items-center justify-center text-primary flex-shrink-0 rounded-full"><MapPin size={18} className="md:w-5 md:h-5" /></div>
                <div><p className="text-xs text-white/70 uppercase tracking-widest mb-2 md:mb-2 font-bold">Ubicación</p><p className="text-base md:text-xl font-medium text-white">Cdla. Bolivariana Mz. I VILLA 4<br />Guayaquil – Ecuador.</p></div>
              </div>
            </div>
          </div>

          <div className="contact-overlay-card backdrop-blur-md p-10 md:p-14 border border-outline-variant/10 ambient-shadow rounded-3xl text-center">
            <h3 className="contact-card-title font-serif text-3xl mb-4">Cotiza por WhatsApp</h3>
            <p className="contact-card-copy mb-8">Escríbenos directamente y te ayudamos a reservar la mejor serenata para tu evento.</p>
            <a
              href="https://api.whatsapp.com/send/?phone=593987216439&text=%21Buen+d%C3%ADa%21+Deseo+la+mejor+serenata+de+Guayaquil%21&type=phone_number&app_absent=0"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gold-gradient text-on-primary px-10 py-5 font-bold text-lg hover:shadow-[0_0_30px_rgba(255,203,70,0.3)] transition-all rounded-full"
            >
              Ir a WhatsApp
            </a>
          </div>
        </div>

        <div className="contact-overlay-card backdrop-blur-md border border-outline-variant/10 rounded-3xl p-6 md:p-8 ambient-shadow overflow-hidden">
          <div className="flex items-center mb-5">
            <h3 className="contact-card-title font-serif text-2xl md:text-3xl">Formas de Pago</h3>
          </div>

          <div className="contact-payment-strip relative overflow-hidden rounded-2xl border border-outline-variant/20 py-5">
            <motion.div
              className="flex items-center gap-6 w-max px-4"
              animate={{ x: ['0%', '-50%'] }}
              transition={{ duration: 26, ease: 'linear', repeat: Infinity }}
            >
              {tickerItems.map((method, index) => (
                <div key={`${method.name}-${index}`} className="contact-payment-card w-36 h-20 md:w-44 md:h-24 backdrop-blur-sm rounded-xl border border-outline-variant/30 flex items-center justify-center p-3 md:p-4 shadow-sm">
                  <img src={method.src} alt={method.name} className="w-auto h-[3.9rem] md:h-[5.4rem] object-contain" loading="lazy" />
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </motion.section>
  );
};
