require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const oauthRoutes = require('./routes/oauth');
const configRoutes = require('./routes/config');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/oauth', oauthRoutes);
app.use(configRoutes);

app.get('/api/status', async (req, res, next) => {
  try {
    const airtable = require('./lib/airtable-oauth');
    const ebay = require('./lib/ebay-oauth');
    const [airtableOk, ebayOk] = await Promise.all([
      airtable.getValidAccessToken().then(Boolean),
      ebay.getValidAccessToken().then(Boolean),
    ]);
    res.json({ airtable: airtableOk, ebay: ebayOk });
  } catch (err) {
    next(err);
  }
});

app.get('/', (req, res) => {
  const envBase = process.env.BASE_URL;
  const baseUrl = (envBase && !envBase.includes('localhost'))
    ? envBase
    : `${req.protocol}://${req.get('host')}`;
  const airtableError = req.query.airtable_error;
  const ebayError = req.query.ebay_error;
  const airtableOk = req.query.airtable === 'ok';
  const ebayOk = req.query.ebay === 'ok';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Airtable ↔ eBay Connector</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 560px; margin: 2rem auto; padding: 0 1rem; }
    h1 { font-size: 1.25rem; }
    .card { border: 1px solid #ddd; border-radius: 8px; padding: 1rem; margin: 1rem 0; }
    .ok { color: green; }
    .err { color: #c00; }
    a { color: #0066cc; }
    .btn { display: inline-block; padding: 0.5rem 1rem; background: #0066cc; color: white; text-decoration: none; border-radius: 6px; margin-right: 0.5rem; margin-top: 0.5rem; }
    .btn:hover { background: #0052a3; }
  </style>
</head>
<body>
  <h1>Airtable ↔ eBay Connector</h1>
  <p>Connect your accounts to continue. After connecting, you can set up field mapping and sync listings.</p>

  <div class="card">
    <strong>Airtable</strong>
    ${airtableOk ? '<p class="ok">Connected.</p>' : ''}
    ${airtableError ? `<p class="err">Error: ${decodeURIComponent(airtableError)}</p>` : ''}
    <a class="btn" href="${baseUrl}/oauth/airtable">Connect Airtable</a>
  </div>

  <div class="card">
    <strong>eBay</strong>
    ${ebayOk ? '<p class="ok">Connected.</p>' : ''}
    ${ebayError ? `<p class="err">Error: ${decodeURIComponent(ebayError)}</p>` : ''}
    <a class="btn" href="${baseUrl}/oauth/ebay">Connect eBay</a>
  </div>

  <p><a href="${baseUrl}/config">Field mapping &amp; config</a> &middot; <a href="/api/status">View connection status (JSON)</a></p>
</body>
</html>
  `.trim();

  res.send(html);
});

app.get('/config', (req, res) => {
  const envBase = process.env.BASE_URL;
  const baseUrl = (envBase && !envBase.includes('localhost'))
    ? envBase
    : `${req.protocol}://${req.get('host')}`;
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Config &amp; field mapping</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 640px; margin: 2rem auto; padding: 0 1rem; }
    h1 { font-size: 1.25rem; }
    .card { border: 1px solid #ddd; border-radius: 8px; padding: 1rem; margin: 1rem 0; }
    label { display: block; margin-top: 0.75rem; font-weight: 500; }
    input, select { width: 100%; max-width: 320px; padding: 0.4rem 0.5rem; margin-top: 0.25rem; }
    table { width: 100%; border-collapse: collapse; margin-top: 0.5rem; }
    th, td { text-align: left; padding: 0.4rem 0.5rem; border-bottom: 1px solid #eee; }
    .btn { display: inline-block; padding: 0.5rem 1rem; background: #0066cc; color: white; border: none; border-radius: 6px; cursor: pointer; margin-top: 0.5rem; }
    .btn:hover { background: #0052a3; }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .msg { margin-top: 0.5rem; color: green; }
    .err { color: #c00; }
    a { color: #0066cc; }
  </style>
</head>
<body>
  <h1>Config &amp; field mapping</h1>
  <p><a href="${baseUrl}/">&larr; Back to connector</a></p>

  <div class="card">
    <h2 style="margin-top:0">Airtable source</h2>
    <label>Base ID <small>(e.g. appXXXXXXXXXXXXXX)</small></label>
    <input type="text" id="baseId" placeholder="appXXXXXXXXXXXXXX">
    <label>Table name or ID</label>
    <input type="text" id="tableName" placeholder="Listings">
    <p><button type="button" class="btn" id="loadFields">Load Airtable fields</button></p>
    <p id="fieldsMsg" class="msg"></p>
  </div>

  <div class="card">
    <h2 style="margin-top:0">Map Airtable fields to eBay</h2>
    <p>Choose which Airtable column provides data for each eBay field.</p>
    <table>
      <thead><tr><th>eBay field</th><th>Airtable column</th></tr></thead>
      <tbody id="mappingBody"></tbody>
    </table>
    <p><button type="button" class="btn" id="saveConfig">Save mapping</button></p>
    <p id="saveMsg" class="msg"></p>
  </div>

  <script>
    const baseIdEl = document.getElementById('baseId');
    const tableNameEl = document.getElementById('tableName');
    const loadFieldsBtn = document.getElementById('loadFields');
    const fieldsMsg = document.getElementById('fieldsMsg');
    const mappingBody = document.getElementById('mappingBody');
    const saveBtn = document.getElementById('saveConfig');
    const saveMsg = document.getElementById('saveMsg');

    let airtableFields = [];

    async function loadConfig() {
      const r = await fetch('/api/config');
      const c = await r.json();
      baseIdEl.value = c.baseId || '';
      tableNameEl.value = c.tableName || '';
      if (c.fieldMapping) {
        config.fieldMapping = c.fieldMapping;
        renderMappingRows();
      }
    }

    const config = { baseId: '', tableName: '', tableId: '', fieldMapping: {} };

    async function loadEbayFields() {
      const r = await fetch('/api/ebay-fields');
      return r.json();
    }

    function renderMappingRows() {
      const ebayFields = [
        { id: 'title', label: 'Title', required: true },
        { id: 'description', label: 'Description', required: true },
        { id: 'price', label: 'Price', required: true },
        { id: 'quantity', label: 'Quantity', required: true },
        { id: 'category', label: 'Category (eBay category ID)', required: false },
        { id: 'images', label: 'Images (attachment field)', required: false }
      ];
      mappingBody.innerHTML = ebayFields.map(ef => {
        const val = config.fieldMapping[ef.id] || '';
        const opts = airtableFields.length
          ? '<option value="">—</option>' + airtableFields.map(f => {
              const name = f.name || f.id;
              return '<option value="' + (f.id || name) + '"' + (val === (f.id || name) ? ' selected' : '') + '>' + name + '</option>';
            }).join('')
          : '<option value="">Load Airtable fields first</option>';
        return '<tr><td>' + ef.label + (ef.required ? ' *' : '') + '</td><td><select data-ebay="' + ef.id + '">' + opts + '</select></td></tr>';
      }).join('');
      mappingBody.querySelectorAll('select').forEach(s => {
        s.addEventListener('change', () => { config.fieldMapping[s.dataset.ebay] = s.value || undefined; });
      });
    }

    loadFieldsBtn.addEventListener('click', async () => {
      const baseId = baseIdEl.value.trim();
      const tableName = tableNameEl.value.trim();
      fieldsMsg.textContent = '';
      if (!baseId || !tableName) {
        fieldsMsg.textContent = 'Enter Base ID and Table name first.';
        fieldsMsg.className = 'err';
        return;
      }
      loadFieldsBtn.disabled = true;
      try {
        const r = await fetch('/api/airtable/fields/' + encodeURIComponent(baseId) + '/' + encodeURIComponent(tableName));
        if (!r.ok) throw new Error(await r.text());
        airtableFields = await r.json();
        config.baseId = baseId;
        config.tableName = tableName;
        config.tableId = tableName;
        fieldsMsg.textContent = 'Loaded ' + airtableFields.length + ' field(s).';
        fieldsMsg.className = 'msg';
        renderMappingRows();
      } catch (e) {
        fieldsMsg.textContent = 'Error: ' + (e.message || e);
        fieldsMsg.className = 'err';
      }
      loadFieldsBtn.disabled = false;
    });

    saveBtn.addEventListener('click', async () => {
      mappingBody.querySelectorAll('select').forEach(s => { config.fieldMapping[s.dataset.ebay] = s.value || undefined; });
      saveMsg.textContent = '';
      try {
        const r = await fetch('/api/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config)
        });
        if (!r.ok) throw new Error(await r.text());
        saveMsg.textContent = 'Saved.';
        saveMsg.className = 'msg';
      } catch (e) {
        saveMsg.textContent = 'Error: ' + (e.message || e);
        saveMsg.className = 'err';
      }
    });

    loadConfig().then(() => renderMappingRows());
  </script>
</body>
</html>
  `.trim();

  res.send(html);
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Connector running at http://localhost:${PORT}`);
});
