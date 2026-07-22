/**
 * Génère .env.local à partir des variables déjà présentes dans l'environnement.
 * Usage : node electron/setup-env.js
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const envPath = path.join(rootDir, '.env.local');
const variableNames = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'OPENAI_API_KEY',
  'BREVO_API_KEY',
  'BREVO_SENDER_EMAIL',
  'BREVO_SENDER_NAME',
  'NEXT_PUBLIC_APP_URL',
  'CRON_SECRET',
  'META_APP_ID',
  'META_APP_SECRET',
  'NEXT_PUBLIC_META_APP_ID',
  'LINKEDIN_CLIENT_ID',
  'LINKEDIN_CLIENT_SECRET',
  'NEXT_PUBLIC_LINKEDIN_CLIENT_ID',
  'TIKTOK_CLIENT_KEY',
  'TIKTOK_CLIENT_SECRET',
  'NEXT_PUBLIC_TIKTOK_CLIENT_KEY',
];

const missingVariables = variableNames.filter((name) => !process.env[name]);

if (missingVariables.length > 0) {
  throw new Error(`Variables d'environnement manquantes : ${missingVariables.join(', ')}`);
}

const envContent = `${variableNames
  .map((name) => `${name}=${process.env[name]}`)
  .join('\n')}\n`;

fs.writeFileSync(envPath, envContent, { encoding: 'utf8', mode: 0o600 });
console.log('.env.local créé avec succès dans', envPath);
