# Migración preparada: Excel vs Firestore

## Resumen

- Canciones únicas en Excel (después de normalizar título y artista): 349
- Canciones con coincidencia exacta en Firestore: 97
- Canciones sin coincidencia en Firestore: 252
- Categorías originales de Excel: 20
- Categorías de Firestore detectadas: 13
- Categorías de Excel sin mapeo sugerido: 16

## Categorías de Excel sin correspondencia directa en Firestore

- Entrada
- Reconciliaciones
- Velorios y sepelios
- Cristiana
- La Boda
- Catolico y Cantos a la Virgen
- Canciones Para Mamá
- Canciones para Papa
- Despedidas
- Corridos
- Cumbias
- Merengues
- Salsa
- Musica Nacional
- Instrumentales o de Espectaculos
- Juvenil o Nuevo

## Ejemplos de canciones sin coincidencia en Firestore

- **Happy birthday** — MCL | Categorías: Cumpleaños | Mapeo categoría sugerido: cumpleaños
- **Happy birthday cristiano** — MCL | Categorías: Cumpleaños | Mapeo categoría sugerido: cumpleaños
- **Happy birthday venezolano** — MCL | Categorías: Cumpleaños | Mapeo categoría sugerido: cumpleaños
- **Las mañanitas** — Mariachi Vargas | Categorías: Cumpleaños | Mapeo categoría sugerido: cumpleaños
- **Felicitaciones** — Julio Jaramillo | Categorías: Cumpleaños | Mapeo categoría sugerido: cumpleaños
- **Felicidades** — Mariachi Mexico | Categorías: Cumpleaños | Mapeo categoría sugerido: cumpleaños
- **Que Dios de bendiga** — Mariachi estelar | Categorías: Cumpleaños | Mapeo categoría sugerido: cumpleaños
- **Ramo de Flores** — Mariachi Oro de mexico | Categorías: Cumpleaños | Mapeo categoría sugerido: cumpleaños
- **Despierta** — Pedro Infante | Categorías: Cumpleaños | Mapeo categoría sugerido: cumpleaños
- **La Fiesta del Mariachi** — Luis miguel | Categorías: Entrada | Mapeo categoría sugerido: ninguno
- **El son de la Negra** — Mariachi Vargas | Categorías: Entrada | Mapeo categoría sugerido: ninguno
- **Amar y querer** — Jose Jose | Categorías: Romanticas (Aniversarios, enamorados, pedidas de mano) | Mapeo categoría sugerido: aniversarios
- **Amorcito corazon** — Javier Solis | Categorías: Romanticas (Aniversarios, enamorados, pedidas de mano) | Mapeo categoría sugerido: aniversarios
- **Besame** — Ricardo montaner | Categorías: Romanticas (Aniversarios, enamorados, pedidas de mano) | Mapeo categoría sugerido: aniversarios
- **Cielo rojo** — Mariachi Cobre | Categorías: Romanticas (Aniversarios, enamorados, pedidas de mano), Reconciliaciones | Mapeo categoría sugerido: aniversarios
- **Cien años** — Pedro Infante | Categorías: Romanticas (Aniversarios, enamorados, pedidas de mano) | Mapeo categoría sugerido: aniversarios
- **Como fue** — Sol de Mexico | Categorías: Romanticas (Aniversarios, enamorados, pedidas de mano) | Mapeo categoría sugerido: aniversarios
- **Contigo en la distancia** — LHDM | Categorías: Romanticas (Aniversarios, enamorados, pedidas de mano) | Mapeo categoría sugerido: aniversarios
- **Despacito** — J.A. Jimenez | Categorías: Romanticas (Aniversarios, enamorados, pedidas de mano) | Mapeo categoría sugerido: aniversarios
- **Diseñame** — Joan Sebastian | Categorías: Romanticas (Aniversarios, enamorados, pedidas de mano) | Mapeo categoría sugerido: aniversarios

## Ejemplos de coincidencias exactas en Firestore

- **En tu día** — Javier Solis | Firestore ID: 5ybyLZPElpcYeNSP6zOB | Categorías Firestore: Cumpleaños, Fiestas
- **Cielito Lindo** — Mariachi Vargas | Firestore ID: kGRdJatSbXzUVHKm9A0s | Categorías Firestore: Fiestas, Ambientación, Graduaciones
- **Algo mas** — Natalia Jimenez | Firestore ID: RFCTaX7ruLD5kuXNYgLq | Categorías Firestore: Serenata, Despecho, Fiestas
- **Amar y vivir** — Vicente Fernandez | Firestore ID: aP3qrHvx2LzlIhTzhmQZ | Categorías Firestore: Serenata, Bodas, Ambientación
- **Amarte a la antigua** — Pedro Fernandez | Firestore ID: zOBJDQgMP5WJnVNOTDaB | Categorías Firestore: Serenata, Bodas, Fiestas
- **amarte es un placer** — Luis Miguel | Firestore ID: se6W1kwgBJgJZBxyzgdE | Categorías Firestore: Serenata, Bodas, Ambientación
- **Bésame mucho** — Vicente Fernandez | Firestore ID: Mf4u4OhPensSRZnkm5fc | Categorías Firestore: Serenata, Bodas, Fiestas, Ambientación
- **Bonita** — Javier Solis | Firestore ID: UbnrWoYcuQrVZ0TSFXQB | Categorías Firestore: Serenata, Bodas, Ambientación
- **Cariño** — Lucero | Firestore ID: D4BRUOckafDnA9kjiQHQ | Categorías Firestore: Serenata, Fiestas, Ambientación
- **Cariño de mis cariños** — Lucero | Firestore ID: d5yIrapckvDru3dIDoHL | Categorías Firestore: Serenata, Fiestas, Ambientación, Día de la Madre
- **Cataclismo** — Javier Solis | Firestore ID: Gpmf1G4o9tNcqvHE8INS | Categorías Firestore: Despecho, Serenata
- **Cenizas** — Javier Solis | Firestore ID: jsuW3lslohWfpyZfMro3 | Categorías Firestore: Despecho, Serenata, Ambientación
- **Como han pasado los años** — Rocio Durcal | Firestore ID: 1XfoMv5Tp3ka8fRsE8sT | Categorías Firestore: Ambientación, Día de la Madre, Día del Padre, Cumpleaños
- **Con los años que me quedan** — Mariachi Vargas | Firestore ID: T26sg1AynaMitwajy8me | Categorías Firestore: Serenata, Bodas, Día de la Madre, Día del Padre, Ambientación
- **Contigo aprendí** — Alejandro Fernandez | Firestore ID: XbFhXX9HdSyVTWnmUvJR | Categorías Firestore: Serenata, Bodas, Ambientación
- **De qué manera te olvido** — Vicente Fernandez | Firestore ID: 4flsiif9gey6lwfhNPOU | Categorías Firestore: Despecho, Fiestas, Ambientación
- **El aguacate** — Julio Jaramillo | Firestore ID: BLDf2fytcLIID6k8joup | Categorías Firestore: Ambientación, Serenata, Fiestas
- **El destino** — Juan Gabriel | Firestore ID: VuPdDacnoG0WxkcgL74P | Categorías Firestore: Serenata, Despecho, Ambientación
- **El Loco** — Javier Solis | Firestore ID: B36ErSGI8bdTlQZdWfLG | Categorías Firestore: Despecho, Ambientación
- **El privilegio de amar** — Lucero | Firestore ID: s18DnucZiFO23I1kwhpw | Categorías Firestore: Bodas, Quinceañeras, Día de la Madre, Ambientación

## Próximos pasos

- Revisar `docs/excel_normalized.json` y confirmar los mapeos sugeridos de categorías.
- Ejecutar `scripts/find_youtube_urls.mjs` para obtener enlaces de YouTube para canciones sin `youtubeUrl`.