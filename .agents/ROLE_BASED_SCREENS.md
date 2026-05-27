# Pantallas con control de acceso por rol

## Roles disponibles

| Rol              | Descripción                                                      |
| ---------------- | ---------------------------------------------------------------- |
| `admin`          | Acceso total                                                     |
| `hr`             | Recruiter — gestión de candidatos y entrevistas de RRHH          |
| `hiring_manager` | Management — entrevistas técnicas y decisiones de contratación   |
| `tech_lead`      | Evaluación técnica — similar a hiring_manager en jerarquía menor |

El rol del usuario autenticado se obtiene con el hook `useAuth()`:

```typescript
const { role } = useAuth();
```

---

## Patrón 1 — Ruta completa visible solo para ciertos roles

Crear un layout específico para esa sección del dashboard que valide el rol.

**Ejemplo: `/dashboard/team` solo para `admin`**

```
apps/web/app/dashboard/team/
  ├── layout.tsx   ← guard de rol
  └── page.tsx     ← contenido
```

**`apps/web/app/dashboard/team/layout.tsx`**

```tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../shared/lib/authContext';

export default function TeamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && role !== 'admin') {
      router.replace('/dashboard/positions');
    }
  }, [role, loading, router]);

  if (loading || role !== 'admin') return null;

  return <>{children}</>;
}
```

Para múltiples roles permitidos, cambiar la condición:

```typescript
const ALLOWED: EmployeeRole[] = ['admin', 'hr'];

if (!loading && !ALLOWED.includes(role!)) {
  router.replace('/dashboard/positions');
}
```

---

## Patrón 2 — Elemento UI visible solo para ciertos roles

Usar las variables booleanas derivadas de `role` directamente en el componente.

**Ejemplo: botón "Gestionar equipo" visible solo para `admin`**

```tsx
'use client';

import { useAuth } from '../../shared/lib/authContext';

export function DashboardActions() {
  const { role } = useAuth();

  const isAdmin = role === 'admin';
  const isAdminOrHr = role === 'admin' || role === 'hr';

  return (
    <Stack direction="row" spacing={1}>
      {isAdminOrHr && (
        <Button onClick={handleCreatePosition}>Nueva posición</Button>
      )}

      {isAdmin && <Button onClick={handleManageTeam}>Gestionar equipo</Button>}
    </Stack>
  );
}
```

---

## Patrón 3 — Link en el Sidebar visible solo para ciertos roles

En `apps/web/app/components/sidebar/Sidebar.tsx`, los `NAV_ITEMS` pueden tener
un campo `allowedRoles` que filtra qué ve cada usuario.

```typescript
import type { EmployeeRole } from '@ats/shared-types';

const NAV_ITEMS: Array<{
  label: string;
  href: string;
  icon: LucideIcon;
  allowedRoles?: EmployeeRole[]; // undefined = todos los roles
}> = [
  {
    label: 'Posiciones',
    href: '/dashboard/positions',
    icon: BriefcaseBusiness,
    // sin allowedRoles → visible para todos
  },
  {
    label: 'Candidatos',
    href: '/dashboard/candidates',
    icon: Users,
    // sin allowedRoles → visible para todos
  },
  {
    label: 'Equipo',
    href: '/dashboard/team',
    icon: ShieldCheck,
    allowedRoles: ['admin'], // solo admin
  },
  {
    label: 'Reportes',
    href: '/dashboard/reports',
    icon: BarChart2,
    allowedRoles: ['admin', 'hiring_manager'], // admin y management
  },
];
```

Luego en el render, filtrar antes de mapear:

```tsx
const { role } = useAuth();

const visibleItems = NAV_ITEMS.filter(
  (item) => !item.allowedRoles || (role && item.allowedRoles.includes(role)),
);

// reemplazar NAV_ITEMS.map(...) por visibleItems.map(...)
```

---

## Referencia rápida de combinaciones comunes

```typescript
const { role } = useAuth();

const isAdmin = role === 'admin';
const isHr = role === 'hr';
const isManagement = role === 'hiring_manager' || role === 'tech_lead';

const isAdminOrHr = isAdmin || isHr;
const isAdminOrManagement = isAdmin || isManagement;
const canDoHrInterview = isAdmin || isHr;
const canDoTechInterview = isAdmin || isManagement;
```

---

## Checklist al agregar una pantalla con restricción de rol

1. Crear `layout.tsx` en la carpeta de la ruta con el guard de rol (Patrón 1)
2. Si hay links en el sidebar, agregar `allowedRoles` al item correspondiente (Patrón 3)
3. El middleware (`apps/web/middleware.ts`) solo verifica que haya sesión activa —
   la validación de rol siempre va en el layout o en el componente
4. No agregar lógica de rol en servicios ni repositorios del frontend —
   solo en componentes y layouts
