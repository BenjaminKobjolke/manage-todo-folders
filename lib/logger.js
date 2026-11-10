// Centralizes background logging behind one switch.
const LOG_ENABLED = true;

export const logger = Object.freeze({
  info(...values) {
    if (LOG_ENABLED) console.info(...values);
  },
  error(...values) {
    if (LOG_ENABLED) console.error(...values);
  },
});
