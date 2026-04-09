# 🌱 Instrucciones para Ejecutar Seed Data en Firestore

## Problema
Las reglas de Firestore actuales requieren que los usuarios estén autenticados para escribir. El script de seed necesita permisos temporales.

## Solución: Cambiar Reglas Temporalmente

### Paso 1: Abre la Consola de Firebase
1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona el proyecto **"mariachi-cielito-lindo"**
3. En el menú izquierdo, ve a **Firestore Database** → **Reglas**

### Paso 2: Reemplaza las Reglas Temporalmente
Cambia las reglas a esto (SOLO PARA PRUEBAS):

```firestore
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // ⚠️ TEMPORAL: Permitir todas las lecturas y escrituras durante seed
    match /songs/{document=**} {
      allow read, write: if true;
    }
    
    // Las demás colecciones mantienen autenticación
    match /users/{document=**} {
      allow read, write: if request.auth != null;
    }
    
    match /pending_users/{document=**} {
      allow read, write: if request.auth != null;
    }
    
    match /catalog/{document=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

### Paso 3: Publica las Reglas
- Haz clic en **"Publicar"** (botón azul en la parte superior derecha)
- Espera confirmación de publicación

### Paso 4: Ejecuta el Script de Seed
En la terminal, ejecuta:
```bash
npm run seed:songs seed
```

### Paso 5: Verifica los Datos
- Ve a Firestore Console
- Abre la colección **"songs"**
- Deberías ver ~20 documentos con títulos "Canción A", "Canción B", etc.

### Paso 6: Restaura las Reglas Originales
Reemplaza las reglas con el contenido original de `firestore.rules`:

```firestore
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // ===============================================================
    // Assumed Data Model
    // ... [copia todo el contenido del archivo firestore.rules]
    // ===============================================================
```

O más rápido:
1. Ve a Firestore Reglas
2. Abre el editor
3. Borra todo
4. Pega el contenido de `firestore.rules`
5. Haz clic en **"Publicar"**

## Verificación Final
- Intenta agregar una canción desde la app web
- Intenta filtrar y ver las canciones de seed

## Limpiar Datos de Prueba (Opcional)
Si necesitas eliminar las canciones de prueba:

```bash
npm run seed:songs cleanup
```

Esto eliminará todas las canciones que comienzan con "Canción " y están etiquetadas como "Artista A-E".

## 🔒 IMPORTANTE
No olvides restaurar las reglas siguiendo el Paso 6. Las reglas de prueba (`allow read, write: if true;`) son **INSEGURAS** para producción.

---

**Problema Técnico:**
- Las reglas originales requieren `isAuthenticated()` para escribir
- El script de seed usa el SDK de cliente (no Admin SDK)
- Sin autenticación, el SDK de cliente no puede escribir
- Solución temporal: Allow all para la colección de canciones durante pruebas
