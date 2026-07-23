const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const outputDir = path.join(root, '.recovery');
const outputPath = path.join(outputDir, 'recovered_data.sql');
const supported = new Set([
  'clients', 'projects', 'tasks', 'invoices', 'payments',
  'expenses', 'trainings', 'publications',
]);

const rows = Object.fromEntries([...supported].map((table) => [table, new Map()]));
function collectLogFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectLogFiles(fullPath);
    return entry.name.endsWith('.log') ? [fullPath] : [];
  });
}

const logFiles = [path.join(root, 'debug.log'), ...collectLogFiles(path.join(root, '.orchids'))]
  .filter((file, index, list) => fs.existsSync(file) && list.indexOf(file) === index);
const lines = logFiles.flatMap((file) => fs.readFileSync(file, 'utf8').split(/\r?\n/));
let currentTable = null;

for (const line of lines) {
  const request = line.match(/\/rest\/v1\/([a-zA-Z0-9_]+)\?/);
  if (request) {
    currentTable = supported.has(request[1]) ? request[1] : null;
    continue;
  }
  if (!currentTable) continue;
  const responseIndex = line.indexOf('response: ');
  if (responseIndex < 0) continue;
  const raw = line.slice(responseIndex + 'response: '.length).trim();
  {
    const list = extractObjects(raw);
    for (const item of list) {
      if (!item || !item.id) continue;
      const existing = rows[currentTable].get(item.id) || {};
      const merged = { ...existing };
      // Merge rather than replace: a later response with a narrower `select`
      // (e.g. missing client_id) must not blank out a field a fuller
      // response already captured for this row.
      for (const [key, value] of Object.entries(item)) {
        if (value !== null && value !== undefined) merged[key] = value;
        else if (!(key in merged)) merged[key] = value;
      }
      rows[currentTable].set(item.id, merged);
    }
  }
}

// The app's own debug logger truncates long lines (ending in
// "... [truncated]"), which can cut a JSON array/object off mid-string. A
// plain JSON.parse on the whole response then throws and the entire array
// is lost — including complete objects that appeared before the cut. Scan
// for individually well-formed top-level objects instead so those survive.
function extractObjects(raw) {
  const body = raw.startsWith('[') ? raw.slice(1) : raw;
  const results = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === '{') { if (depth === 0) start = i; depth++; continue; }
    if (ch === '}') {
      depth--;
      if (depth === 0 && start >= 0) {
        try { results.push(JSON.parse(body.slice(start, i + 1))); } catch {}
        start = -1;
      }
    }
  }
  return results;
}

const columns = {
  clients: ['id','company_name','contact_name','email','phone','address','status','notes','portal_enabled','portal_password','created_at','updated_at'],
  projects: ['id','client_id','title','description','status','start_date','end_date','budget','progress','created_at','updated_at'],
  tasks: ['id','project_id','title','description','priority','status','deadline','parent_task_id','position','progress','created_at','updated_at'],
  invoices: ['id','client_id','project_id','invoice_number','total_amount','paid_amount','status','due_date','notes','is_recurring','recurrence_interval','next_invoice_date','created_at','updated_at'],
  payments: ['id','invoice_id','amount','payment_method','transaction_ref','payment_date','notes','created_at'],
  expenses: ['id','project_id','title','amount','category','expense_date','receipt_url','notes','created_at'],
  trainings: ['id','title','description','price','duration_hours','is_published','cover_url','created_at','updated_at'],
  publications: ['id','client_id','project_id','title','content','platform','content_type','status','scheduled_at','published_at','media_url','notes','created_at','updated_at'],
};

const types = {
  clients: ['uuid','text','text','text','text','text','text','text','boolean','text','timestamptz','timestamptz'],
  projects: ['uuid','uuid','text','text','text','date','date','numeric','integer','timestamptz','timestamptz'],
  tasks: ['uuid','uuid','text','text','text','text','date','uuid','integer','integer','timestamptz','timestamptz'],
  invoices: ['uuid','uuid','uuid','text','numeric','numeric','text','date','text','boolean','text','date','timestamptz','timestamptz'],
  payments: ['uuid','uuid','numeric','text','text','date','text','timestamptz'],
  expenses: ['uuid','uuid','text','numeric','text','date','text','text','timestamptz'],
  trainings: ['uuid','text','text','numeric','integer','boolean','text','timestamptz','timestamptz'],
  publications: ['uuid','uuid','uuid','text','text','text','text','text','timestamptz','timestamptz','text','text','timestamptz','timestamptz'],
};

const ids = Object.fromEntries([...supported].map((table) => [table, new Set(rows[table].keys())]));
const keepReference = (table, value) => value && ids[table].has(value) ? value : null;

for (const item of rows.projects.values()) item.client_id = keepReference('clients', item.client_id);
for (const item of rows.tasks.values()) {
  item.project_id = keepReference('projects', item.project_id);
  item.parent_task_id = keepReference('tasks', item.parent_task_id);
}
for (const item of rows.invoices.values()) {
  item.client_id = keepReference('clients', item.client_id);
  item.project_id = keepReference('projects', item.project_id);
}
for (const item of rows.payments.values()) item.invoice_id = keepReference('invoices', item.invoice_id);
for (const item of rows.expenses.values()) item.project_id = keepReference('projects', item.project_id);
for (const item of rows.publications.values()) {
  item.client_id = keepReference('clients', item.client_id);
  item.project_id = keepReference('projects', item.project_id);
}

const order = ['clients','projects','tasks','invoices','payments','expenses','trainings','publications'];
const blocks = [
  '-- Donnees recuperees depuis les journaux locaux AGENCE APP',
  '-- Relire les nombres affiches par le script avant execution.',
  'begin;',
];

for (const table of order) {
  const data = [...rows[table].values()].map((item) =>
    Object.fromEntries(columns[table].map((column) => [column, item[column] ?? null]))
  );
  if (data.length === 0) continue;
  const recordDefinition = columns[table].map((column, index) => `${column} ${types[table][index]}`).join(', ');
  const updateColumns = columns[table].filter((column) => column !== 'id');
  blocks.push(
    `\n-- ${table}: ${data.length} ligne(s)`,
    `insert into public.${table} (${columns[table].join(', ')})`,
    `select ${columns[table].join(', ')} from jsonb_to_recordset($recovery$${JSON.stringify(data)}$recovery$::jsonb)`,
    `as x(${recordDefinition})`,
    `on conflict (id) do update set ${updateColumns.map((column) => `${column} = excluded.${column}`).join(', ')};`
  );
}

blocks.push('commit;', '');
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputPath, blocks.join('\n'), { encoding: 'utf8', mode: 0o600 });

console.log(JSON.stringify({
  outputPath,
  counts: Object.fromEntries(order.map((table) => [table, rows[table].size])),
}, null, 2));
