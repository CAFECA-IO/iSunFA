const isDevelopment = process.env.NODE_ENV === 'development';

const loggerFront = {
  log: (...args: unknown[]) => {
    if (isDevelopment) {
      // Info: (20250627 - Anna)
      // eslint-disable-next-line no-console
      console.log(...args);
    }
  },
  warn: (...args: unknown[]) => {
    if (isDevelopment) {
      // Info: (20250627 - Anna)
      // eslint-disable-next-line no-console
      console.warn(...args);
    }
  },
  error: (...args: unknown[]) => {
    if (isDevelopment) {
      // Info: (20250627 - Anna)
      // eslint-disable-next-line no-console
      console.error(...args);
    }
    // Info: (20250627 - Anna): 可以在這裡發送錯誤到錯誤追蹤平台 (Sentry, API...)
  },
};

export default loggerFront;
