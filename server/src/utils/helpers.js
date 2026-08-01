const { nanoid } = require('nanoid');

function generateId() {
  return nanoid();
}

function now() {
  return Date.now();
}

function parseJsonField(value, defaultValue = null) {
  if (!value) return defaultValue;
  try {
    return JSON.parse(value);
  } catch {
    return defaultValue;
  }
}

function getLocalIp() {
  const os = require('os');
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

module.exports = { generateId, now, parseJsonField, getLocalIp };
