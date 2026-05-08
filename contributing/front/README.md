# Frontend — ATS Recruiting Platform

El frontend está en `apps/web` y corre con **Next.js 16** usando App Router. No hay configuración de rutas — la estructura de carpetas dentro de `app/` define las URLs directamente.

---

## Ruteo

La carpeta es la URL. Si dentro de esa carpeta hay un `page.tsx`, la ruta existe.

```
app/
├── layout.tsx             →  layout raíz (providers MUI + TanStack)
├── page.tsx               →  /
└── postulacion/
    └── [jobId]/
        └── page.tsx       →  /postulacion/abc-123
```

### Archivos especiales

| Archivo | Qué hace |
|---|---|
| `page.tsx` | La pantalla que ve el usuario |
| `layout.tsx` | Envuelve a todas las rutas hijas (navbar, sidebar, etc.) |
| `loading.tsx` | Se muestra automáticamente mientras carga la página |
| `error.tsx` | Se muestra si la página tira un error |

### Parámetros dinámicos

Los corchetes `[param]` en el nombre de la carpeta indican un segmento dinámico de la URL:

```
/postulacion/abc-123   →  jobId = "abc-123"
/postulacion/xyz-456   →  jobId = "xyz-456"
```

Para leer el parámetro en el componente:

```tsx
export default function PostulationPage({ params }) {
  const { jobId } = params;
}
```

### Navegación entre rutas

Usar siempre el `Link` de Next.js, nunca una etiqueta `<a>`:

```tsx
import Link from "next/link";

<Link href="/postulacion/abc-123">Ver postulación</Link>
```

---

## Correr el proyecto

```bash
pnpm dev --filter @ats/web
```

Disponible en `http://localhost:3000`.

---

## Más información

- [Guía de diseño y componentes](./DESIGN_GUIDE.md)
