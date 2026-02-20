const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readConfig() {
  ensureDataDir();
  if (!fs.existsSync(CONFIG_FILE)) {
    return { baseId: '', tableName: '', tableId: '', fieldMapping: {} };
  }
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } catch {
    return { baseId: '', tableName: '', tableId: '', fieldMapping: {} };
  }
}

function writeConfig(config) {
  ensureDataDir();
  const data = {
    baseId: config.baseId || '',
    tableId: config.tableId || '',
    tableName: config.tableName || '',
    fieldMapping: config.fieldMapping || {},
  };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2), 'utf8');
  return data;
}

const EBAY_FIELDS = [
  { id: 'title', label: 'Title', required: true },
  { id: 'description', label: 'Description', required: true },
  { id: 'price', label: 'Price', required: true },
  { id: 'quantity', label: 'Quantity', required: true },
  { id: 'category', label: 'Category (eBay category ID)', required: false },
  { id: 'images', label: 'Images (attachment field)', required: false },
];

module.exports = {
  readConfig,
  writeConfig,
  EBAY_FIELDS,
};
