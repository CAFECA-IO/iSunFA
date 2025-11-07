import fs from 'fs';
import path from 'path';

// Info: (20251107 - Tzuhan) 定義日誌文件路徑
const logDir = path.resolve(process.cwd(), 'private/logs');
const logFile = path.join(logDir, 'extend-daily-trials.log');

/**
 * Info: (20251107 - Tzuhan) 確保日誌文件存在
 */
const ensureLogFileExists = () => {
  try {
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  } catch (err) {
    // Info: (20251107 - Tzuhan) debug
    // eslint-disable-next-line no-console
    console.error('Could not create log directory:', err);
  }
};

/**
 * Info: (20251107 - Tzuhan) 將日誌寫入文件
 * * @param level
 * @param message
 */
const logToFile = (level: string, message: string) => {
  ensureLogFileExists();
  const timestamp = new Date().toISOString();
  // Info: (20251107 - Tzuhan) 構建日誌消息
  const logMessage = `${timestamp} [${level.toUpperCase()}]: ${message}\n`;

  try {
    // Info: (20251107 - Tzuhan) 同時在控制台輸出日誌
    // eslint-disable-next-line no-console
    console.log(logMessage.trim());
    fs.appendFileSync(logFile, logMessage, { encoding: 'utf8' });
  } catch (err) {
    // Info: (20251107 - Tzuhan) 失敗時在控制台輸出錯誤
    // eslint-disable-next-line no-console
    console.error('Failed to write to log file:', err);
  }
};

/**
 * Info: (20251107 - Tzuhan) 腳本日誌工具
 * */
export const scriptLogger = {
  info: (message: string) => {
    logToFile('info', message);
  },
  error: (message: string, error?: Error) => {
    let fullMessage = message;
    if (error) {
      // Info: (20251107 - Tzuhan) 附加錯誤堆棧或消息
      const errMessage = error.stack || error.message || String(error);
      fullMessage += `\n${errMessage}`;
    }
    logToFile('error', fullMessage);
  },
};

export default scriptLogger;
