const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const TOKENS_FILE = path.join(DATA_DIR, 'tokens.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readTokens() {
  ensureDataDir();
  if (!fs.existsSync(TOKENS_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function writeTokens(data) {
  ensureDataDir();
  fs.writeFileSync(TOKENS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function getAirtableTokens() {
  return readTokens().airtable || null;
}

function setAirtableTokens(tokens) {
  const data = readTokens();
  data.airtable = tokens;
  writeTokens(data);
}

function getEbayTokens() {
  return readTokens().ebay || null;
}

function setEbayTokens(tokens) {
  const data = readTokens();
  data.ebay = tokens;
  writeTokens(data);
}

module.exports = {
  readTokens,
  writeTokens,
  getAirtableTokens,
  setAirtableTokens,
  getEbayTokens,
  setEbayTokens,
};
