

# Mariachi Internacional Cielito Lindo - Web App

Este repositorio contiene la aplicación web oficial de Mariachi Internacional Cielito Lindo. La web está construida con React, Vite y Firebase, y está preparada para desplegar desde la rama `main` en Netlify.

## Funcionalidades principales

- Interfaz SPA responsiva con animaciones suaves usando `motion`.
- Página de inicio con audio de fondo y contenido visual moderno.
- Sección **Nosotros** con información del mariachi, su experiencia y servicio.
- **Galería** con fotos y videos en vivo, compatible con reproductores de video y vistas multimedia.
- **Repertorio** dinámico que muestra canciones, repertorios y ejemplos de eventos.
- **Reseñas** en tiempo real conectadas a Firestore, con un carrusel para mostrar reseñas destacadas.
- **Contacto** directo vía WhatsApp y formulario para solicitudes de reserva.
- Soporte para **APK/descarga de aplicación** en la web y sección de promoción de la app.
- **Administración privada** para moderar reseñas y revisar contenido desde un portal seguro.
- **SEO dinámico** por ruta para mejorar títulos, descripciones y Open Graph en cada sección.
- Soporte **PWA/TWA** con manifest y service worker para mejor experiencia móvil.
- Integración con **Firebase** para Auth, Firestore y datos en tiempo real.

## Tecnologías usadas

- React 19 + TypeScript
- Vite
- Tailwind CSS
- Firebase (Auth, Firestore)
- React Router
- Framer Motion
- Netlify para despliegue
- PWA y TWA

## Ejecutar localmente

**Requisitos:** Node.js

1. Instala dependencias:
   ```bash
   npm install
   ```
2. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```
3. Abre `http://localhost:3000` en el navegador.

## Despliegue en Netlify

Este proyecto ya incluye un `netlify.toml` listo para producción.

- Build command: `npm run build`
- Publish directory: `dist`

Pasos:
1. Empuja el repositorio a GitHub.
2. Crea un sitio nuevo en Netlify desde este repositorio.
3. Configura los valores de build anteriores si es necesario.
4. Lanza el despliegue.

## Notas importantes

- La aplicación es una SPA y `netlify.toml` maneja el redirect a `index.html`.
- La configuración de Firebase se carga desde `firebase-applet-config.json`.
- Para despliegue, usa la rama `main` desde el repositorio laboral.
