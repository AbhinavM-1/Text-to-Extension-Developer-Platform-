function formatPayload(level, message, meta = {}) {
  return {
    level,
    message,
    service: 'extensio-api',
    timestamp: new Date().toISOString(),
    ...meta,
  };
}

function write(level, message, meta) {
  const payload = formatPayload(level, message, meta);
  const line = JSON.stringify(payload);
  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  info(message, meta) {
    write('info', message, meta);
  },
  warn(message, meta) {
    write('warn', message, meta);
  },
  error(message, meta) {
    write('error', message, meta);
  },
};
