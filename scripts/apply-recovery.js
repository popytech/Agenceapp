// One-off: apply .recovery/recovered_data.sql via the Supabase REST API
// (service_role key) instead of raw SQL, since no direct Postgres
// connection string is available in this environment.
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

for (const line of fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const sqlPath = path.join(__dirname, '..', '.recovery', 'recovered_data.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

const blockRe = /-- (\w+): \d+ ligne\(s\)\ninsert into public\.\w+ \([^)]*\)\nselect [^\n]* from jsonb_to_recordset\(\$recovery\$([\s\S]*?)\$recovery\$::jsonb\)/g;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Order matters: tasks.project_id references projects, so projects must
// land before tasks.
const ORDER = ['clients', 'projects', 'tasks', 'invoices', 'expenses', 'trainings', 'publications'];

// The debug log also captured the app's own initial demo/seed data (a single
// batch insert, same-second timestamps, formulaic ids: a1000000.../b1000000...
// /c1000000.../d1000000.../e1000000...). These aren't real records — confirmed
// with the user — so they're deleted from Supabase and excluded here.
const SEED_IDS = new Set([
  // clients: TechVision SARL, AfriMedia Group, StartupHub CI, GreenFarm Bio, LuxeMode Boutique
  'a1000000-0000-0000-0000-000000000001',
  'a2000000-0000-0000-0000-000000000002',
  'a3000000-0000-0000-0000-000000000003',
  'a4000000-0000-0000-0000-000000000004',
  'a5000000-0000-0000-0000-000000000005',
  // projects
  'b1000000-0000-0000-0000-000000000001',
  'b1000000-0000-0000-0000-000000000002',
  'b1000000-0000-0000-0000-000000000005',
  'b2000000-0000-0000-0000-000000000002',
  'b3000000-0000-0000-0000-000000000003',
  'b4000000-0000-0000-0000-000000000004',
  'b5000000-0000-0000-0000-000000000005',
  // tasks
  'c1000000-0000-0000-0000-000000000001',
  'c1000000-0000-0000-0000-000000000002',
  'c1000000-0000-0000-0000-000000000003',
  'c1000000-0000-0000-0000-000000000004',
  'c1000000-0000-0000-0000-000000000005',
  // invoices
  'd1000000-0000-0000-0000-000000000001',
  'd1000000-0000-0000-0000-000000000002',
  'd1000000-0000-0000-0000-000000000003',
  'd1000000-0000-0000-0000-000000000004',
  'd1000000-0000-0000-0000-000000000005',
  // trainings
  'e1000000-0000-0000-0000-000000000001',
  'e1000000-0000-0000-0000-000000000002',
  'e1000000-0000-0000-0000-000000000003',
  'e1000000-0000-0000-0000-000000000004',
]);
const FK_FIELDS = ['client_id', 'project_id', 'parent_task_id', 'invoice_id'];

// PostgREST batches upsert() into one INSERT covering the union of keys
// across all rows: a column missing on SOME rows but present on others gets
// an explicit NULL for the rows lacking it, rather than falling back to the
// column's table default. So table defaults (per supabase/rebuild_core.sql)
// have to be applied here instead of just stripping nulls.
const DEFAULTS = {
  clients: { status: 'prospect', portal_enabled: false },
  projects: { status: 'en_attente', progress: 0, budget: 0 },
  tasks: { priority: 'moyenne', status: 'a_faire', position: 0, progress: 0 },
  invoices: { status: 'impayee', is_recurring: false, total_amount: 0, paid_amount: 0 },
  expenses: { amount: 0 },
  trainings: { is_published: false, price: 0 },
  publications: { status: 'brouillon' },
};
const TIMESTAMP_FIELDS = ['created_at', 'updated_at'];

function cleanRow(table, row) {
  const cleaned = { ...row };
  const defaults = DEFAULTS[table] || {};
  for (const [key, value] of Object.entries(defaults)) {
    if (cleaned[key] === null || cleaned[key] === undefined) cleaned[key] = value;
  }
  for (const field of TIMESTAMP_FIELDS) {
    if (field in cleaned && cleaned[field] === null) cleaned[field] = new Date().toISOString();
  }
  if (table === 'expenses' && !cleaned.title) {
    cleaned.title = 'Dépense (titre non capturé - récupération journal)';
  }
  for (const field of FK_FIELDS) {
    if (field in cleaned && SEED_IDS.has(cleaned[field])) cleaned[field] = null;
  }
  return cleaned;
}

async function main() {
  let match;
  const blocks = {};
  while ((match = blockRe.exec(sql)) !== null) {
    const [, table, jsonBlob] = match;
    blocks[table] = JSON.parse(jsonBlob)
      .filter((row) => !SEED_IDS.has(row.id))
      .map((row) => cleanRow(table, row));
  }

  const results = {};

  // Demo/seed rows for clients, projects, and trainings were already
  // inserted by an earlier run before the seed data was identified — remove
  // them now that they're confirmed to not be real data.
  for (const table of ['clients', 'projects', 'trainings']) {
    const ids = [...SEED_IDS].filter((id) => id[0] === { clients: 'a', projects: 'b', trainings: 'e' }[table]);
    if (!ids.length) continue;
    const { error } = await supabase.from(table).delete().in('id', ids);
    results[`${table}_seed_cleanup`] = error ? `ERROR: ${error.message}` : `deleted ${ids.length} seed rows`;
  }

  for (const table of ORDER) {
    if (!blocks[table] || blocks[table].length === 0) continue;
    const { error } = await supabase
      .from(table)
      .upsert(blocks[table], { onConflict: 'id' });
    results[table] = error ? `ERROR: ${error.message}` : `ok (${blocks[table].length} envoyées)`;
  }
  console.log(JSON.stringify(results, null, 2));
}

main();
