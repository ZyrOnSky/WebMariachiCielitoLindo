# Comparación actualizada de listas normalizadas

- Registros únicos normalizados en Excel: 349
- Registros en Firestore: 255
- Coincidencias exactas por título+artista: 97
- Canciones normalizadas de Excel sin match en Firestore: 252
- Canciones de Firestore sin match en Excel: 157

## Categorías normalizadas en Excel vs Firestore

- Categorías normalizadas detectadas en Excel: 19
- Categorías normalizadas detectadas en Firestore: 13

### Categorías únicas en Excel

- bodas
- catolico cantos a la virgen
- corridos
- cumbias
- cumpleaños
- despecho
- entrada
- fiestas
- instrumentales o espectaculos
- juvenil
- mama
- merengues
- música nacional
- papa
- quinceañeras
- religioso
- romanticas aniversarios enamorados pedidas mano
- salsa
- velorios sepelios

### Categorías únicas en Firestore

- ambientación
- aniversarios
- bodas
- cumpleaños
- despecho
- dia la madre
- día del padre
- fiestas
- funerales
- graduaciones
- quinceañeras
- religioso
- serenata

## Ejemplos

### Ejemplos de coincidencias exactas

- **En tu día** — Javier Solis | Categoría Excel: cumpleaños | Categorías Firestore: cumpleaños, fiestas
- **Cielito Lindo** — Mariachi Vargas | Categoría Excel: cumpleaños, despedidas | Categorías Firestore: fiestas, ambientación, graduaciones
- **Algo mas** — Natalia Jimenez | Categoría Excel: romanticas aniversarios enamorados pedidas mano | Categorías Firestore: serenata, despecho, fiestas
- **Amar y vivir** — Vicente Fernandez | Categoría Excel: romanticas aniversarios enamorados pedidas mano | Categorías Firestore: serenata, bodas, ambientación
- **Amarte a la antigua** — Pedro Fernandez | Categoría Excel: romanticas aniversarios enamorados pedidas mano | Categorías Firestore: serenata, bodas, fiestas
- **amarte es un placer** — Luis Miguel | Categoría Excel: romanticas aniversarios enamorados pedidas mano | Categorías Firestore: serenata, bodas, ambientación
- **Bésame mucho** — Vicente Fernandez | Categoría Excel: romanticas aniversarios enamorados pedidas mano | Categorías Firestore: serenata, bodas, fiestas, ambientación
- **Bonita** — Javier Solis | Categoría Excel: romanticas aniversarios enamorados pedidas mano | Categorías Firestore: serenata, bodas, ambientación
- **Cariño** — Lucero | Categoría Excel: romanticas aniversarios enamorados pedidas mano | Categorías Firestore: serenata, fiestas, ambientación
- **Cariño de mis cariños** — Lucero | Categoría Excel: romanticas aniversarios enamorados pedidas mano | Categorías Firestore: serenata, fiestas, ambientación, dia la madre
- **Cataclismo** — Javier Solis | Categoría Excel: romanticas aniversarios enamorados pedidas mano | Categorías Firestore: despecho, serenata
- **Cenizas** — Javier Solis | Categoría Excel: romanticas aniversarios enamorados pedidas mano | Categorías Firestore: despecho, serenata, ambientación
- **Como han pasado los años** — Rocio Durcal | Categoría Excel: romanticas aniversarios enamorados pedidas mano | Categorías Firestore: ambientación, dia la madre, día del padre, cumpleaños
- **Con los años que me quedan** — Mariachi Vargas | Categoría Excel: romanticas aniversarios enamorados pedidas mano | Categorías Firestore: serenata, bodas, dia la madre, día del padre, ambientación
- **Contigo aprendí** — Alejandro Fernandez | Categoría Excel: romanticas aniversarios enamorados pedidas mano | Categorías Firestore: serenata, bodas, ambientación
- **De qué manera te olvido** — Vicente Fernandez | Categoría Excel: romanticas aniversarios enamorados pedidas mano | Categorías Firestore: despecho, fiestas, ambientación
- **El aguacate** — Julio Jaramillo | Categoría Excel: romanticas aniversarios enamorados pedidas mano | Categorías Firestore: ambientación, serenata, fiestas
- **El destino** — Juan Gabriel | Categoría Excel: romanticas aniversarios enamorados pedidas mano | Categorías Firestore: serenata, despecho, ambientación
- **El Loco** — Javier Solis | Categoría Excel: romanticas aniversarios enamorados pedidas mano | Categorías Firestore: despecho, ambientación
- **El privilegio de amar** — Lucero | Categoría Excel: romanticas aniversarios enamorados pedidas mano | Categorías Firestore: bodas, quinceañeras, dia la madre, ambientación

### Ejemplos sólo en Excel

- **Happy birthday** — MCL | Categoría Excel: cumpleaños | Sugerido: cumpleaños
- **Happy birthday cristiano** — MCL | Categoría Excel: cumpleaños | Sugerido: cumpleaños
- **Happy birthday venezolano** — MCL | Categoría Excel: cumpleaños | Sugerido: cumpleaños
- **Las mañanitas** — Mariachi Vargas | Categoría Excel: cumpleaños | Sugerido: cumpleaños
- **Felicitaciones** — Julio Jaramillo | Categoría Excel: cumpleaños | Sugerido: cumpleaños
- **Felicidades** — Mariachi Mexico | Categoría Excel: cumpleaños | Sugerido: cumpleaños
- **Que Dios de bendiga** — Mariachi estelar | Categoría Excel: cumpleaños | Sugerido: cumpleaños
- **Ramo de Flores** — Mariachi Oro de mexico | Categoría Excel: cumpleaños | Sugerido: cumpleaños
- **Despierta** — Pedro Infante | Categoría Excel: cumpleaños | Sugerido: cumpleaños
- **La Fiesta del Mariachi** — Luis miguel | Categoría Excel: entrada | Sugerido: entrada
- **El son de la Negra** — Mariachi Vargas | Categoría Excel: entrada | Sugerido: entrada
- **Amar y querer** — Jose Jose | Categoría Excel: romanticas aniversarios enamorados pedidas mano | Sugerido: romanticas aniversarios enamorados pedidas mano
- **Amorcito corazon** — Javier Solis | Categoría Excel: romanticas aniversarios enamorados pedidas mano | Sugerido: romanticas aniversarios enamorados pedidas mano
- **Besame** — Ricardo montaner | Categoría Excel: romanticas aniversarios enamorados pedidas mano | Sugerido: romanticas aniversarios enamorados pedidas mano
- **Cielo rojo** — Mariachi Cobre | Categoría Excel: romanticas aniversarios enamorados pedidas mano, reconciliaciones | Sugerido: romanticas aniversarios enamorados pedidas mano
- **Cien años** — Pedro Infante | Categoría Excel: romanticas aniversarios enamorados pedidas mano | Sugerido: romanticas aniversarios enamorados pedidas mano
- **Como fue** — Sol de Mexico | Categoría Excel: romanticas aniversarios enamorados pedidas mano | Sugerido: romanticas aniversarios enamorados pedidas mano
- **Contigo en la distancia** — LHDM | Categoría Excel: romanticas aniversarios enamorados pedidas mano | Sugerido: romanticas aniversarios enamorados pedidas mano
- **Despacito** — J.A. Jimenez | Categoría Excel: romanticas aniversarios enamorados pedidas mano | Sugerido: romanticas aniversarios enamorados pedidas mano
- **Diseñame** — Joan Sebastian | Categoría Excel: romanticas aniversarios enamorados pedidas mano | Sugerido: romanticas aniversarios enamorados pedidas mano

### Ejemplos sólo en Firestore

- **Por el camino** — Mariachi Vargas | Categorías Firestore: ambientación, fiestas | YouTube: https://youtube.com/watch?v=hiTaP1aYMyw
- **Vasija de barro** — Julio Jaramillo | Categorías Firestore: funerales, ambientación | YouTube: https://youtube.com/watch?v=0vJHbkKTNGM
- **Que bonito amor** — Mariachi Vargas | Categorías Firestore: serenata, bodas, fiestas | YouTube: https://youtube.com/watch?v=XOGcTmOoulY
- **Hoy he vuelto madre a recordar** — Mariachi Vargas | Categorías Firestore: dia la madre, funerales, ambientación | YouTube: https://youtube.com/watch?v=HGu_gYWrk1I
- **Júrame** — Luis Miguel | Categorías Firestore: serenata, despecho, ambientación | YouTube: https://youtube.com/watch?v=ODid4nY7GGY
- **Veinte y cinco rosas** — Mariachi Vargas | Categorías Firestore: serenata, cumpleaños, ambientación | YouTube: https://youtube.com/watch?v=95tpywDJQJM
- **Pollera Colorada** — Alberto Barros | Categorías Firestore: fiestas, ambientación | YouTube: https://youtube.com/watch?v=JICtLiGqCV8
- **Todopoderoso** — Mariachi Vargas | Categorías Firestore: religioso | YouTube: https://youtube.com/watch?v=vCnFS0NvgaY
- **El prendedor** — Vicente Fernández | Categorías Firestore: fiestas, ambientación | YouTube: https://youtube.com/watch?v=sx31J7fDB4s
- **Quinceañera** — Vicente Fernández | Categorías Firestore: quinceañeras, cumpleaños, fiestas | YouTube: https://youtube.com/watch?v=rYclZ_Y0rH4
- **Secreto de amor** — Mariachi Vargas | Categorías Firestore: serenata, ambientación | YouTube: https://youtube.com/watch?v=HLQtHVkCtms
- **Algo de me fue contigo madre** — Rocío Dúrcal | Categorías Firestore: funerales, dia la madre | YouTube: https://youtube.com/watch?v=a9QwsJSVYaw
- **Ambato tierra de flores** —  | Categorías Firestore: ambientación, fiestas | YouTube: https://youtube.com/watch?v=gBtM4_NcKTc
- **Pobre corazón** —  | Categorías Firestore: despecho, serenata | YouTube: https://youtube.com/watch?v=m5PgVv8PkfA
- **La niña de tus ojos** — Mariachi Vargas | Categorías Firestore: religioso, dia la madre, día del padre | YouTube: https://youtube.com/watch?v=9PpKK50tsaY
- **Sabor a mi** — Luis Miguel | Categorías Firestore: serenata, bodas, ambientación | YouTube: https://youtube.com/watch?v=cNo-d6Y6w8Y
- **Señora señora** — Mariachi Vargas | Categorías Firestore: dia la madre, cumpleaños, fiestas | YouTube: https://youtube.com/watch?v=ZbIszWyLuaI
- **Por una mujer bonita** — Mariachi Vargas | Categorías Firestore: serenata, fiestas, ambientación | YouTube: https://youtube.com/watch?v=3sboBltg_wM
- **Santa María** — Mariachi Vargas | Categorías Firestore: religioso | YouTube: https://youtube.com/watch?v=rdUy6x38yYg
- **Canta canta** — Javier Solís | Categorías Firestore: serenata, fiestas, ambientación | YouTube: https://youtube.com/watch?v=3t-TP4Gq0rc