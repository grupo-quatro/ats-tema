# Configuración de Google SSO en Firebase

## Para probar con emails reales (sin emulador)

### 1. Habilitar Google como proveedor en Firebase Console

1. Ir a [Firebase Console](https://console.firebase.google.com) → proyecto `ats-tema-ort`
2. Authentication → Sign-in method
3. Clic en **Google** → habilitar
4. Configurar el email de soporte del proyecto
5. Guardar

### 2. Agregar dominio autorizado

En Firebase Console → Authentication → Settings → **Authorized domains**:

- `localhost` ya está por defecto (para pruebas locales apuntando a Firebase real)
- Agregar el dominio de producción cuando esté disponible (ej: `ats.temaconsulting.com.ar`)

### 3. Apuntar el web app a Firebase real (no emulador)

En `apps/web/.env.local`, cambiar:

```env
NEXT_PUBLIC_USE_EMULATORS=false
```

Con esto el botón "Continuar con Google" abre el popup real de Google.

### 4. Asignar rol al primer usuario (admin inicial)

El primer usuario que haga login con email `@temaconsulting.com.ar` quedará en estado
"Acceso pendiente" hasta que alguien le asigne un rol. Para bootstrappear el primer admin:

```bash
# Obtener el UID del usuario desde Firebase Console → Authentication → Users
# Luego llamar setUserRole directamente con curl (usando un token de admin):

curl -X POST https://us-central1-ats-tema-ort.cloudfunctions.net/setUserRole \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ID_TOKEN_ADMIN>" \
  -d '{ "uid": "<UID_DEL_USUARIO>", "role": "admin" }'
```

> Para el primer admin no hay forma de obtener el token desde la app (no tiene rol aún).
> Usar la Firebase Admin SDK desde un script local o asignar el custom claim
> directamente desde Firebase Console → Authentication → Users → usuario → Edit → Custom claims:
>
> ```json
> { "role": "admin" }
> ```

### 5. Variables de entorno para producción

El Route Handler `/api/auth/session` usa Firebase Admin SDK.
En producción necesita estas variables de entorno (no las `NEXT_PUBLIC_`):

```env
FIREBASE_PROJECT_ID=ats-tema-ort
FIREBASE_CLIENT_EMAIL=<service-account-email>
FIREBASE_PRIVATE_KEY=<service-account-private-key>
```

Obtener desde Firebase Console → Project settings → Service accounts → Generate new private key.

---

## Whitelist de emails de prueba

En `apps/web/app/shared/lib/authContext.tsx` hay una lista `DEV_WHITELIST_EMAILS`
con emails que pueden loguearse aunque no sean `@temaconsulting.com.ar`.

**Recordar eliminar antes de deploy a producción** (está marcado con `// TODO`).
