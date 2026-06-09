# Guía de despliegue para demo de producción

## Arquitectura

- **Next.js** → servidor local del cliente (Node.js)
- **Firebase Functions** → desplegadas en Google Cloud (Firebase)
- **Firestore + Auth** → Firebase (cloud)

---

## 1. Firebase Console — configuración previa

### Authentication

- Sign-in method → **Google** → Habilitar
- Sign-in method → **Email/Password** → Habilitar (para el admin)
- Settings → Authorized domains → agregar el dominio/IP del servidor del cliente (ej: `192.168.1.50` o `demo.temaconsulting.com.ar`)

### Firestore

- Crear base de datos en modo **producción** (las rules ya están en el repo en `firestore.rules`)

---

## 2. Service account para el servidor Next.js

El servidor local necesita credenciales de Firebase Admin SDK para verificar sesiones.

### Paso 1 — Habilitar creación de keys en la organización

Si la política de la organización bloquea la creación de service account keys:

1. Ir a [Google Cloud Console](https://console.cloud.google.com) → seleccionar el proyecto `ats-tema-ort`
2. IAM & Admin → **Organization Policies**
3. Buscar `iam.disableServiceAccountKeyCreation`
4. Click en **Edit Policy**
5. En "Policy enforcement" → seleccionar **Override parent's policy**
6. Agregar una regla: **Allow** → Resource: `project/ats-tema-ort`
7. Guardar

### Paso 2 — Generar el service account key

Firebase Console → Project Settings → **Service Accounts** → **Generate new private key** → descargar `serviceAccount.json`

Guardar el archivo en el servidor (fuera del repo) y configurar:

```env
GOOGLE_APPLICATION_CREDENTIALS=/ruta/segura/serviceAccount.json
```

**Opción B — gcloud ADC en el servidor:**

```bash
gcloud auth application-default login
```

Solo válido si el servidor tiene `gcloud` instalado y acceso a internet.

---

## 3. Variables de entorno — servidor Next.js

Crear `apps/web/.env.production` (no commitear):

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBSKSsLETGOk5ERE4EKw_LLCLphbDIlxfU
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=ats-tema-ort.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=ats-tema-ort
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=ats-tema-ort.firebasestorage.app
NEXT_PUBLIC_FUNCTIONS_REGION=us-central1
NEXT_PUBLIC_USE_EMULATORS=false
NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID=1096403958808-bgl8n5dmctnnmvku4pjs4oln2qfqo3ck.apps.googleusercontent.com
NEXT_PUBLIC_GMAIL_REDIRECT_URI=https://TU_DOMINIO_O_IP
NEXT_PUBLIC_CALENDAR_REDIRECT_URI=https://TU_DOMINIO_O_IP

# Solo si usás Opción A (key file):
GOOGLE_APPLICATION_CREDENTIALS=/ruta/segura/serviceAccount.json
```

---

## 4. Desplegar Firebase Functions

```bash
# Desde la raíz del repo
pnpm compile-fn
firebase deploy --only functions
```

Configurar secrets de las functions en Firebase:

```bash
firebase functions:secrets:set GOOGLE_OAUTH_CLIENT_ID
firebase functions:secrets:set GOOGLE_OAUTH_CLIENT_SECRET
```

---

## 5. Desplegar reglas de Firestore y Storage

```bash
firebase deploy --only firestore:rules,storage:rules
```

---

## 6. Build y arranque del servidor Next.js

```bash
# En el servidor del cliente
pnpm install
cd apps/web && pnpm build
PORT=3000 pnpm start   # cambiar puerto si es necesario
```

---

## 7. Crear usuario admin

Firebase Console → Authentication → Add user:

- Email: `admin@temaconsulting.com.ar`
- Password: (segura)

Luego asignar el custom claim `role: admin`:

```bash
GOOGLE_APPLICATION_CREDENTIALS=/ruta/serviceAccount.json \
node scripts/set-admin-claim.mjs admin@temaconsulting.com.ar
```

Script `scripts/set-admin-claim.mjs` (crear si no existe):

```javascript
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const [, , email] = process.argv;
if (!email) {
  console.error('Uso: node set-admin-claim.mjs <email>');
  process.exit(1);
}

initializeApp();
const user = await getAuth().getUserByEmail(email);
await getAuth().setCustomUserClaims(user.uid, { role: 'admin' });
console.log(`✓ Admin claim seteado para ${email}`);
```

---

## 8. Seed de contenido inicial

Los seeders de jobs, candidatos y templates tienen un guard `isEmulatorEnvironment()` que impide correrlos en producción. Para la demo, el contenido se carga desde el dashboard de admin una vez que el sistema está en pie.

**Contenido mínimo para la demo:**

1. Loguearse como admin → crear al menos 2 posiciones activas
2. Los recruiters se registran con Google SSO → eligen rol en `/login/select-role`
3. Los candidatos se postulan por el portal público

---

## 9. Primer login y onboarding

1. **Admin** → sección "Acceso administrador" en login → email/password
2. **Recruiters y área líderes** → "Continuar con Google" → `/login/select-role` → eligen rol → dashboard
3. **Candidatos** → portal público → registro y postulación

---

## Checklist previo a la demo

- [ ] Google Sign-In habilitado en Firebase Console
- [ ] Email/Password habilitado en Firebase Console
- [ ] Dominio del servidor en Authorized domains
- [ ] Firebase Functions deployadas (`firebase deploy --only functions`)
- [ ] Reglas de Firestore y Storage deployadas
- [ ] `apps/web/.env.production` configurado en el servidor
- [ ] `GOOGLE_APPLICATION_CREDENTIALS` apuntando al service account JSON
- [ ] Usuario admin creado con custom claim `role: admin`
- [ ] Al menos 2 posiciones creadas desde el dashboard
