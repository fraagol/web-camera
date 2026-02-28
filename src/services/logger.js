/**
 * Simple logger utility that adds timestamps to console output
 */

function getTimestamp() {
  const now = new Date();
  return now.toISOString().replace('T', ' ').substring(0, 19);
}

function log(...args) {
  console.log(`[${getTimestamp()}]`, ...args);
}

function error(...args) {
  console.error(`[${getTimestamp()}]`, ...args);
}

function warn(...args) {
  console.warn(`[${getTimestamp()}]`, ...args);
}

module.exports = {
  log,
  error,
  warn
};
