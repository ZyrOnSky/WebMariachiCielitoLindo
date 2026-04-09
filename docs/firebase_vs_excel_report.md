# Reporte comparativo Firestore vs Excel

Este reporte compara las canciones clasificadas en el Excel con los registros actualmente presentes en Firestore.

## Resumen general

- Canciones en Firestore: 255
- Canciones únicas en Excel: 349
- Categorías en Excel: 20
- Categorías en Firestore: 13
- Canciones coincidentes exactas (título + artista): 36
- Canciones presentes solo en Excel: 313
- Canciones presentes solo en Firestore: 218

## Categorías principales en Firestore

- **Ambientación**: 181 canciones
- **Serenata**: 132 canciones
- **Fiestas**: 127 canciones
- **Despecho**: 75 canciones
- **Bodas**: 48 canciones
- **Cumpleaños**: 48 canciones
- **Día de la Madre**: 33 canciones
- **Funerales**: 23 canciones
- **Religioso**: 22 canciones
- **Quinceañeras**: 11 canciones

## Discrepancias de categorías

- Categorías en Excel pero no en Firestore: 18

  - Entrada
  - Romanticas (Aniversarios, enamorados, pedidas de mano)
  - Quinceañera
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

- Categorías en Firestore pero no en Excel: 11

  - Ambientación
  - Fiestas
  - Serenata
  - Funerales
  - Bodas
  - Día de la Madre
  - Día del Padre
  - Religioso
  - Quinceañeras
  - Aniversarios
  - Graduaciones

## Hallazgos adicionales

- Canciones en Excel sin registro en Firestore: 313
- Canciones en Firestore sin registro en Excel: 218

### Ejemplos de canciones solo en Excel

- **Happy birthday** — MCL
- **Happy birthday cristiano** — MCL
- **Happy birthday venezolano** — MCL
- **Las mañanitas** — Mariachi Vargas
- **Felicitaciones** — Julio Jaramillo
- **Felicidades** — Mariachi Mexico
- **Que Dios de bendiga** — Mariachi estelar
- **En tu día** — Javier Solis
- **Ramo de Flores** — Mariachi Oro de mexico
- **Despierta** — Pedro Infante

### Ejemplos de canciones solo en Firestore

- **Por el camino** — Mariachi Vargas — Categorías: Ambientación, Fiestas
- **Mi eterno amor secreto** — Marco Antonio Solís — Categorías: Serenata, Despecho, Ambientación
- **Vasija de barro** — Julio Jaramillo — Categorías: Funerales, Ambientación
- **Que bonito amor** — Mariachi Vargas — Categorías: Serenata, Bodas, Fiestas
- **Ya lo pasado pasado** — José José — Categorías: Ambientación, Despecho, Fiestas
- **Hoy he vuelto madre a recordar** — Mariachi Vargas — Categorías: Día de la Madre, Funerales, Ambientación
- **Como han pasado los años** — Rocío Dúrcal — Categorías: Ambientación, Día de la Madre, Día del Padre, Cumpleaños
- **Júrame** — Luis Miguel — Categorías: Serenata, Despecho, Ambientación
- **Veinte y cinco rosas** — Mariachi Vargas — Categorías: Serenata, Cumpleaños, Ambientación
- **Pollera Colorada** — Alberto Barros — Categorías: Fiestas, Ambientación
