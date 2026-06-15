# ATS Tema — Sistema de Reclutamiento y Selección

Monorepo de desarrollo para la plataforma **ATS (Applicant Tracking System) Tema**. Esta solución automatiza los procesos de publicación de empleos, flujo de postulación asistido por IA, dashboard interno de reclutamiento para el equipo de HR y líderes de área, y la integración completa con servicios de Firebase.

---

## Stack Tecnológico

El proyecto está diseñado bajo una arquitectura de monorepo gestionada por **pnpm** y **Turborepo** para garantizar la eficiencia en el desarrollo de componentes cliente y servidor.

| Capa                | Tecnologías                                                        | Descripción                                                       |
| :------------------ | :----------------------------------------------------------------- | :---------------------------------------------------------------- |
| **Frontend**        | Next.js 16 (App Router), React 19, MUI (Material UI 9), TypeScript | Portal de candidatos y panel de control interno de reclutamiento. |
| **Backend**         | Firebase Cloud Functions v2 (Node 22), Firestore                   | Endpoints de negocio HTTP (`onRequest`) y Callables (`onCall`).   |
| **Servicios Cloud** | Firebase Auth, Cloud Storage, Firebase Emulators                   | Autenticación, almacenamiento de CVs y base de datos NoSQL.       |
| **Compartido**      | `packages/shared-types`                                            | Contratos de API, esquemas comunes y validaciones compartidas.    |
| **Tooling**         | pnpm 10, Turborepo, Prettier, ESLint, Vitest                       | Gestión de dependencias, compilación eficiente y testing.         |

---

## Estructura del Proyecto

```txt
ats-tema/
├── apps/
│   ├── web/            # Frontend en Next.js (Portal Público e Interno)
│   ├── functions/      # Backend en Cloud Functions (Lógica de negocio e Integración con IA)
│   └── docs/           # Colecciones de Postman, especificaciones y guías internas
├── docs/               # Documentación general y Especificación Swagger (swagger.json)
├── packages/
│   ├── shared-types/   # Modelos, DTOs y enumeradores compartidos entre web y functions
│   ├── eslint-config/  # Reglas de linting compartidas
│   └── typescript-config/ # Configuraciones de TypeScript base
└── scripts/            # Scripts para sembrado de datos (seeding) en emuladores
```

---

## Requisitos Previos

Antes de arrancar el proyecto localmente, asegúrate de tener instalado:

1. **Node.js**: Versión 22 o superior (obligatorio).
2. **pnpm**: Versión 10 o superior (`npm install -g pnpm`).
3. **Java Development Kit (JDK)**: Requerido para ejecutar el emulador de Firebase (Firestore y Auth locales).
4. **Firebase CLI**: Instalado de forma global (`npm install -g firebase-tools`). Debe iniciarse sesión mediante `firebase login`.

---

## Guía de Inicialización en Local

Sigue estos pasos en orden para levantar todo el ecosistema de desarrollo local:

### 1. Instalar Dependencias

Desde la raíz del repositorio, ejecuta:

```bash
pnpm install
```

### 2. Configurar Variables de Entorno

- **Frontend (`apps/web`)**:
  Crea o revisa el archivo `apps/web/.env.local`. Tomá como base `apps/web/.env.example` o el archivo de ejemplo del proyecto y reemplazá los valores por los que correspondan a tu entorno:

  ```env
  NEXT_PUBLIC_FIREBASE_API_KEY='your-api-key'
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN='your-project.firebaseapp.com'
  NEXT_PUBLIC_FIREBASE_PROJECT_ID='your-project-id'
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET='your-project.appspot.com'
  NEXT_PUBLIC_FUNCTIONS_REGION='us-central1'
  NEXT_PUBLIC_USE_EMULATORS=true
  ```

- **Backend (`apps/functions`)**:
  Crea un archivo `.env` dentro de `apps/functions` tomando como base `apps/functions/.env.example`. Si vas a testear el flujo de Gmail en local, asegúrate de configurar las credenciales OAuth:
  ```env
  GOOGLE_OAUTH_CLIENT_ID=tu_client_id
  GOOGLE_OAUTH_CLIENT_SECRET=tu_client_secret
  GMAIL_MOCK=true # Cambiar a false si se quiere enviar emails reales usando OAuth2
  ```

### 3. Levantar los Emuladores de Firebase

Para iniciar la base de datos local, autenticación local, storage local y el runtime de Cloud Functions locales, ejecuta:

```bash
firebase emulators:start --only auth,firestore,storage,functions
```

Esto levantará el panel de control del emulador en `http://127.0.0.1:4000`.

### 4. Cargar Datos de Prueba (Seeding)

Una vez que los emuladores estén activos, abre otra terminal en la raíz y ejecuta el siguiente comando para poblar la base de datos local con trabajos, candidatos y plantillas de correo de ejemplo:

```bash
pnpm seed
```

_(Opcional)_ Si vas a probar la integración con Gmail para enviar correos usando una cuenta de prueba configurada:

```bash
pnpm seed-gmail
```

### 5. Levantar el Frontend

Para arrancar el frontend en modo desarrollo, ejecuta:

```bash
pnpm dev-web
```

Abre `http://localhost:3000` en tu navegador.

---

## Usuarios de Prueba (Emulador)

En el entorno de desarrollo con emuladores, puedes loguearte directamente utilizando tokens de Firebase Auth mockeados o creando usuarios en la consola. El sistema soporta:

- **Administrador**: Usar claims de rol `admin` para acceder a todo el panel.
- **Reclutador (HR)**: Usar claims de rol `hr` para gestionar vacantes y candidatos.
- **Líder de Área**: Usar claims de rol `area_leader` para ver las postulaciones de su departamento.

Para setear claims personalizados de administrador en el emulador, puedes usar el script provisto en la carpeta correspondiente:

```bash
node scripts/set-admin-claim.mjs --uid <UID_DEL_USUARIO>
```

---

## Documentación de la API

La API del backend está expuesta como Firebase Cloud Functions v2. Contamos con dos tipos de funciones:

1. **HTTP standard (`onRequest`)**: Endpoints REST directos invocados por fetch/axios.
2. **Callables (`onCall`)**: Invocados mediante el SDK cliente de Firebase.

### OpenAPI / Swagger

Toda la especificación técnica de la API está documentada usando OpenAPI 3.0.3 en el archivo:
[docs/swagger.json](./docs/swagger.json)

- **Endpoints REST HTTP**: Se definen de forma estándar bajo el objeto `paths`.
- **Firebase Callables**: Se detallan en la sección personalizada `x-callable-functions` con sus respectivas firmas de payload y response, facilitando su comprensión.

---

## Scripts Disponibles (Comandos Raíz)

| Comando            | Acción                                                                                                 |
| :----------------- | :----------------------------------------------------------------------------------------------------- |
| `pnpm dev`         | Levanta todos los proyectos y compiladores en modo observación (watch) en paralelo.                    |
| `pnpm dev-web`     | Levanta únicamente el servidor de desarrollo de Next.js (Frontend).                                    |
| `pnpm build`       | Compila todo el monorepo para producción (genera bundle de Next.js y compila TypeScript de functions). |
| `pnpm compile-fn`  | Compila las Cloud Functions (`tsc` en `apps/functions`).                                               |
| `pnpm lint`        | Corre el análisis de estilo y linting sobre todo el código base.                                       |
| `pnpm format`      | Formatea el código usando Prettier.                                                                    |
| `pnpm check-types` | Valida que no haya errores de TypeScript en ningún módulo.                                             |
| `pnpm test`        | Ejecuta la suite completa de unit-testing mediante Vitest.                                             |
