require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const oauthRoutes = require('./routes/oauth');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/oauth', oauthRoutes);

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
  const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
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

  <p><a href="/api/status">View connection status (JSON)</a></p>
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
