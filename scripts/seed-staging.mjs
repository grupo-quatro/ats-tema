#!/usr/bin/env node
/**
 * Seed para staging contra Firestore real (ats-tema-ort).
 * Crea jobs, candidatos, aplicaciones, email templates y email logs.
 * Los usuarios (employees) se crean a través del login con Google — no los toca este script.
 *
 * Prerequisito:
 *   gcloud auth application-default login
 *
 * Uso:
 *   node scripts/seed-staging.mjs
 *
 * O con FIREBASE_PROJECT_ID para apuntar a otro proyecto:
 *   FIREBASE_PROJECT_ID=otro-proyecto node scripts/seed-staging.mjs
 */

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fnRequire = createRequire(join(__dirname, '../apps/functions/package.json'));

const admin = fnRequire('firebase-admin');
const { FieldValue } = fnRequire('firebase-admin/firestore');

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID ?? 'ats-tema-ort';

admin.initializeApp({ projectId: PROJECT_ID });
const db = admin.firestore();

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const JOBS = [
  { id: 'frontend-ssr-developer', title: 'Frontend SSR Developer', department: 'Tecnología', location: 'Remoto', modality: 'remote', seniority: 'semi-senior', status: 'open' },
  { id: 'backend-firebase-developer', title: 'Backend Firebase Developer', department: 'Tecnología', location: 'Remoto', modality: 'remote', seniority: 'senior', status: 'open' },
  { id: 'technical-recruiter', title: 'Technical Recruiter', department: 'RRHH', location: 'Buenos Aires, Argentina', modality: 'hybrid', seniority: 'senior', status: 'open' },
  { id: 'qa-automation-analyst', title: 'QA Automation Analyst', department: 'Calidad', location: 'Remoto', modality: 'remote', seniority: 'semi-senior', status: 'open' },
  { id: 'ux-ui-designer', title: 'UX/UI Designer', department: 'Diseño', location: 'Córdoba, Argentina', modality: 'hybrid', seniority: 'semi-senior', status: 'open' },
];

const CANDIDATES = [
  { id: 'seed-candidate-01', firstName: 'Valentina', lastName: 'Rossi', fullName: 'Valentina Rossi', email: 'valentina.rossi@example.com', phone: '+54 11 2345-6789', yearsOfExperience: 5, location: 'Buenos Aires, Argentina', technicalSkills: ['React', 'Next.js', 'TypeScript', 'SSR', 'Firebase'], professionalSummary: 'Frontend developer con foco en SSR y performance.', profileStatus: 'completed', registrationType: 'specific', registrationSource: 'cv_upload', cvParseStatus: 'done' },
  { id: 'seed-candidate-02', firstName: 'Mateo', lastName: 'Fernández', fullName: 'Mateo Fernández', email: 'mateo.fernandez@example.com', phone: '+54 11 3456-7890', yearsOfExperience: 3, location: 'Córdoba, Argentina', technicalSkills: ['React', 'Next.js', 'TypeScript', 'MUI'], professionalSummary: 'Desarrollador frontend semi-senior con experiencia en B2B.', profileStatus: 'completed', registrationType: 'specific', registrationSource: 'manual', cvParseStatus: 'not_required' },
  { id: 'seed-candidate-03', firstName: 'Lucía', lastName: 'Gómez', fullName: 'Lucía Gómez', email: 'lucia.gomez@example.com', phone: '+54 11 4567-8901', yearsOfExperience: 4, location: 'Rosario, Argentina', technicalSkills: ['Node.js', 'TypeScript', 'Firebase Functions', 'Firestore'], professionalSummary: 'Backend developer con foco en Cloud Functions.', profileStatus: 'completed', registrationType: 'specific', registrationSource: 'cv_upload', cvParseStatus: 'done' },
  { id: 'seed-candidate-04', firstName: 'Sebastián', lastName: 'Torres', fullName: 'Sebastián Torres', email: 'sebastian.torres@example.com', phone: '+54 11 5678-9012', yearsOfExperience: 6, location: 'Buenos Aires, Argentina', technicalSkills: ['Node.js', 'TypeScript', 'Firebase Functions', 'OpenAI API', 'Vitest'], professionalSummary: 'Senior backend engineer con experiencia en IA.', profileStatus: 'completed', registrationType: 'specific', registrationSource: 'cv_upload', cvParseStatus: 'done' },
  { id: 'seed-candidate-05', firstName: 'Camila', lastName: 'Herrera', fullName: 'Camila Herrera', email: 'camila.herrera@example.com', phone: '+54 11 6789-0123', yearsOfExperience: 4, location: 'Buenos Aires, Argentina', technicalSkills: ['Reclutamiento IT', 'Entrevistas', 'LinkedIn Recruiter', 'ATS'], professionalSummary: 'Technical recruiter con foco en perfiles tech.', profileStatus: 'completed', registrationType: 'specific', registrationSource: 'manual', cvParseStatus: 'not_required' },
  { id: 'seed-candidate-06', firstName: 'Nicolás', lastName: 'Martínez', fullName: 'Nicolás Martínez', email: 'nicolas.martinez@example.com', phone: '+54 11 7890-1234', yearsOfExperience: 3, location: 'Mendoza, Argentina', technicalSkills: ['Testing funcional', 'Automatización', 'Playwright', 'Cypress'], professionalSummary: 'QA automation analyst con experiencia en fintech.', profileStatus: 'completed', registrationType: 'specific', registrationSource: 'cv_upload', cvParseStatus: 'done' },
  { id: 'seed-candidate-07', firstName: 'Ana', lastName: 'López', fullName: 'Ana López', email: 'ana.lopez@example.com', phone: '+54 11 8901-2345', yearsOfExperience: 2, location: 'Buenos Aires, Argentina', technicalSkills: ['React', 'Next.js', 'TypeScript'], professionalSummary: 'Desarrolladora frontend junior con perfil de diseño.', profileStatus: 'draft', registrationType: 'specific', registrationSource: 'cv_upload', cvParseStatus: 'pending' },
  { id: 'seed-candidate-08', firstName: 'Diego', lastName: 'Ruiz', fullName: 'Diego Ruiz', email: 'diego.ruiz@example.com', phone: '+54 11 9012-3456', yearsOfExperience: 7, location: 'Buenos Aires, Argentina', technicalSkills: ['Node.js', 'TypeScript', 'Firestore', 'Firebase Functions', 'Emulator Suite'], professionalSummary: 'Backend senior con trayectoria en Firebase.', profileStatus: 'completed', registrationType: 'specific', registrationSource: 'cv_upload', cvParseStatus: 'done' },
];

const CANDIDATE_MAP = Object.fromEntries(CANDIDATES.map((c) => [c.id, c]));

const APPLICATIONS = [
  { candidateId: 'seed-candidate-01', jobId: 'frontend-ssr-developer', stage: 'tech_1_done', status: 'active', fitScore: 91, notes: 'Entrevista técnica excelente. Recomendar oferta.' },
  { candidateId: 'seed-candidate-02', jobId: 'frontend-ssr-developer', stage: 'hr_1_done', status: 'active', fitScore: 74, notes: 'Pasar a segunda entrevista técnica.' },
  { candidateId: 'seed-candidate-07', jobId: 'frontend-ssr-developer', stage: 'cv_submitted', status: 'active', fitScore: 58 },
  { candidateId: 'seed-candidate-04', jobId: 'frontend-ssr-developer', stage: 'rejected', status: 'rejected', fitScore: 32, rejectionReason: 'Stack no alineado con el rol frontend.' },
  { candidateId: 'seed-candidate-04', jobId: 'backend-firebase-developer', stage: 'send_offer', status: 'active', fitScore: 95, notes: 'Oferta en preparación.' },
  { candidateId: 'seed-candidate-03', jobId: 'backend-firebase-developer', stage: 'schedule_hr_1', status: 'active', fitScore: 80 },
  { candidateId: 'seed-candidate-08', jobId: 'backend-firebase-developer', stage: 'screening', status: 'active', fitScore: 88 },
  { candidateId: 'seed-candidate-05', jobId: 'technical-recruiter', stage: 'hired', status: 'hired', fitScore: 87, notes: 'Incorporación acordada para el 01/06.' },
  { candidateId: 'seed-candidate-01', jobId: 'technical-recruiter', stage: 'withdrawn', status: 'withdrawn', fitScore: 45, rejectionReason: 'Candidata retiró su postulación.' },
  { candidateId: 'seed-candidate-06', jobId: 'qa-automation-analyst', stage: 'hr_2_done', status: 'active', fitScore: 83 },
  { candidateId: 'seed-candidate-02', jobId: 'qa-automation-analyst', stage: 'applied', status: 'active', fitScore: 51 },
];

const EMAIL_TEMPLATES = [
  { id: 'confirmacion-recepcion', name: 'Confirmación de Recepción', stage: 'application_received', subject: 'Hemos recibido tu postulación para [Nombre de la Posición]', body: '<p>Estimado/a [Nombre del Candidato],</p><p>Nos complace informarte que hemos recibido tu postulación para el puesto de <strong>[Nombre de la Posición]</strong> en <strong>[Nombre de la Empresa]</strong>.</p><p>Nuestro equipo revisará tu perfil y nos pondremos en contacto contigo próximamente.</p><p>Saludos,<br>[Nombre del Reclutador]<br>[Email del Reclutador]</p>', isDefault: true },
  { id: 'invitacion-entrevista-rrhh-1', name: 'Invitación 1ª Entrevista RRHH', stage: 'sch_interview_hr_1', subject: 'Te invitamos a agendar tu 1ª entrevista con RRHH — [Nombre de la Posición]', body: '<p>Estimado/a [Nombre del Candidato],</p><p>Nos alegra informarte que has avanzado en el proceso de selección para el puesto de <strong>[Nombre de la Posición]</strong> en <strong>[Nombre de la Empresa]</strong>.</p><p>Te invitamos a agendar tu entrevista con nuestro equipo de RRHH:</p><p><a href="[Link de Agenda]" style="display:inline-block;background-color:#F4511E;color:#ffffff;font-family:sans-serif;font-size:14px;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:6px;">Reservar una cita</a></p><p>Saludos,<br>[Nombre del Reclutador]<br>[Email del Reclutador]</p>', isDefault: true },
  { id: 'entrevista-rrhh-1-agendada', name: '1ª Entrevista RRHH Agendada', stage: 'interview_hr_1', subject: 'Tu 1ª entrevista con RRHH está confirmada — [Nombre de la Posición]', body: '<p>Estimado/a [Nombre del Candidato],</p><p>¡Perfecto! Tu entrevista con el equipo de RRHH para el puesto de <strong>[Nombre de la Posición]</strong> ha quedado agendada.</p><p>Saludos,<br>[Nombre del Reclutador]<br>[Email del Reclutador]</p>', isDefault: true },
  { id: 'invitacion-entrevista-rrhh-2', name: 'Invitación 2ª Entrevista RRHH', stage: 'sch_interview_hr_2', subject: 'Te invitamos a agendar tu 2ª entrevista con RRHH — [Nombre de la Posición]', body: '<p>Estimado/a [Nombre del Candidato],</p><p>Queremos avanzar con una segunda instancia de entrevista con nuestro equipo de RRHH para el puesto de <strong>[Nombre de la Posición]</strong>.</p><p><a href="[Link de Agenda]" style="display:inline-block;background-color:#F4511E;color:#ffffff;font-family:sans-serif;font-size:14px;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:6px;">Reservar una cita</a></p><p>Saludos,<br>[Nombre del Reclutador]<br>[Email del Reclutador]</p>', isDefault: true },
  { id: 'entrevista-rrhh-2-agendada', name: '2ª Entrevista RRHH Agendada', stage: 'interview_hr_2', subject: 'Tu 2ª entrevista con RRHH está confirmada — [Nombre de la Posición]', body: '<p>Estimado/a [Nombre del Candidato],</p><p>Tu segunda entrevista con el equipo de RRHH para el puesto de <strong>[Nombre de la Posición]</strong> ha quedado agendada.</p><p>Saludos,<br>[Nombre del Reclutador]<br>[Email del Reclutador]</p>', isDefault: true },
  { id: 'invitacion-entrevista-tecnica-1', name: 'Invitación 1ª Entrevista Técnica', stage: 'sch_interview_tech_1', subject: 'Te invitamos a agendar tu 1ª entrevista técnica — [Nombre de la Posición]', body: '<p>Estimado/a [Nombre del Candidato],</p><p>Has avanzado a la instancia de evaluación técnica para el puesto de <strong>[Nombre de la Posición]</strong>.</p><p><a href="[Link de Agenda]" style="display:inline-block;background-color:#F4511E;color:#ffffff;font-family:sans-serif;font-size:14px;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:6px;">Reservar una cita</a></p><p>Saludos,<br>[Nombre del Reclutador]<br>[Email del Reclutador]</p>', isDefault: true },
  { id: 'entrevista-tecnica-1-agendada', name: '1ª Entrevista Técnica Agendada', stage: 'interview_tech_1', subject: 'Tu 1ª entrevista técnica está confirmada — [Nombre de la Posición]', body: '<p>Estimado/a [Nombre del Candidato],</p><p>¡Excelente! Tu primera entrevista técnica para el puesto de <strong>[Nombre de la Posición]</strong> ha quedado agendada.</p><p>Saludos,<br>[Nombre del Reclutador]<br>[Email del Reclutador]</p>', isDefault: true },
  { id: 'invitacion-entrevista-tecnica-2', name: 'Invitación 2ª Entrevista Técnica', stage: 'sch_interview_tech_2', subject: 'Te invitamos a agendar tu 2ª entrevista técnica — [Nombre de la Posición]', body: '<p>Estimado/a [Nombre del Candidato],</p><p>Queremos avanzar con una segunda instancia técnica para el puesto de <strong>[Nombre de la Posición]</strong>.</p><p><a href="[Link de Agenda]" style="display:inline-block;background-color:#F4511E;color:#ffffff;font-family:sans-serif;font-size:14px;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:6px;">Reservar una cita</a></p><p>Saludos,<br>[Nombre del Reclutador]<br>[Email del Reclutador]</p>', isDefault: true },
  { id: 'entrevista-tecnica-2-agendada', name: '2ª Entrevista Técnica Agendada', stage: 'interview_tech_2', subject: 'Tu 2ª entrevista técnica está confirmada — [Nombre de la Posición]', body: '<p>Estimado/a [Nombre del Candidato],</p><p>Tu segunda entrevista técnica para el puesto de <strong>[Nombre de la Posición]</strong> ha quedado agendada.</p><p>Saludos,<br>[Nombre del Reclutador]<br>[Email del Reclutador]</p>', isDefault: true },
  { id: 'entrevista-presencial', name: 'Entrevista presencial', stage: 'onsite_interview', subject: 'Te esperamos para una entrevista presencial — [Nombre de la Posición]', body: '<p>Estimado/a [Nombre del Candidato],</p><p>Queremos invitarte a una entrevista presencial para el puesto de <strong>[Nombre de la Posición]</strong>.</p><p><strong>Dirección:</strong> COMPLETAR DIRECCIÓN</p><p>Saludos,<br>[Nombre del Reclutador]<br>[Email del Reclutador]</p>', isDefault: true },
  { id: 'oferta-laboral', name: 'Oferta Laboral', stage: 'offer', subject: 'Tenemos una oferta para vos — [Nombre de la Posición]', body: '<p>Estimado/a [Nombre del Candidato],</p><p>Es un placer informarte que queremos extenderte una oferta para el puesto de <strong>[Nombre de la Posición]</strong>.</p><p>Saludos,<br>[Nombre del Reclutador]<br>[Email del Reclutador]</p>', isDefault: true },
  { id: 'bienvenida', name: 'Bienvenida al equipo', stage: 'hired', subject: '¡Bienvenido/a a [Nombre de la Empresa]!', body: '<p>Estimado/a [Nombre del Candidato],</p><p>Nos alegra darte la bienvenida al equipo de <strong>[Nombre de la Empresa]</strong> en el rol de <strong>[Nombre de la Posición]</strong>.</p><p>¡Hasta pronto!<br>[Nombre del Reclutador]<br>[Email del Reclutador]</p>', isDefault: true },
  { id: 'rechazo-cordial', name: 'Rechazo Cordial', stage: 'rejected', subject: 'Actualización sobre tu postulación en [Nombre de la Empresa]', body: '<p>Estimado/a [Nombre del Candidato],</p><p>Agradecemos tu interés en formar parte de <strong>[Nombre de la Empresa]</strong>.</p><p>Luego de una cuidadosa evaluación, hemos decidido continuar el proceso con otros candidatos.</p><p>Te deseamos éxito en tu búsqueda.<br>[Nombre del Reclutador]</p>', isDefault: true },
  { id: 'cierre-proceso', name: 'Cierre de Proceso', stage: 'withdrawn', subject: 'Cierre de tu postulación — [Nombre de la Posición]', body: '<p>Estimado/a [Nombre del Candidato],</p><p>Registramos el cierre de tu postulación para el puesto de <strong>[Nombre de la Posición]</strong>.</p><p>Quedamos a tu disposición para futuras oportunidades.<br>[Nombre del Reclutador]<br>[Email del Reclutador]</p>', isDefault: true },
];

// ---------------------------------------------------------------------------
// Pipeline config (subset — solo los stages que disparan email)
// ---------------------------------------------------------------------------

const PIPELINE_ORDER = [
  'profile_pending', 'applied', 'screening', 'cv_submitted',
  'schedule_hr_1', 'hr_1_scheduled', 'hr_1_done',
  'schedule_tech_1', 'tech_1_scheduled', 'tech_1_done',
  'schedule_tech_2', 'tech_2_scheduled', 'tech_2_done',
  'schedule_hr_2', 'hr_2_scheduled', 'hr_2_done',
  'onsite_interview', 'psychotechnical', 'pre_employment',
  'send_offer', 'offer_sent', 'hired',
];

// emailTemplateStage por stage — null = no envía email
const EMAIL_STAGE_MAP = {
  applied: 'application_received',
  schedule_hr_1: 'sch_interview_hr_1',
  hr_1_scheduled: 'interview_hr_1',
  schedule_hr_2: 'sch_interview_hr_2',
  hr_2_scheduled: 'interview_hr_2',
  onsite_interview: 'onsite_interview',
  schedule_tech_1: 'sch_interview_tech_1',
  tech_1_scheduled: 'interview_tech_1',
  schedule_tech_2: 'sch_interview_tech_2',
  tech_2_scheduled: 'interview_tech_2',
  send_offer: 'offer',
  hired: 'hired',
  rejected: 'rejected',
  withdrawn: 'withdrawn',
};

const JOB_TITLES = {
  'frontend-ssr-developer': 'Frontend SSR Developer',
  'backend-firebase-developer': 'Backend Firebase Developer',
  'technical-recruiter': 'Technical Recruiter',
  'qa-automation-analyst': 'QA Automation Analyst',
};

const TEMPLATE_SUBJECTS = {
  application_received: (jobTitle) => `Hemos recibido tu postulación para ${jobTitle}`,
  sch_interview_hr_1: (jobTitle) => `Invitación a agendar entrevista RRHH — ${jobTitle}`,
  interview_hr_1: (jobTitle) => `Confirmación de tu entrevista RRHH — ${jobTitle}`,
  sch_interview_hr_2: (jobTitle) => `Invitación a agendar segunda entrevista RRHH — ${jobTitle}`,
  interview_hr_2: (jobTitle) => `Confirmación de tu segunda entrevista RRHH — ${jobTitle}`,
  sch_interview_tech_1: (jobTitle) => `Invitación a agendar entrevista técnica — ${jobTitle}`,
  interview_tech_1: (jobTitle) => `Confirmación de tu entrevista técnica — ${jobTitle}`,
  sch_interview_tech_2: (jobTitle) => `Invitación a agendar segunda entrevista técnica — ${jobTitle}`,
  interview_tech_2: (jobTitle) => `Confirmación de tu segunda entrevista técnica — ${jobTitle}`,
  onsite_interview: (jobTitle) => `Te esperamos para una entrevista presencial — ${jobTitle}`,
  offer: (jobTitle) => `Oferta laboral — ${jobTitle}`,
  hired: (jobTitle) => `Bienvenido/a al equipo — ${jobTitle}`,
  rejected: () => `Actualización sobre tu postulación en Tema`,
  withdrawn: (jobTitle) => `Confirmación de retiro de postulación — ${jobTitle}`,
};

const JUMP_STAGES = ['rejected', 'withdrawn'];

function getEmailStagesUpTo(targetStage) {
  const linearStages = PIPELINE_ORDER.filter((s) => s !== 'profile_pending');

  if (JUMP_STAGES.includes(targetStage)) {
    return EMAIL_STAGE_MAP[targetStage] ? [targetStage] : [];
  }

  const targetIdx = linearStages.indexOf(targetStage);
  if (targetIdx === -1) return [];

  return linearStages
    .slice(0, targetIdx + 1)
    .filter((s) => EMAIL_STAGE_MAP[s]);
}

function buildApplicationId(candidateId, jobId) {
  return `${candidateId}_${encodeURIComponent(jobId)}`;
}

// ---------------------------------------------------------------------------
// Seed functions
// ---------------------------------------------------------------------------

async function seedJobs() {
  const batch = db.batch();
  for (const job of JOBS) {
    const ref = db.collection('jobs').doc(job.id);
    const existing = await ref.get();
    if (!existing.exists) {
      batch.set(ref, {
        ...job,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  }
  await batch.commit();
}

async function seedCandidates() {
  let candidatesCreated = 0;
  let applicationsCreated = 0;

  for (const candidate of CANDIDATES) {
    const ref = db.collection('candidates').doc(candidate.id);
    const existing = await ref.get();
    if (!existing.exists) {
      await ref.set({
        ...candidate,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      candidatesCreated += 1;
    }
  }

  for (const app of APPLICATIONS) {
    const candidate = CANDIDATE_MAP[app.candidateId];
    const appId = buildApplicationId(app.candidateId, app.jobId);
    const ref = db.collection('applications').doc(appId);
    const existing = await ref.get();
    if (!existing.exists) {
      await ref.set({
        id: appId,
        jobId: app.jobId,
        candidateId: app.candidateId,
        candidateName: candidate?.fullName ?? '',
        candidateEmail: candidate?.email ?? '',
        stage: app.stage,
        status: app.status,
        ...(app.fitScore !== undefined ? { fitScore: app.fitScore } : {}),
        ...(app.notes ? { notes: app.notes } : {}),
        ...(app.rejectionReason ? { rejectionReason: app.rejectionReason } : {}),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        stageUpdatedAt: FieldValue.serverTimestamp(),
      });
      applicationsCreated += 1;
    }
  }

  return { candidatesCreated, applicationsCreated };
}

async function seedEmailTemplates() {
  const snapshot = await db.collection('emailTemplates').get();
  const existingIds = new Set(snapshot.docs.map((d) => d.id));
  const batch = db.batch();
  let created = 0;

  for (const template of EMAIL_TEMPLATES) {
    if (!existingIds.has(template.id)) {
      const ref = db.collection('emailTemplates').doc(template.id);
      batch.set(ref, {
        ...template,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      created += 1;
    }
  }

  await batch.commit();
  return { created, skipped: EMAIL_TEMPLATES.length - created };
}

async function seedEmailLogs(recruiterEmail) {
  const existingSnapshot = await db.collection('emailLogs').limit(1).get();
  if (!existingSnapshot.empty) {
    return { created: 0, skipped: true };
  }

  const applicationsSnapshot = await db.collection('applications').get();
  if (applicationsSnapshot.empty) return { created: 0, skipped: false };

  const batch = db.batch();
  let created = 0;
  let candidateIndex = 0;

  for (const appDoc of applicationsSnapshot.docs) {
    const app = appDoc.data();
    const stagesToLog = getEmailStagesUpTo(app.stage);
    if (stagesToLog.length === 0) { candidateIndex += 1; continue; }

    const candidateName = app.candidateName ?? 'Candidato/a';
    const candidateEmail = app.candidateEmail ?? 'candidato@example.com';
    const jobTitle = JOB_TITLES[app.jobId] ?? app.jobId;

    for (let logIndex = 0; logIndex < stagesToLog.length; logIndex++) {
      const stage = stagesToLog[logIndex];
      const emailStage = EMAIL_STAGE_MAP[stage];
      const subjectFn = TEMPLATE_SUBJECTS[emailStage];
      const subject = subjectFn ? subjectFn(jobTitle) : `Actualización — ${jobTitle}`;

      let status;
      if (candidateIndex === 0) {
        status = 'sent';
      } else if (candidateIndex === 1) {
        status = logIndex === stagesToLog.length - 1 ? 'failed' : 'sent';
      } else {
        const pattern = (candidateIndex + logIndex) % 3;
        status = pattern === 0 ? 'sent' : pattern === 1 ? 'pending' : 'failed';
      }

      const logEntry = {
        applicationId: appDoc.id,
        candidateId: app.candidateId,
        candidateEmail,
        jobId: app.jobId,
        templateId: `confirmacion-recepcion`,
        templateName: emailStage,
        stage,
        subject,
        body: `<p>Estimado/a ${candidateName},</p><p>Actualización sobre tu postulación para <strong>${jobTitle}</strong>.</p><p>Saludos,<br>Recruiter<br>${recruiterEmail}</p>`,
        status,
        recruiterId: 'seed-recruiter',
        recruiterEmail,
        attemptedAt: FieldValue.serverTimestamp(),
        ...(status === 'sent' ? { sentAt: FieldValue.serverTimestamp() } : {}),
        ...(status === 'failed' && candidateIndex === 1 ? { error: 'Credencial de Gmail no configurada.' } : {}),
        ...(status === 'failed' && candidateIndex > 1 ? { error: 'No se pudo refrescar el token de Gmail.' } : {}),
      };

      batch.set(db.collection('emailLogs').doc(), logEntry);
      created += 1;
    }

    candidateIndex += 1;
  }

  await batch.commit();
  return { created, skipped: false };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`\n🌱  Seeding staging (${PROJECT_ID})\n`);

  console.log('1/4  Jobs...');
  await seedJobs();
  console.log(`     ✓ ${JOBS.length} jobs\n`);

  console.log('2/4  Candidatos y aplicaciones...');
  const { candidatesCreated, applicationsCreated } = await seedCandidates();
  console.log(`     ✓ ${candidatesCreated} candidatos, ${applicationsCreated} aplicaciones\n`);

  console.log('3/4  Email templates...');
  const { created: templatesCreated, skipped: templatesSkipped } = await seedEmailTemplates();
  console.log(`     ✓ ${templatesCreated} creados, ${templatesSkipped} ya existían\n`);

  console.log('4/4  Email logs...');
  const { created: logsCreated, skipped: logsSkipped } = await seedEmailLogs('recruiter@staging.dev');
  if (logsSkipped) {
    console.log('     ℹ️  Ya existían logs — omitido\n');
  } else {
    console.log(`     ✓ ${logsCreated} logs\n`);
  }

  console.log('✅  Seed completo.\n');
}

main().catch((err) => {
  console.error('\n❌  Error durante el seed:', err.message);
  process.exit(1);
});
