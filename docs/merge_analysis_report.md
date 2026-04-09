# Reporte de Fusión y Análisis de Canciones (Gemini + Firestore + Excel)

## Resumen Cuantitativo
- **Total de registros combinados:** 491
- Registros que estaban en ambos (Excel + Firestore): 98
- Registros nuevos desde Excel: 251
- Registros que ya existían únicamente en Firestore: 142

## Análisis de URLs de YouTube
Tras el cruce y la fusión de ambas bases de datos, y tras ejecutar el script de enriquecimiento automático:
- **Canciones con URL válida de YouTube:** 491
- **Canciones sin URL de YouTube:** 0 (Se buscaron y añadieron 251 enlaces de YouTube que faltaban del Excel).

> [!NOTE]
> Por "URL válida" me refiero a que comprobamos que el campo exista y contenga la palabra clave 'youtube' o 'youtu.be'. El programa no reprodujo los videos para verificar derechos de autor debido a las protecciones anti-bot de la plataforma, confía en la precisión top 1 de la búsqueda con la API general.

## Análisis de Coherencia de Categorías (Ocasiones)
En general, la asignación de categorías ha sido buena y se han combinado los arreglos correctamente. Sin embargo, surgieron inconsistencias de capitalización al combinar los set de Excel y Firestore, lo que ocasionó "Duplicados Lógicos".

A continuación, el detalle de algunas categorías que entraron en conflicto de mayúsculas/minúsculas:
- `Velorios y Sepelios` vs `Velorios Y Sepelios`
- `Aniversarios y Románticas` vs `Aniversarios Y Románticas`
- `Día de la Madre` vs `Día De La Madre`
- `Día del Padre` vs `Día Del Padre`
- `Bodas y Matrimonios` vs `Bodas Y Matrimonios`

> [!IMPORTANT]
> Un usuario que filtre por "Día de la Madre" en la App podría no ver las canciones etiquetadas como "Día De La Madre". Se requiere estandarizar ("Normalizar") las categorías.
