const axios = require('axios');
const airtableOAuth = require('./airtable-oauth');

const AIRTABLE_API_BASE = 'https://api.airtable.com/v0';

async function getAuthHeaders() {
  const token = await airtableOAuth.getValidAccessToken();
  if (!token) throw new Error('Airtable not connected');
  return { Authorization: `Bearer ${token}` };
}

async function getBases() {
  const headers = await getAuthHeaders();
  try {
    const { data } = await axios.get(`${AIRTABLE_API_BASE}/meta/bases`, { headers });
    return data.bases || [];
  } catch (err) {
    if (err.response?.status === 403 || err.response?.status === 404) {
      return [];
    }
    throw err;
  }
}

async function getBaseSchema(baseId) {
  const headers = await getAuthHeaders();
  try {
    const { data } = await axios.get(`${AIRTABLE_API_BASE}/meta/bases/${baseId}/tables`, { headers });
    return data.tables || [];
  } catch (err) {
    if (err.response?.status === 403 || err.response?.status === 404) {
      return [];
    }
    throw err;
  }
}

async function getTableFieldsFromRecords(baseId, tableIdOrName) {
  const headers = await getAuthHeaders();
  const url = `${AIRTABLE_API_BASE}/${baseId}/${encodeURIComponent(tableIdOrName)}?maxRecords=1`;
  const { data } = await axios.get(url, { headers });
  if (!data.records || data.records.length === 0) {
    return [];
  }
  return Object.keys(data.records[0].fields || {});
}

async function getTableFields(baseId, tableIdOrName) {
  try {
    const tables = await getBaseSchema(baseId);
    const table = tables.find((t) => t.id === tableIdOrName || t.name === tableIdOrName);
    if (table && table.fields) {
      return table.fields.map((f) => ({ id: f.id, name: f.name, type: f.type }));
    }
  } catch (_) {
    // Meta API may not be available; fall back to inferring from records
  }
  const fieldNames = await getTableFieldsFromRecords(baseId, tableIdOrName);
  return fieldNames.map((name) => ({ id: name, name, type: 'unknown' }));
}

async function getRecords(baseId, tableIdOrName, options = {}) {
  const headers = await getAuthHeaders();
  const params = new URLSearchParams();
  if (options.filterByFormula) params.set('filterByFormula', options.filterByFormula);
  if (options.maxRecords) params.set('maxRecords', String(options.maxRecords));
  if (options.pageSize) params.set('pageSize', String(options.pageSize));
  const url = `${AIRTABLE_API_BASE}/${baseId}/${encodeURIComponent(tableIdOrName)}?${params}`;
  const { data } = await axios.get(url, { headers });
  return data;
}

module.exports = {
  getAuthHeaders,
  getBases,
  getBaseSchema,
  getTableFields,
  getTableFieldsFromRecords,
  getRecords,
};
