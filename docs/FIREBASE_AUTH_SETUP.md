# Configuracion Firebase Auth (Correo y Contrasena)

## 1. Habilitar proveedor Email/Password
1. Abre Firebase Console.
2. Entra al proyecto `mariachi-cielito-lindo`.
3. Ve a Authentication -> Sign-in method.
4. Activa `Email/Password`.
5. Guarda cambios.

## 2. Dominios autorizados
1. En Authentication -> Settings -> Authorized domains.
2. Asegura que esten estos dominios:
   - `localhost`
   - Tu dominio productivo (si ya existe).

## 3. Ajustes recomendados de seguridad
1. En Authentication -> Settings -> User actions, habilita protecciones anti abuso disponibles.
2. En Authentication -> Templates, personaliza email de recuperacion de contrasena.
3. En Authentication -> Settings -> Password policy, define politica estricta (minimo 8 + complejidad).

## 4. Flujo operativo recomendado
1. Admin invita correo en `pending_users`.
2. Usuario crea cuenta con correo/contrasena en la pantalla de Admin.
3. Al iniciar sesion, si existe invitacion pendiente, se crea su documento en `users` y queda autorizado.
4. Si no hay invitacion, el sistema cierra sesion y bloquea acceso al panel.

## 5. Reglas de Firestore
No se requieren cambios estructurales para email/password: `request.auth` ya funciona con ambos proveedores (Google y correo/contrasena).

## 6. Prueba rapida
1. Invita un correo corporativo desde Admin.
2. Cierra sesion.
3. Crea cuenta con ese correo y contrasena.
4. Inicia sesion con correo/contrasena.
5. Verifica que entra al panel con el rol invitado.
