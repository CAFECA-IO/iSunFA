import pino, { Logger } from 'pino';
import { createStream } from 'rotating-file-stream';

const level: pino.Level = process.env.NODE_ENV === 'production' ? 'info' : 'trace';
// eslint-disable-next-line no-console
console.log('level:', level);

// 設定日誌文件的路徑
let logDirectory = './logs';

// 獲取當前環境
const environment = process.env.NODE_ENV;
// eslint-disable-next-line no-console
console.log('environment:', environment);
// 不同環境不同資料夾
if (environment === 'production') {
  logDirectory = './logs/production';
} else if (environment === 'development') {
  logDirectory = './logs/development';
}

// 創建一個 rotating-file-stream，每七天創建一個新文件
const logStream = createStream(
  (time) => {
    if (!time) return `app-${environment}.log`; // 初始文件名
    const date = new Date(time);
    return `app-${environment}-${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}.log`;
  },
  {
    interval: '7d', // 每七天創建一個新文件
    path: logDirectory,
  }
);

// 使用 pino-multi-stream 來處理多個輸出
const streams = [
  { stream: logStream }, // 將日誌輸出到 rotating-file-stream
];

const logger: Logger = pino({ level }, pino.multistream(streams));

export default logger;
