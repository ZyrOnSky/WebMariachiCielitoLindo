import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { ArrowDownAZ, ArrowUpZA, Download, FileSpreadsheet, AlertTriangle, Music, Database, PlayCircle, Pencil, Trash2, Youtube, X, Loader2 } from 'lucide-react';

interface Song {
  id: string;
  title: string;
  artist: string;
  genres: string[];
  occasions: string[];
  youtubeUrl?: string;
  link?: string;
}

function normalizeString(str: string) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

type SortField = 'title' | 'artist';
type SortDirection = 'asc' | 'desc';

interface AdminAdvancedListProps {
  songs: Song[];
  onPlay: (song: Song) => void;
  onEdit: (song: Song) => void;
  onDelete: (id: string) => void;
}

export default function AdminAdvancedList({ songs, onPlay, onEdit, onDelete }: AdminAdvancedListProps) {
  const [sortField, setSortField] = useState<SortField>('title');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [activeLetter, setActiveLetter] = useState<string | null>(null);

  // Estados para modales de confirmación
  const [showExcelConfirm, setShowExcelConfirm] = useState(false);
  const [showJsonConfirm, setShowJsonConfirm] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Detectar duplicados (por título normalizado idéntico)
  const duplicatesMap = useMemo(() => {
    const titleCounts = new Map<string, number>();
    songs.forEach(song => {
      const normTitle = normalizeString(song.title);
      titleCounts.set(normTitle, (titleCounts.get(normTitle) || 0) + 1);
    });
    return titleCounts;
  }, [songs]);

  // Detectar anomalías en nombres de artistas (diferentes formas de escribir el mismo artista)
  const artistAnomaliesMap = useMemo(() => {
    const artistVariants = new Map<string, Set<string>>();
    songs.forEach(song => {
      const normArtist = normalizeString(song.artist);
      if (!artistVariants.has(normArtist)) {
        artistVariants.set(normArtist, new Set());
      }
      artistVariants.get(normArtist)!.add(song.artist); // Guarda el formato original
    });
    return artistVariants;
  }, [songs]);

  // Lista ordenada, procesada y filtrada
  const processedSongs = useMemo(() => {
    return [...songs].sort((a, b) => {
      let valA = a[sortField].toLowerCase();
      let valB = b[sortField].toLowerCase();
      
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    }).map(song => {
      const normTitle = normalizeString(song.title);
      const titleCount = duplicatesMap.get(normTitle) || 1;
      
      const normArtist = normalizeString(song.artist);
      const isArtistAnomaly = (artistAnomaliesMap.get(normArtist)?.size || 1) > 1;

      return {
        ...song,
        isDuplicate: titleCount > 1,
        isArtistAnomaly
      };
    }).filter(song => {
      if (!activeLetter) return true;
      const targetString = normalizeString(song[sortField]);
      if (!targetString) return false;
      
      const firstChar = targetString.charAt(0);
      if (activeLetter === '#') {
        return /^[0-9]/.test(firstChar); // Retorna true si es número
      }
      return firstChar === activeLetter.toLowerCase();
    });
  }, [songs, sortField, sortDirection, duplicatesMap, artistAnomaliesMap, activeLetter]);

  const totalSongs = songs.length;
  const duplicateCount = songs.filter(s => (duplicatesMap.get(normalizeString(s.title)) || 1) > 1).length;
  // Calculamos el número total de artistas que presentan anomalías (aquellos cuyo nombre base tiene múltiples variantes)
  const artistAnomalyCount = Array.from(artistAnomaliesMap.values()).filter(set => set.size > 1).length;

  const alphabet = ['#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowDownAZ size={14} className="opacity-30" />;
    return sortDirection === 'asc' ? <ArrowDownAZ size={14} className="text-primary" /> : <ArrowUpZA size={14} className="text-primary" />;
  };

  const confirmAndExportExcel = async () => {
    setIsExporting(true);
    try {
      const ExcelJS = (await import('exceljs')).default || await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Mariachi Cielito Lindo';
      
      // ============================================
      // 1. HOJA DE RESUMEN (Dashboard)
      // ============================================
      const summarySheet = workbook.addWorksheet('Resumen de Repertorio');
      summarySheet.columns = [
        { header: 'Indicador / Categoría', key: 'metric', width: 35 },
        { header: 'Total', key: 'value', width: 15 },
      ];
      
      // Estilo de encabezado
      summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      summarySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBA8E23' } }; // Dorado Cielito Lindo

      // Estadísticas Globales
      summarySheet.addRow({ metric: 'Total de Canciones', value: totalSongs });
      summarySheet.addRow({ metric: 'Variantes / Duplicados Detectados', value: duplicateCount });
      summarySheet.addRow({ metric: 'Artistas con Anomalías de Escritura', value: artistAnomalyCount });
      
      // Resaltar globales
      [2, 3, 4].forEach(row => {
        summarySheet.getRow(row).font = { bold: true };
      });

      // Cálculos de categorías
      const genresCount: Record<string, number> = {};
      const occasionCount: Record<string, number> = {};
      const artistCount: Record<string, number> = {};
      
      songs.forEach(s => {
        s.genres.forEach(g => { genresCount[g] = (genresCount[g] || 0) + 1; });
        s.occasions.forEach(o => { occasionCount[o] = (occasionCount[o] || 0) + 1; });
        const art = normalizeString(s.artist);
        artistCount[art] = (artistCount[art] || 0) + 1;
      });

      // Dist. Géneros
      summarySheet.addRow([]);
      summarySheet.addRow({ metric: 'DISTRIBUCIÓN POR GÉNERO', value: '' });
      summarySheet.lastRow!.font = { bold: true, color: { argb: 'FF1A73E8' } };
      Object.entries(genresCount).sort((a,b) => b[1] - a[1]).forEach(([g, c]) => {
        summarySheet.addRow({ metric: g, value: c });
      });

      // Dist. Ocasiones
      summarySheet.addRow([]);
      summarySheet.addRow({ metric: 'DISTRIBUCIÓN POR OCASIÓN', value: '' });
      summarySheet.lastRow!.font = { bold: true, color: { argb: 'FF1A73E8' } };
      Object.entries(occasionCount).sort((a,b) => b[1] - a[1]).forEach(([o, c]) => {
        summarySheet.addRow({ metric: o, value: c });
      });

      // Dist. Artistas
      summarySheet.addRow([]);
      summarySheet.addRow({ metric: 'DISTRIBUCIÓN POR ARTISTA', value: '' });
      summarySheet.lastRow!.font = { bold: true, color: { argb: 'FF1A73E8' } };
      Object.entries(artistCount)
        .sort((a,b) => b[1] - a[1])
        .forEach(([art, c]) => {
          summarySheet.addRow({ metric: art, value: c });
        });

      // ============================================
      // 2. HOJA DE CATÁLOGO DETALLADO
      // ============================================
      const advancedSheet = workbook.addWorksheet('Repertorio Avanzado');
      advancedSheet.columns = [
        { header: 'N° Fila', key: 'row', width: 10 },
        { header: 'Título de la Canción', key: 'title', width: 45 },
        { header: 'Nombre del Artista', key: 'artist', width: 35 },
        { header: 'Géneros Musicales', key: 'genres', width: 40 },
        { header: 'Ocasiones/Eventos', key: 'occasions', width: 40 },
        { header: 'YouTube', key: 'hasYoutube', width: 15 },
        { header: 'URL de Reproducción', key: 'youtubeUrl', width: 50 },
        { header: 'Alerta: Variante', key: 'isDuplicate', width: 20 },
        { header: 'Alerta: Anomalía Artista', key: 'isArtistAnomaly', width: 25 },
        { header: 'Notas MEGA', key: 'link', width: 50 },
      ];
      
      // Estilo de encabezado
      advancedSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      advancedSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1A1A' } };
      
      // Datos
      processedSongs.forEach((song, i) => {
        const row = advancedSheet.addRow({
          row: i + 1,
          title: song.title,
          artist: song.artist,
          genres: song.genres.join(', '),
          occasions: song.occasions.join(', '),
          hasYoutube: song.youtubeUrl ? 'Sí' : 'No',
          youtubeUrl: song.youtubeUrl || '',
          isDuplicate: song.isDuplicate ? 'Sí' : 'No',
          isArtistAnomaly: song.isArtistAnomaly ? 'Sí' : 'No',
          link: song.link || ''
        });
        
        // Colorear filas con alertas
        if (song.isDuplicate) {
           row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEBEB' } }; // Rojo muy claro
        } else if (song.isArtistAnomaly) {
           row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3E0' } }; // Naranja muy claro
        }
      });

      // Crear archivo y descargar via Blob
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = "Catalogo_Avanzado_CielitoLindo.xlsx";
      a.click();
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error exportando Excel:', error);
      alert('Hubo un error generando el reporte de Excel. Revisa la consola.');
    } finally {
      setIsExporting(false);
      setShowExcelConfirm(false);
    }
  };

  const confirmAndExportJson = () => {
    setIsExporting(true);
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(songs, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", "Repertorio_Backup_CielitoLindo.json");
      document.body.appendChild(downloadAnchorNode); 
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    } finally {
      setIsExporting(false);
      setShowJsonConfirm(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header y Stats */}
      <div className="bg-surface-container-low border border-outline-variant/10 rounded-3xl p-5 md:p-6 ambient-shadow">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="font-serif text-2xl text-on-surface mb-1 flex items-center gap-2">
              <FileSpreadsheet size={24} className="text-primary" />
              Lista Avanzada / Monitoreo
            </h3>
            <p className="text-sm text-on-surface-variant">
              Vista tipo hoja de cálculo para auditar el repertorio, detectar duplicados y exportar datos.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0 flex-wrap justify-end">
            <button
              onClick={() => setShowJsonConfirm(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all border border-outline-variant/30 text-on-surface hover:border-primary hover:text-primary"
              title="Descargar copia de respaldo (JSON) completa de base de datos de canciones"
            >
              <Database size={18} />
              Backup DB (JSON)
            </button>
            <button
              onClick={() => setShowExcelConfirm(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all gold-gradient text-on-primary hover:opacity-90 shadow-lg"
            >
              <Download size={18} />
              Exportar Excel
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-surface-container-lowest rounded-xl p-4 border border-outline-variant/10 flex items-center gap-4">
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <Music size={24} />
            </div>
            <div>
              <span className="text-3xl font-serif text-on-surface block leading-none mb-1">{totalSongs}</span>
              <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Total Canciones</span>
            </div>
          </div>
          <div className={`rounded-xl p-4 border flex items-center gap-4 ${duplicateCount > 0 ? 'bg-error/5 border-error/20' : 'bg-surface-container-lowest border-outline-variant/10'}`}>
            <div className={`p-3 rounded-xl ${duplicateCount > 0 ? 'bg-error/10 text-error' : 'bg-primary/10 text-primary'}`}>
              <AlertTriangle size={24} />
            </div>
            <div>
              <span className={`text-3xl font-serif block leading-none mb-1 ${duplicateCount > 0 ? 'text-error' : 'text-on-surface'}`}>{duplicateCount}</span>
              <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Variantes de Canción</span>
            </div>
          </div>
          <div className={`col-span-2 sm:col-span-1 xl:col-span-1 rounded-xl p-4 border flex items-center gap-4 ${artistAnomalyCount > 0 ? 'bg-orange-500/5 border-orange-500/20' : 'bg-surface-container-lowest border-outline-variant/10'}`}>
            <div className={`p-3 rounded-xl ${artistAnomalyCount > 0 ? 'bg-orange-500/10 text-orange-500' : 'bg-primary/10 text-primary'}`}>
              <AlertTriangle size={24} />
            </div>
            <div>
              <span className={`text-3xl font-serif block leading-none mb-1 ${artistAnomalyCount > 0 ? 'text-orange-500' : 'text-on-surface'}`}>{artistAnomalyCount}</span>
              <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Artistas con Anomalías</span>
            </div>
          </div>
        </div>
      </div>

      {/* Alfabeto Rápido */}
      <div className="bg-surface-container-lowest border border-outline-variant/10 rounded-2xl p-2 md:p-3 overflow-x-auto shadow-sm">
        <div className="flex gap-1 min-w-max">
          <button
            onClick={() => setActiveLetter(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              !activeLetter ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            TODOS
          </button>
          <div className="w-px h-6 bg-outline-variant/20 mx-1 self-center" />
          {alphabet.map(letter => (
            <button
              key={letter}
              onClick={() => setActiveLetter(activeLetter === letter ? null : letter)}
              className={`w-8 h-8 rounded-lg text-xs font-bold flex items-center justify-center transition-all ${
                activeLetter === letter ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {letter}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-surface-container-low text-on-surface select-none">
              <tr>
                <th className="p-3 border-b border-outline-variant/20 font-semibold text-xs uppercase tracking-wider w-12 text-center text-on-surface-variant">
                  #
                </th>
                <th className="p-3 border-b border-outline-variant/20 font-semibold text-xs uppercase tracking-wider cursor-pointer hover:bg-surface-container-highest transition-colors w-[26%]" onClick={() => handleSort('title')}>
                  <div className="flex items-center justify-between">
                    Título {sortField === 'title' && <SortIcon field="title" />}
                  </div>
                </th>
                <th className="p-3 border-b border-outline-variant/20 font-semibold text-xs uppercase tracking-wider cursor-pointer hover:bg-surface-container-highest transition-colors w-[22%]" onClick={() => handleSort('artist')}>
                  <div className="flex items-center justify-between">
                    Artista {sortField === 'artist' && <SortIcon field="artist" />}
                  </div>
                </th>
                <th className="p-3 border-b border-outline-variant/20 font-semibold text-xs uppercase tracking-wider w-[24%]">
                  Ocasiones
                </th>
                <th className="p-3 border-b border-outline-variant/20 font-semibold text-xs uppercase tracking-wider w-[22%]">
                  Géneros
                </th>
                <th className="p-3 border-b border-outline-variant/20 font-semibold text-xs uppercase tracking-wider w-[10%] text-right">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {processedSongs.map((song, index) => (
                <tr key={song.id} className={`hover:bg-surface-container-low transition-colors ${song.isDuplicate || song.isArtistAnomaly ? 'bg-surface-container-lowest' : ''}`}>
                  <td className="p-3 border-b border-outline-variant/5 text-center">
                    <span className="text-[10px] text-on-surface-variant font-mono">{index + 1}</span>
                  </td>
                  <td className="p-3 border-b border-outline-variant/5">
                    <div className="flex items-start gap-2">
                      <span className={`text-[11px] font-medium leading-tight ${song.isDuplicate ? 'text-error font-bold' : 'text-on-surface'}`}>
                        {song.title}
                      </span>
                      {song.isDuplicate && (
                        <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase bg-error/20 text-error mt-0.5" title="Mismo nombre detectado en el sistema">
                          Var
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3 border-b border-outline-variant/5">
                    <div className="flex items-start gap-2">
                      <span className={`text-[11px] leading-tight ${song.isArtistAnomaly ? 'text-orange-500 font-bold' : song.isDuplicate ? 'text-on-surface-variant' : 'text-on-surface-variant'}`}>
                        {song.artist}
                      </span>
                      {song.isArtistAnomaly && (
                        <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase bg-orange-500/20 text-orange-500 mt-0.5" title="Variantes de escritura (mayúsculas, tildes) detectadas en este artista">
                          Anomalía
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3 border-b border-outline-variant/5">
                    <div className="flex flex-wrap gap-1">
                      {song.occasions.map(occ => (
                        <span key={occ} className="px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[9px] font-medium">
                          {occ}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-3 border-b border-outline-variant/5">
                    <div className="flex flex-wrap gap-1">
                      {song.genres.map(gen => (
                        <span key={gen} className="px-1.5 py-0.5 rounded-md bg-secondary/10 text-secondary text-[9px] font-medium">
                          {gen}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-3 border-b border-outline-variant/5">
                    <div className="flex items-center justify-end gap-1">
                      {song.youtubeUrl && (
                        <button onClick={() => onPlay(song)} className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Reproducir YouTube">
                          <Youtube size={14} />
                        </button>
                      )}
                      <button onClick={() => onEdit(song)} className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Editar">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => onDelete(song.id)} className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-colors" title="Eliminar">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {processedSongs.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-on-surface-variant text-sm">
                    No hay canciones en el repertorio con este filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODALES DE CONFIRMACIÓN */}
      {showExcelConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-surface-container-lowest rounded-3xl border border-outline-variant/20 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-primary/10 text-primary rounded-xl">
                  <FileSpreadsheet size={24} />
                </div>
                <button onClick={() => setShowExcelConfirm(false)} className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high rounded-full transition-colors" disabled={isExporting}>
                  <X size={20} />
                </button>
              </div>
              <h2 className="font-serif text-2xl text-on-surface mb-2">Descargar Reporte Excel</h2>
              <p className="text-sm text-on-surface-variant mb-4">
                ¿Estás seguro que deseas generar y descargar el catálogo en formato Excel?
              </p>
              <p className="text-sm text-on-surface-variant/80 mb-6 font-light">
                Este archivo contendrá una pestaña <b>"Resumen"</b> con estadísticas globales, conteos según géneros y ocasiones, y los Top 10 artistas más sonados. Además, incluirá otra pestaña con el registro completo de canciones coloreando las alertas de anomalías y variantes.
              </p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowExcelConfirm(false)} disabled={isExporting} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-on-surface hover:bg-surface-container-high transition-colors">
                  Cancelar
                </button>
                <button onClick={confirmAndExportExcel} disabled={isExporting} className="px-5 py-2.5 rounded-xl text-sm font-bold text-on-primary gold-gradient shadow-lg hover:opacity-90 flex items-center gap-2">
                  {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                  {isExporting ? "Generando..." : "Descargar Excel"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showJsonConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-surface-container-lowest rounded-3xl border border-error/20 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-error/10 text-error rounded-xl">
                  <Database size={24} />
                </div>
                <button onClick={() => setShowJsonConfirm(false)} className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high rounded-full transition-colors" disabled={isExporting}>
                  <X size={20} />
                </button>
              </div>
              <h2 className="font-serif text-2xl text-error mb-2">Crear Backup de Base de Datos</h2>
              <p className="text-sm text-on-surface mb-4">
                ¿Estás seguro que deseas descargar la base de datos en formato crudo (JSON)?
              </p>
              <div className="bg-error/5 border border-error/20 rounded-lg p-3 mb-6">
                <p className="text-[12px] text-error">
                  <b>Importante:</b> Este archivo (`.json`) contiene toda la información en código estructurado (IDs, fechas, URLs y metadatos base). 
                  Se recomienda hacer esto periódicamente o <b>antes de someter el repertorio a limpiezas profundas masivas</b>.
                </p>
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowJsonConfirm(false)} disabled={isExporting} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-on-surface hover:bg-surface-container-high transition-colors">
                  Mejor no
                </button>
                <button onClick={confirmAndExportJson} disabled={isExporting} className="px-5 py-2.5 rounded-xl text-sm font-bold bg-error hover:bg-error/90 text-white shadow-lg flex items-center gap-2 transition-colors">
                  {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                  {isExporting ? "Exportando..." : "Sí, descargar JSON"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
