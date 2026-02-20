const express = require('express');
const router = express.Router();
const configStore = require('../lib/config-store');
const airtableApi = require('../lib/airtable-api');

router.get('/api/config', (req, res) => {
  res.json(configStore.readConfig());
});

router.post('/api/config', (req, res, next) => {
  try {
    const { baseId, tableId, tableName, fieldMapping } = req.body || {};
    const updated = configStore.writeConfig({
      baseId: baseId || '',
      tableId: tableId || '',
      tableName: tableName || '',
      fieldMapping: fieldMapping || {},
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.get('/api/ebay-fields', (req, res) => {
  res.json(configStore.EBAY_FIELDS);
});

router.get('/api/airtable/bases', async (req, res, next) => {
  try {
    const bases = await airtableApi.getBases();
    res.json(bases);
  } catch (err) {
    if (err.response?.status === 404 || err.message?.includes('not connected')) {
      return res.status(400).json({ error: err.message || 'Airtable not connected or Meta API unavailable' });
    }
    next(err);
  }
});

router.get('/api/airtable/tables/:baseId', async (req, res, next) => {
  try {
    const tables = await airtableApi.getBaseSchema(req.params.baseId);
    res.json(tables.map((t) => ({ id: t.id, name: t.name })));
  } catch (err) {
    if (err.response?.status === 404) {
      return res.json([]);
    }
    next(err);
  }
});

router.get('/api/airtable/fields/:baseId/:tableIdOrName', async (req, res, next) => {
  try {
    const { baseId, tableIdOrName } = req.params;
    const fields = await airtableApi.getTableFields(baseId, decodeURIComponent(tableIdOrName));
    res.json(fields);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
