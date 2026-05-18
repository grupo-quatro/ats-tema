# Manejo de Estados en la UI

Guía para conectar cualquier feature del frontend con el backend siguiendo la arquitectura del proyecto.

---

## Arquitectura de capas

Toda feature que necesite datos o acciones del backend sigue este flujo:

```
Componente / Page
  └─ Hook (TanStack Query)
       └─ XxxService  (lógica de negocio)
            └─ IXxxRepository  (interfaz)
                 └─ XxxFirebaseRepository  (implementación Firebase)
```

> **Regla crítica:** Firebase solo puede importarse en `apps/web/app/repositories/firebase/` y en `apps/web/app/shared/lib/firebase.ts`. Nunca en componentes ni en services.

---

## Cuándo usar `useMutation` vs `useQuery`

| Situación                                              | Hook a usar              |
| ------------------------------------------------------ | ------------------------ |
| El usuario dispara una acción (submit, upload, delete) | `useMutation`            |
| Hay que leer/mostrar datos al montar el componente     | `useQuery`               |
| Leer datos pero refrescarlos manualmente               | `useQuery` con `refetch` |

---

## Patrón para acciones — `useMutation`

### 1. Definir el hook

```ts
// apps/web/app/features/xxx/hooks/useXxx.ts
'use client';
import { useMutation } from '@tanstack/react-query';
import { XxxService } from '../xxx.service';
import { XxxFirebaseRepository } from '../../../repositories/firebase/xxx.firebase.repository';

const service = new XxxService(new XxxFirebaseRepository());

export function useDoSomething() {
  return useMutation({
    mutationFn: (payload: XxxPayload) => service.doSomething(payload),
  });
}
```

### 2. Usar en el componente

```tsx
const { mutateAsync, isPending, isError, error, isSuccess } = useDoSomething();

const handleSubmit = async (data: FormData) => {
  try {
    const result = await mutateAsync(data);
    router.push(`/success?id=${result.id}`);
  } catch {
    // No relanzar — isError y error ya capturan el fallo
  }
};
```

### 3. Estados disponibles y su uso en JSX

| Estado      | Qué significa          | Uso en UI                           |
| ----------- | ---------------------- | ----------------------------------- |
| `isPending` | Mutation en curso      | Deshabilitar botón, mostrar spinner |
| `isError`   | Falló                  | `<Alert severity="error">`          |
| `isSuccess` | Completó               | Redirigir, mostrar confirmación     |
| `data`      | Respuesta del servidor | Leer campos del resultado           |
| `reset()`   | Limpia el estado       | Botón "Reintentar"                  |

```tsx
{
  /* Feedback de error */
}
{
  isError && (
    <Alert severity="error">
      {error instanceof Error
        ? error.message
        : 'Ocurrió un error. Intentá de nuevo.'}
    </Alert>
  );
}

{
  /* Botón con estado de carga */
}
<Button
  type="submit"
  disabled={isPending}
  startIcon={isPending ? <CircularProgress size={16} color="inherit" /> : null}
>
  {isPending ? 'Guardando...' : 'Guardar'}
</Button>;
```

> **Nunca uses `useState` propio para loading/error** cuando TanStack Query ya los expone. Un `const [loading, setLoading] = useState(false)` manual dentro de un `mutateAsync` es duplicación innecesaria.

---

## Patrón para lectura de datos — `useQuery`

### 1. Definir el hook

```ts
import { useQuery } from '@tanstack/react-query';

export function useGetSomething(id: string) {
  return useQuery({
    queryKey: ['something', id], // clave única — cambia si cambia id
    queryFn: () => service.getSomething(id),
    enabled: !!id, // no correr si id está vacío
  });
}
```

### 2. Usar en el componente

```tsx
const { data, isPending, isError, error } = useGetSomething(id);

if (isPending) return <CircularProgress />;
if (isError) return <Alert severity="error">{error.message}</Alert>;

return <div>{data.name}</div>;
```

### `queryKey` — clave para el cache

La `queryKey` es como el identificador del cache. Reglas:

- Incluir todos los parámetros que cambian el resultado: `['jobs', { status, page }]`
- Si cambia la key, TanStack Query hace un nuevo fetch automáticamente
- Para invalidar el cache después de una mutación (ej: después de crear, refrescar lista):

```ts
const queryClient = useQueryClient();

useMutation({
  mutationFn: createJob,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['jobs'] });
  },
});
```

---

## Agregar un nuevo feature — checklist

1. **Tipos compartidos** en `packages/shared-types/src/`
   - `XxxPayload` (lo que se envía)
   - `XxxResponse` (lo que devuelve el backend)

2. **Interfaz del repositorio** en `apps/web/app/repositories/interfaces/xxx.repository.ts`

   ```ts
   export interface IXxxRepository {
     doSomething(payload: XxxPayload): Promise<XxxResponse>;
   }
   ```

3. **Implementación Firebase** en `apps/web/app/repositories/firebase/xxx.firebase.repository.ts`

   ```ts
   export class XxxFirebaseRepository implements IXxxRepository {
     async doSomething(payload: XxxPayload): Promise<XxxResponse> {
       await signInAnonymously(auth); // si el callable requiere auth
       const result = await callFunction<XxxPayload, XxxResponse>(
         'functionName',
         payload,
       );
       return result.data;
     }
   }
   ```

4. **Service** en `apps/web/app/features/xxx/xxx.service.ts`

   ```ts
   export class XxxService {
     constructor(private readonly repo: IXxxRepository) {}

     async doSomething(payload: XxxPayload): Promise<XxxResponse> {
       try {
         return await this.repo.doSomething(payload);
       } catch (error) {
         throw new Error('Mensaje amigable para el usuario.', { cause: error });
       }
     }
   }
   ```

5. **Hook** en `apps/web/app/features/xxx/hooks/useXxx.ts`
6. **Componente** — usar el hook, manejar `isPending`, `isError`, `isSuccess`

---

## Manejo de errores

Los errores se propagan hacia arriba desde el repositorio. El service los captura y re-lanza con mensajes amigables. El hook los expone como `error`. El componente solo muestra el mensaje.

```
Firebase lanza error técnico
  → Repository lo deja pasar
    → Service lo captura y lanza Error("Mensaje amigable")
      → Hook lo expone en `error`
        → Componente muestra `error.message`
```

**No mostrar errores técnicos de Firebase al usuario** (códigos como `functions/unauthenticated` o paths de Storage). El service es el lugar correcto para traducirlos.

---

## Referencia — feature de postulación

El flujo de postulación ya implementado sirve como referencia concreta:

| Capa        | Archivo                                                                                      |
| ----------- | -------------------------------------------------------------------------------------------- |
| Tipos       | `packages/shared-types/src/contracts/register-candidates-manual.ts`                          |
| Interfaz    | `apps/web/app/repositories/interfaces/candidate.repository.ts`                               |
| Repositorio | `apps/web/app/repositories/firebase/candidate.firebase.repository.ts`                        |
| Service     | `apps/web/app/features/postulation/postulation.service.ts`                                   |
| Hooks       | `apps/web/app/features/postulation/hooks/usePostulation.ts`                                  |
| Componente  | `apps/web/app/features/postulation/components/manual-candidate-form/ManualCandidateForm.tsx` |
