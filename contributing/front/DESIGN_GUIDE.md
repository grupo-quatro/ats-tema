# Guía de Desarrollo Frontend — ATS Recruiting Platform

## Stack

| Librería                                 | Versión | Uso                                |
| ---------------------------------------- | ------- | ---------------------------------- |
| `@mui/material`                          | v5/v6   | Componentes base                   |
| `@tanstack/react-query`                  | v5      | Fetching y caché de datos          |
| `@tanstack/react-form`                   | latest  | Lógica y validación de formularios |
| `lucide-react`                           | latest  | Iconos (única fuente permitida)    |
| `@mui/material` `Box` / `Stack` / `Grid` | v5/v6   | Layout estructural                 |

---

## 1. Paleta de colores

**Regla estricta: no introducir ningún color fuera de esta lista.**

| Token     | Hex         | Cuándo usarlo               |
| --------- | ----------- | --------------------------- |
| `#2563eb` | Primary 600 | Botones principales, CTAs   |
| `#1d4ed8` | Primary 700 | Hover de botones            |
| `#f8fafc` | Background  | Fondo de página             |
| `#ffffff` | Card BG     | Superficies de tarjetas     |
| `#0f172a` | Slate 900   | Títulos                     |
| `#334155` | Slate 700   | Cuerpo de texto, labels     |
| `#ef4444` | Red 500     | Errores y estados inválidos |
| `#16a34a` | Green 600   | Éxito y confirmaciones      |

El tema MUI ya tiene estos valores configurados en `apps/web/app/lib/theme.ts`. Usa siempre las props semánticas de MUI (`color="primary"`, `color="error"`, etc.) en lugar de valores hardcodeados.

```tsx
// ✅ Correcto
<Button color="primary">Guardar</Button>
<Alert severity="error">Error al guardar</Alert>

// ❌ Incorrecto
<Button sx={{ backgroundColor: "#2563eb" }}>Guardar</Button>
```

---

## 2. Tipografía

Solo dos pesos de fuente: `400` (normal) y `500` (medium). Usa los variants de `Typography` de MUI.

```tsx
import Typography from "@mui/material/Typography";

// Título de página — 30px / font-medium
<Typography variant="h1">Panel de Candidatos</Typography>

// Subtítulo de sección — 24px / font-medium
<Typography variant="h2">Vacantes activas</Typography>

// Texto principal — 16px / font-normal
<Typography variant="body1">Descripción del puesto</Typography>

// Texto secundario — 14px / font-normal
<Typography variant="body2">Actualizado hace 2 horas</Typography>
```

---

## 3. Iconos

**Solo `lucide-react`.** No usar `@mui/icons-material` ni ninguna otra fuente de iconos.

```tsx
import { Search, Plus, ChevronDown } from "lucide-react";

// Integrar con componentes MUI
<Button startIcon={<Plus size={16} />}>Nueva vacante</Button>
<IconButton><Search size={20} /></IconButton>
```

---

## 4. Formularios con TanStack Form

Toda la lógica de formularios vive en TanStack Form. MUI provee solo la UI.

### Setup básico

```tsx
"use client";

import { useForm } from "@tanstack/react-form";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";

export function CandidateForm() {
  const form = useForm({
    defaultValues: {
      fullName: "",
      email: "",
    },
    onSubmit: async ({ value }) => {
      // Llamar a la mutación o API aquí
      console.log(value);
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      <form.Field
        name="fullName"
        validators={{
          onChange: ({ value }) =>
            !value ? "El nombre es requerido" : undefined,
        }}
        children={(field) => (
          <TextField
            label="Nombre completo"
            variant="outlined"
            fullWidth
            required
            value={field.state.value}
            onBlur={field.handleBlur}
            onChange={(e) => field.handleChange(e.target.value)}
            error={!!field.state.meta.errors.length}
            helperText={field.state.meta.errors[0]}
          />
        )}
      />

      <form.Field
        name="email"
        validators={{
          onChange: ({ value }) =>
            !value
              ? "El email es requerido"
              : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
                ? "Email inválido"
                : undefined,
        }}
        children={(field) => (
          <TextField
            label="Correo electrónico"
            type="email"
            variant="outlined"
            fullWidth
            required
            value={field.state.value}
            onBlur={field.handleBlur}
            onChange={(e) => field.handleChange(e.target.value)}
            error={!!field.state.meta.errors.length}
            helperText={field.state.meta.errors[0]}
          />
        )}
      />

      <form.Subscribe
        selector={(state) => [state.canSubmit, state.isSubmitting]}
        children={([canSubmit, isSubmitting]) => (
          <Button
            type="submit"
            variant="contained"
            disabled={!canSubmit || isSubmitting}
          >
            {isSubmitting ? "Guardando..." : "Guardar candidato"}
          </Button>
        )}
      />
    </form>
  );
}
```

### Reglas de validación

- La validación va en el `validators` del `field`, no en el componente MUI.
- Usar `onChange` para validación en tiempo real, `onBlur` para validación al salir del campo.
- El mensaje de error siempre en `helperText` del `TextField`.

---

## 5. Fetching de datos con TanStack Query

### Estructura de un hook de datos

Crea los hooks en `apps/web/app/features/<feature>/hooks/`.

```tsx
// app/features/candidates/hooks/useCandidates.ts
import { useQuery } from "@tanstack/react-query";

async function fetchCandidates() {
  const res = await fetch("/api/candidates");
  if (!res.ok) throw new Error("Error al obtener candidatos");
  return res.json();
}

export function useCandidates() {
  return useQuery({
    queryKey: ["candidates"],
    queryFn: fetchCandidates,
  });
}
```

### Consumir en un componente con estado de carga

Siempre implementar el estado `isLoading` con `Skeleton` de MUI y el estado de error con `Alert`.

```tsx
"use client";

import Skeleton from "@mui/material/Skeleton";
import Alert from "@mui/material/Alert";
import { useCandidates } from "./hooks/useCandidates";

export function CandidateList() {
  const { data, isLoading, isError } = useCandidates();

  if (isLoading) {
    return (
      <>
        <Skeleton
          variant="rectangular"
          height={80}
          sx={{ borderRadius: 2, mb: 2 }}
        />
        <Skeleton
          variant="rectangular"
          height={80}
          sx={{ borderRadius: 2, mb: 2 }}
        />
        <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 2 }} />
      </>
    );
  }

  if (isError) {
    return (
      <Alert severity="error">
        No se pudieron cargar los candidatos. Intenta nuevamente.
      </Alert>
    );
  }

  return (
    <>
      {data.map((candidate) => (
        <div key={candidate.id}>{candidate.fullName}</div>
      ))}
    </>
  );
}
```

---

## 6. Botones

```tsx
// Primario — acción principal de la pantalla
<Button variant="contained">Publicar vacante</Button>

// Secundario — acción de apoyo
<Button variant="outlined">Cancelar</Button>

// Tarjeta seleccionable
import ButtonBase from "@mui/material/ButtonBase";

<ButtonBase
  sx={{
    border: "2px solid",
    borderColor: selected ? "primary.main" : "#e2e8f0",
    borderRadius: "16px",
    p: 3,
    width: "100%",
    "&:hover": { borderColor: "primary.main" },
  }}
  onClick={() => setSelected(true)}
>
  Contenido de la tarjeta
</ButtonBase>
```

---

## 7. Layout y espaciado

### Grid

```tsx
import Grid from "@mui/material/Grid";

<Grid container spacing={3}>
  <Grid item xs={12} md={6}>
    {/* Columna izquierda */}
  </Grid>
  <Grid item xs={12} md={6}>
    {/* Columna derecha */}
  </Grid>
</Grid>;
```

### Tarjetas

```tsx
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";

// El tema ya aplica borderRadius: 16px
<Card>
  <CardContent sx={{ p: 4 }}>Contenido</CardContent>
</Card>;
```

### Reglas de espaciado

| Prop MUI `sx`     | Valor real | Cuándo                      |
| ----------------- | ---------- | --------------------------- |
| `p: 4`            | 32px       | Padding interno de tarjetas |
| `spacing={3}`     | 24px gap   | Grid containers             |
| `borderRadius: 2` | 8px        | Inputs y botones            |
| `borderRadius: 4` | 16px       | Tarjetas y modales          |

---

## 8. Layout con MUI — Box, Stack y Grid

No se usa Tailwind. Todo el layout se resuelve con los componentes de MUI para mantener una única fuente de verdad con el sistema de spacing del tema.

### Stack — para layouts flex

```tsx
import Stack from "@mui/material/Stack";

// Fila con espacio entre elementos
<Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
  <Typography variant="h2">Candidatos</Typography>
  <Button variant="contained">Agregar</Button>
</Stack>

// Columna con separación uniforme
<Stack gap={3}>
  <CandidateCard />
  <CandidateCard />
</Stack>
```

### Box — para contenedores genéricos

```tsx
import Box from "@mui/material/Box";

<Box display="grid" gridTemplateColumns="repeat(3, 1fr)" gap={3}>
  <Card>...</Card>
  <Card>...</Card>
  <Card>...</Card>
</Box>;
```

### Grid — para layouts responsivos

```tsx
import Grid from "@mui/material/Grid";

<Grid container spacing={3}>
  <Grid item xs={12} md={6}>
    {/* Columna izquierda */}
  </Grid>
  <Grid item xs={12} md={6}>
    {/* Columna derecha */}
  </Grid>
</Grid>;
```

### Regla general

| Necesidad                               | Componente |
| --------------------------------------- | ---------- |
| Fila o columna simple                   | `Stack`    |
| Contenedor con estilos custom           | `Box`      |
| Layout responsivo de múltiples columnas | `Grid`     |

---

## 9. Checklist antes de hacer PR

- [ ] ¿Los datos se obtienen con `useQuery`?
- [ ] ¿La validación del formulario está en TanStack Form, no en el componente?
- [ ] ¿Se muestra `Skeleton` mientras `isLoading` es `true`?
- [ ] ¿Se muestra `Alert severity="error"` cuando hay error?
- [ ] ¿Todos los colores están dentro de la paleta definida?
- [ ] ¿Los iconos son exclusivamente de `lucide-react`?
- [ ] ¿Los botones primarios tienen `variant="contained"` y `disableElevation`?
