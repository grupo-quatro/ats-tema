# Registro de Candidatos, Carga de CV y Confirmación de Perfil

## Objetivo

Este documento especifica la arquitectura de flujos y contratos para la ingesta de candidatos en la plataforma de reclutamiento de TEMA. Describe tanto el alta directa por formulario manual como el procesamiento asincrónico basado en IA para la carga de CVs.

## Alcance del Módulo

El sistema expone tres endpoints (HTTPS Callables) y un listener de infraestructura (Storage Trigger) diseñados bajo el principio de responsabilidad única para garantizar la consistencia en el motor de persistencia:

1. `registerCandidate`: Ingesta directa para formularios completados manualmente.
2. `registerCandidateCV`: Inicialización de postulación para flujos basados en extracción automatizada.
3. `onCVUploaded`: Trigger asincrónico que reacciona a la subida física del documento en Storage e inicia el análisis cognitivo.
4. `confirmCandidateProfile`: Consolidación definitiva de datos y activación de la postulación en el pipeline posterior al parsing.

---

## Flujos Técnicos de Ingesta

### Flujo 1: Postulación Manual (Data Entry Directo)

Se utiliza cuando el candidato digita toda su información en los campos del formulario de Next.js sin depender de la lectura de un archivo adjunto.

```txt
Frontend (Formulario Completo)
  ↓
Llama a 'registerCandidate' (Payload con datos profesionales + jobId)
  ↓
Backend persiste Candidato y crea Postulación Activa
  ↓
Backend responde: { cvParseStatus: "not_required", applicationStatus: "active" }
  ↓
Frontend redirige directo a pantalla de éxito (/success)
```
