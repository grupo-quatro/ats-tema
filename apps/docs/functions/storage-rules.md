# Firebase Storage Rules — CV Uploads

## Objetivo

Las reglas de Firebase Storage protegen la carga y lectura de archivos asociados a candidatos, principalmente CVs en formato PDF.

El flujo esperado para el MVP es:

1. El candidato ingresa al formulario público de postulación.
2. El frontend realiza una autenticación anónima técnica mediante Firebase Auth.
3. El backend registra el candidato mediante la Callable Function `registerCandidate`.
4. Si el candidato sube CV, el archivo se guarda en Firebase Storage bajo la ruta:

```text
cvs/{candidateId}/{fileName}
```

5. El trigger onCVUploaded detecta la carga y actualiza el estado del candidato.

## Regla principal

request.auth.uid == candidateId

Esta condición asegura que el usuario autenticado solo pueda subir archivos dentro de su propia carpeta de candidato.

Ejemplo válido:

Usuario autenticado: uid = abc123
Ruta permitida: cvs/abc123/cv.pdf

Ejemplo inválido:

Usuario autenticado: uid = abc123
Ruta rechazada: cvs/otroUsuario/cv.pdf

## Consideraciones

Estas reglas asumen que el candidato utiliza Firebase Auth de forma anónima, aunque no tenga una pantalla de login visible.

La autenticación anónima no representa un perfil formal de candidato, sino una identidad técnica temporal que permite aplicar reglas de seguridad sobre Storage.

La creación de candidatos y postulaciones no debería realizarse directamente desde el frontend contra Firestore. Ese flujo debe pasar por Cloud Functions mediante Admin SDK.
