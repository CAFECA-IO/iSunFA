const isDevelopment = process.env.NODE_ENV === 'development';

const loggerFront = {
  log: (...args: unknown[]) => {
    if (isDevelopment) {
      // Info: (20250627 - Anna) Debug
      // eslint-disable-next-line no-console
      console.log(...args);
    }
  },
  warn: (...args: unknown[]) => {
    if (isDevelopment) {
      // Info: (20250627 - Anna) Debug
      // eslint-disable-next-line no-console
      console.warn(...args);
    }
  },
  error: (...args: unknown[]) => {
    if (isDevelopment) {
      // Info: (20250627 - Anna) Debug
      // eslint-disable-next-line no-console
      console.error(...args);
    }
    // Info: (20250627 - Anna) 此處可整合錯誤追蹤平台，例如 Sentry 或自建 API
  },
};

export default loggerFront;
