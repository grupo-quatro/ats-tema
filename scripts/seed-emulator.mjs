#!/usr/bin/env node
/**
 * Corre los seeders de jobs y candidatos contra el emulador local.
 * Uso: node scripts/seed-emulator.mjs
 */

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID ?? 'ats-tema-ort';
const REGION = process.env.FUNCTIONS_REGION ?? 'us-central1';
const PORT = process.env.FUNCTIONS_EMULATOR_PORT ?? '5001';

const BASE_URL = `http://127.0.0.1:${PORT}/${PROJECT_ID}/${REGION}`;

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

async function main() {
  console.log(`\n🌱 Seeding emulator (${BASE_URL})\n`);

  console.log('1/2  seedJobs...');
  const jobsResult = await callSeeder('seedJobs');
  console.log(`     ✓ Jobs procesados: ${jobsResult.processed} (creados: ${jobsResult.created}, actualizados: ${jobsResult.updated})`);
  console.log(`     IDs: ${jobsResult.jobIds?.join(', ')}\n`);

  console.log('2/2  seedCandidates...');
  const candidatesResult = await callSeeder('seedCandidates');
  console.log(`     ✓ Candidatos creados: ${candidatesResult.candidatesCreated}, actualizados: ${candidatesResult.candidatesUpdated}`);
  console.log(`     ✓ Postulaciones creadas: ${candidatesResult.applicationsCreated}, omitidas: ${candidatesResult.applicationsFailed}\n`);

  console.log('✅  Seed completo.\n');
}

main().catch((err) => {
  console.error('\n❌  Error durante el seed:', err.message);
  process.exit(1);
});
