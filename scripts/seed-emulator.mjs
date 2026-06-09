#!/usr/bin/env node
/**
 * Corre los seeders de jobs, candidatos y usuarios de dashboard contra el emulador local.
 * Uso: node scripts/seed-emulator.mjs
 */

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID ?? 'ats-tema-ort';
const REGION = process.env.FUNCTIONS_REGION ?? 'us-central1';
const PORT = process.env.FUNCTIONS_EMULATOR_PORT ?? '5001';

const BASE_URL = `http://127.0.0.1:${PORT}/${PROJECT_ID}/${REGION}`;
const AUTH_EMULATOR_URL = `http://127.0.0.1:9099`;

const CALENDAR_LINK = 'https://calendar.app.google/rvMLFNkM2WwBZLaU7';

const DASHBOARD_USERS = [
  { email: 'admin@tema.dev',      password: 'pass123', displayName: 'Admin Tema',     role: 'admin',       devUid: 'admin-dev' },
  { email: 'recruiter@tema.dev',  password: 'pass123', displayName: 'Recruiter Tema', role: 'hr',          devUid: 'recruiter-dev', calendarLink: CALENDAR_LINK },
  { email: 'arealeader@tema.dev', password: 'pass123', displayName: 'Área Líder',     role: 'area_leader', devUid: 'area-leader-dev' },
];

async function callSeeder(functionName) {
  const url = `${BASE_URL}/${functionName}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: {} }),
  });

  const body = await res.json();

  if (!res.ok) {
    throw new Error(
      `${functionName} falló con status ${res.status}: ${JSON.stringify(body)}`,
    );
  }

  return body.result ?? body;
}

async function createAuthUser({ email, password, displayName, role, devUid }) {
  // Usa el endpoint admin del emulador para crear el usuario con UID fijo.
  // "Authorization: Bearer owner" omite la verificación de auth en el emulador.
  const adminUrl = `${AUTH_EMULATOR_URL}/identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts`;

  const createRes = await fetch(adminUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer owner',
    },
    body: JSON.stringify({ localId: devUid, email, password, displayName }),
  });

  if (!createRes.ok) {
    const body = await createRes.json();
    const msg = body?.error?.message ?? '';
    // Si ya existe con ese UID o ese email, lo ignoramos y seguimos
    if (!msg.includes('DUPLICATE_LOCAL_ID') && !msg.includes('EMAIL_EXISTS')) {
      throw new Error(`Error creando ${email}: ${msg}`);
    }
  }

  // Asignar custom claims via emulador Admin REST
  const claimsUrl = `${AUTH_EMULATOR_URL}/emulator/v1/projects/${PROJECT_ID}/accounts/${devUid}`;
  await fetch(claimsUrl, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customAttributes: JSON.stringify({ role }) }),
  });
}

async function seedEmployees(employees) {
  const url = `${BASE_URL}/seedEmployees`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: { employees } }),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(`seedEmployees falló: ${JSON.stringify(body)}`);
  }
  return body.result ?? body;
}

async function main() {
  console.log(`\n🌱 Seeding emulator (${BASE_URL})\n`);

  console.log('0/5  Usuarios de dashboard...');
  for (const user of DASHBOARD_USERS) {
    await createAuthUser(user);
    console.log(`     ✓ auth: ${user.email} (${user.role}) — uid: ${user.devUid}`);
  }
  const employeesResult = await seedEmployees(
    DASHBOARD_USERS.map(u => ({
      uid: u.devUid,
      email: u.email,
      name: u.displayName,
      role: u.role,
      ...(u.calendarLink ? { calendarLink: u.calendarLink } : {}),
    }))
  );
  console.log(`     ✓ employees en Firestore: ${employeesResult.processed}\n`);

  console.log('1/5  seedJobs...');
  const jobsResult = await callSeeder('seedJobs');
  console.log(`     ✓ Jobs procesados: ${jobsResult.processed} (creados: ${jobsResult.created}, actualizados: ${jobsResult.updated})`);
  console.log(`     IDs: ${jobsResult.jobIds?.join(', ')}\n`);

  console.log('2/5  seedCandidates...');
  const candidatesResult = await callSeeder('seedCandidates');
  console.log(`     ✓ Candidatos creados: ${candidatesResult.candidatesCreated}, actualizados: ${candidatesResult.candidatesUpdated}`);
  console.log(`     ✓ Postulaciones creadas: ${candidatesResult.applicationsCreated}, omitidas: ${candidatesResult.applicationsFailed}\n`);

  console.log('3/5  seedEmailTemplates...');
  const templatesResult = await callSeeder('seedEmailTemplates');
  console.log(`     ✓ Templates procesados: ${templatesResult.processed} (creados: ${templatesResult.created}, omitidos: ${templatesResult.skipped})\n`);

  console.log('4/5  seedEmailLogs...');
  const emailLogsResult = await callSeeder('seedEmailLogs');
  console.log(`     ✓ EmailLogs procesados: ${emailLogsResult.processed} (creados: ${emailLogsResult.created}, omitidos: ${emailLogsResult.skipped})\n`);

  console.log('5/5  ✅  Seed completo.\n');
}

main().catch((err) => {
  console.error('\n❌  Error durante el seed:', err.message);
  process.exit(1);
});
