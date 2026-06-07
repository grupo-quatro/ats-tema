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

const DASHBOARD_USERS = [
  { email: 'admin@tema.dev',     password: 'pass123', displayName: 'Admin Tema',       role: 'admin' },
  { email: 'recruiter@tema.dev', password: 'pass123', displayName: 'Recruiter Tema',   role: 'hr' },
  { email: 'hiring@tema.dev',    password: 'pass123', displayName: 'Hiring Manager',   role: 'hiring_manager' },
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

async function createAuthUser({ email, password, displayName, role }) {
  // Crea o actualiza el usuario en el Auth Emulator via REST
  const signUpUrl = `${AUTH_EMULATOR_URL}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`;

  const signUpRes = await fetch(signUpUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, displayName, returnSecureToken: false }),
  });

  if (!signUpRes.ok && signUpRes.status !== 400) {
    throw new Error(`Error creando ${email}: ${signUpRes.status}`);
  }

  const signUpBody = await signUpRes.json();

  // Si ya existe (EMAIL_EXISTS), buscar via endpoint admin del emulator
  let localId = signUpBody.localId;
  if (!localId) {
    const listUrl = `${AUTH_EMULATOR_URL}/emulator/v1/projects/${PROJECT_ID}/accounts`;
    const listRes = await fetch(listUrl);
    const listBody = await listRes.json();
    localId = listBody.userInfo?.find(u => u.email === email)?.localId;
  }

  if (!localId) throw new Error(`No se pudo obtener localId para ${email}`);

  // Asignar custom claims via emulador Admin REST
  const claimsUrl = `${AUTH_EMULATOR_URL}/emulator/v1/projects/${PROJECT_ID}/accounts/${localId}`;
  await fetch(claimsUrl, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customAttributes: JSON.stringify({ role }) }),
  });

  return localId;
}

async function main() {
  console.log(`\n🌱 Seeding emulator (${BASE_URL})\n`);

  console.log('0/5  Usuarios de dashboard...');
  for (const user of DASHBOARD_USERS) {
    const uid = await createAuthUser(user);
    console.log(`     ✓ ${user.email} (${user.role}) — uid: ${uid}`);
  }
  console.log();

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
