# BE-10 y BE-11 — Registro de candidato y carga de CV

## Objetivo

Este documento explica el flujo implementado para iniciar el alta de un candidato y asociar posteriormente su CV en Firebase Storage.

## Alcance actual

Se implementaron dos piezas:

- `registerCandidate`: Callable Function que registra/inicia el alta del candidato.
- `onCVUploaded`: Storage Trigger que detecta la carga del CV y actualiza el estado del candidato.

## Flujo funcional

El candidato no necesita iniciar sesión funcionalmente. La postulación es pública.

Para poder proteger técnicamente las escrituras en Firebase, se usa autenticación anónima de Firebase. Esto no representa un login visible para el candidato, sino una identidad técnica temporal.

## Flujo técnico

1. El candidato completa sus datos.
2. El frontend obtiene una identidad anónima técnica.
3. El frontend llama a `registerCandidate`.
4. `registerCandidate` crea/actualiza el candidato en Firestore con `cvParseStatus = pending`.
5. La función devuelve `candidateId`.
6. El frontend sube el PDF a Storage en `cvs/{candidateId}/{archivo}.pdf`.
7. Storage dispara `onCVUploaded`.
8. `onCVUploaded` valida que el archivo sea PDF.
9. `onCVUploaded` actualiza:
   - `cvStoragePath`
   - `cvParseStatus = processing`

## Diagrama de flujo

Frontend
↓
Usuario completa datos + selecciona PDF
↓
Llama registerCandidate
↓
Backend valida auth
↓
Backend crea candidato en Firestore con:
cvParseStatus = pending
cvStoragePath = null
↓
Backend devuelve candidateId
↓
Frontend sube PDF a:
cvs/{candidateId}/archivo.pdf
↓
Storage dispara onCVUploaded
↓
Trigger valida:
path correcto
contentType PDF
↓
Trigger actualiza candidato:
cvStoragePath = path del archivo
cvParseStatus = processing

## Estados del CV

- `pending`: el candidato fue creado, pero el CV todavía no fue recibido.
- `processing`: el CV ya fue subido correctamente y quedó listo para procesamiento.
- `done`: reservado para cuando el parseo finalice correctamente.
- `failed`: reservado para errores de procesamiento.

## Cómo probar BE-10 con Postman

### 1. Crear usuario anónimo en Auth Emulator

POST:

`http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`

Body:

```json
{
  "returnSecureToken": true
}
```

Response:

```json
{
  "kind": "identitytoolkit#SignupNewUserResponse",
  "localId": "IqjIuhw1fwyTXRgarlA4pqQ4tYsM",
  "idToken": "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJwcm92aWRlcl9pZCI6ImFub255bW91cyIsImF1dGhfdGltZSI6MTc3ODY4NTI0MCwidXNlcl9pZCI6Iklxakl1aHcxZnd5VFhSZ2FybEE0cHFRNHRZc00iLCJmaXJlYmFzZSI6eyJpZGVudGl0aWVzIjp7fSwic2lnbl9pbl9wcm92aWRlciI6ImFub255bW91cyJ9LCJpYXQiOjE3Nzg2ODUyNDAsImV4cCI6MTc3ODY4ODg0MCwiYXVkIjoiYXRzLXRlbWEtb3J0IiwiaXNzIjoiaHR0cHM6Ly9zZWN1cmV0b2tlbi5nb29nbGUuY29tL2F0cy10ZW1hLW9ydCIsInN1YiI6Iklxakl1aHcxZnd5VFhSZ2FybEE0cHFRNHRZc00ifQ.",
  "refreshToken": "eyJfQXV0aEVtdWxhdG9yUmVmcmVzaFRva2VuIjoiRE8gTk9UIE1PRElGWSIsImxvY2FsSWQiOiJJcWpJdWh3MWZ3eVRYUmdhcmxBNHBxUTR0WXNNIiwicHJvdmlkZXIiOiJhbm9ueW1vdXMiLCJleHRyYUNsYWltcyI6e30sInByb2plY3RJZCI6ImF0cy10ZW1hLW9ydCJ9",
  "expiresIn": "3600"
}
```

### 2. Llamar a registerCandidate

POST:

`http://127.0.0.1:5001/ats-tema-ort/us-central1/registerCandidate`

Body:

```json
{
  "data": {
    "fullName": "Sofia Loria",
    "email": "sofia.test@example.com",
    "hasCv": true,
    "jobId": "job-123"
  }
}
```

Response:

```json
{
  "result": {
    "candidateId": "IqjIuhw1fwyTXRgarlA4pqQ4tYsM",
    "cvParseStatus": "pending"
  }
}
```

## Cómo probar BE-11 de forma manual

1. Crear un candidato usando registerCandidate. (BE-10)
2. Copiar el candidateId.
3. Entrar al Storage Emulator: `http://127.0.0.1:4000/storage`
4. Crear la ruta (carpeta a mano) `cvs/{candidateId}`
   Ejemplo:
   cvs/IqjIuhw1fwyTXRgarlA4pqQ4tYsM/SofiaLoria-CV.pdf
5. Subir un PDF en la ruta y se debe ver `cvs/{candidateId}/{archivo}.pdf`
6. En la ruta se debe actualizar el candidato `http://127.0.0.1:4000/firestore/default/data/candidates/IqjIuhw1fwyTXRgarlA4pqQ4tYsM` (id ejemplo, debe ser el generado)

Resultado esperado en Firestore:

```json
{
  "cvStoragePath": "cvs/{candidateId}/{archivo}.pdf",
  "cvParseStatus": "processing"
}
```

## Consideraciones

1. registerCandidate no recibe el PDF.
2. El PDF se sube a Firebase Storage.
3. onCVUploaded no se llama manualmente; se dispara automáticamente al subir un archivo.
4. Para que el trigger detecte el archivo, la ruta debe empezar con cvs/.
5. BE-11 no realiza parsing todavía; solo marca el CV como recibido y listo para procesamiento.
