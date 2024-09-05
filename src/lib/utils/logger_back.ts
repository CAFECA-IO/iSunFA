import { LOG_FOLDER } from '@/constants/file';
import { Prisma } from '@prisma/client';
import pino, { Logger } from 'pino';
import pretty from 'pino-pretty';
import { createStream } from 'rotating-file-stream';

const level: pino.Level = process.env.NODE_ENV === 'production' ? 'info' : 'trace';

// Info: (20240823 - Gibbs) 設定日誌文件的路徑
let logDirectory = './logs';

// Info: (20240823 - Gibbs) 獲取當前環境
const environment = process.env.NODE_ENV;
// Info: (20240823 - Gibbs) 不同環境不同資料夾
if (environment === 'production') {
  logDirectory = `${LOG_FOLDER}/production`;
} else if (environment === 'development') {
  logDirectory = `${LOG_FOLDER}//development`;
} else if (environment === 'test') {
  logDirectory = `${LOG_FOLDER}/test`;
} else {
  logDirectory = `${LOG_FOLDER}/others`;
}

// Info: (20240823 - Gibbs) 創建一個 rotating-file-stream，每七天創建一個新文件
const logStream = createStream(
  (time) => {
    if (!time) return `app-${environment}.log`; // Info: (20240823 - Gibbs) 初始文件名
    const date = new Date(time);
    return `app-${environment}-${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}.log`;
  },
  {
    interval: '7d', // Info: (20240823 - Gibbs) 每七天創建一個新文件
    path: logDirectory,
  }
);

// Info: (20240828 - Murky) Console log 中會print出pretty的格式
const prettyStream = pretty({
  colorize: true,
});

// Info: (20240828 - Gibbs) 使用 pino-multi-stream 來處理多個輸出
const streams = [
  { level, stream: logStream, sync: false }, // Info: (20240823 - Gibbs) 將日誌輸出到 rotating-file-stream
  { level, stream: prettyStream }, // Info: (20240823 - Murky) 將日誌輸出到 console
];

const loggerBack: Logger = pino({ level }, pino.multistream(streams));

export default loggerBack;

function getErrorCode(
  error: Prisma.PrismaClientKnownRequestError | Prisma.PrismaClientInitializationError
): string | undefined {
  if ('code' in error) {
    return error.code;
  } else if ('errorCode' in error) {
    return error.errorCode;
  }
  return undefined;
}

/** (20240828 - Gibbs) 記錄錯誤和異常的詳細信息
 * @param {number} [userId] - 用戶ID
 * @param {string} errorType - 錯誤類型
 * @param {string | Error} errorMessage - 錯誤訊息
 */
export function loggerError(userId: number, errorType: string, errorMessage: string | Error) {
  const logData = { level: 'error', userId, errorType, errorMessage };
  if (userId) {
    logData.userId = userId;
  }

  if (typeof errorMessage === 'string') {
    // Info: (20240905 - Gibbs) 已知指定錯誤訊息
    logData.errorMessage = errorMessage;
    /* Info: (20240905 - Gibbs) 已知指定錯誤訊息
     * 處理 Prisma 錯誤, PrismaClientUnknownRequestError, PrismaClientRustPanicError, Prisma.PrismaClientValidationError 無 error code
     * PrismaClientKnownRequestError: code, PrismaClientInitializationError: errorCode
     */
  } else if (
    errorMessage instanceof Prisma.PrismaClientKnownRequestError ||
    errorMessage instanceof Prisma.PrismaClientInitializationError
  ) {
    // Info: (20240905 - Gibbs) 轉換特定 Prisma code 錯誤, 其餘 Prisma code 錯誤給預設值
    const errorCode = getErrorCode(errorMessage);
    switch (errorCode) {
      case 'P1008':
        logData.errorMessage = 'Operations timed out!';
        break;
      case 'P1017':
        logData.errorMessage = 'Server has closed the connection!';
        break;
      case 'P2002':
        logData.errorMessage = 'Unique constraint failed!';
        break;
      case 'P2003':
        logData.errorMessage = 'Foreign key constraint failed!';
        break;
      case 'P2004':
        logData.errorMessage = 'A constraint failed on the database!';
        break;
      case 'P2005':
        logData.errorMessage =
          "The value stored in the database for the field is invalid for the field's type!";
        break;
      case 'P2011':
        logData.errorMessage = 'Null constraint violation!';
        break;
      case 'P2021':
        logData.errorMessage = 'The table does not exist in the current database!';
        break;
      case 'P2022':
        logData.errorMessage = 'The column does not exist in the current database!';
        break;
      case 'P2024':
        logData.errorMessage = 'Timed out fetching a new connection from the connection pool!';
        break;
      default:
        logData.errorMessage = `Unhandled Prisma error code: ${errorCode},\n${errorMessage.message}`;
    }
  } else if (
    errorMessage instanceof Prisma.PrismaClientUnknownRequestError ||
    errorMessage instanceof Prisma.PrismaClientRustPanicError ||
    errorMessage instanceof Prisma.PrismaClientValidationError
  ) {
    // Info: (20240905 - Gibbs) 處理其餘 Prisma 錯誤
    logData.errorMessage = `A Prisma error:\n${errorMessage.message}`;
  } else if (errorMessage instanceof Error) {
    // Info: (20240905 - Gibbs) 處理一般錯誤
    logData.errorMessage = `Non Prisma error:\n${errorMessage.message}`;
  }

  return loggerBack.child(logData);
}

/** Info: (20240828 - Gibbs) 記錄請求和響應的詳細信息
 * @param {number} [userId] - 用戶ID
 * @param {string} url - 請求的URL
 * @param {string} method - HTTP方法 (如GET, POST)
 * @param {number} statusCode - 響應的HTTP狀態碼
 * @param {object} params - 請求參數
 * @param {string} userAgent - 用戶代理信息
 * @param {string} ipAddress - 用戶的IP地址
 */
export function loggerRequest(
  userId: number,
  url: string,
  method: string,
  statusCode: number,
  params: object,
  userAgent: string,
  ipAddress: string
) {
  const logData = { level: 'info', userId, url, method, statusCode, params, userAgent, ipAddress };
  if (userId) {
    logData.userId = userId;
  }
  return loggerBack.child(logData);
}

/** Info: (20240828 - Gibbs) 記錄用戶行為
 * @param {number} userId - 用戶ID
 * @param {string} actionType - 操作類型
 * @param {object} actionDetails - 操作詳細信息
 */
export function loggerUserAction(userId: number, actionType: string, actionDetails: object) {
  return loggerBack.child({ level: 'info', userId, actionType, actionDetails });
}

/** Info: (20240828 - Gibbs) 記錄系統事件
 * @param {string} eventType - 事件類型
 * @param {object} details - 事件詳細信息
 */
export function loggerSystemEvent(eventType: string, details: object) {
  return loggerBack.child({ level: 'info', eventType, details });
}

/** Info: (20240828 - Gibbs) 記錄性能數據
 * @param {number} [userId] - 用戶ID
 * @param {number} responseTime - 響應時間
 * @param {object} queryPerformance - 查詢性能
 * @param {number} resourceLoadTime - 資源加載時間
 */
export function loggerPerformance(
  userId: number,
  responseTime: number,
  queryPerformance: object,
  resourceLoadTime: number
) {
  const logData = { level: 'info', userId, responseTime, queryPerformance, resourceLoadTime };
  if (userId) {
    logData.userId = userId;
  }
  return loggerBack.child(logData);
}

/** Info: (20240828 - Gibbs) 記錄安全相關事件
 * @param {number} [userId] - 用戶ID
 * @param {object} authProcess - 認證過程
 * @param {object} securityEvent - 安全事件
 */
export function loggerSecurity(userId: number, authProcess: unknown, securityEvent: unknown) {
  const logData = { level: 'warn', userId, authProcess, securityEvent };
  if (userId) {
    logData.userId = userId;
  }
  return loggerBack.child(logData);
}
