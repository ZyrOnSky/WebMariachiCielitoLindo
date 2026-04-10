import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Componente que escucha los cambios de ubicación (URL) y
 * desplaza la ventana hacia la parte superior (0,0).
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
