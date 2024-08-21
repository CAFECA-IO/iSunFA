import pino, { LoggerOptions, Logger } from 'pino';
import { createStream } from 'rotating-file-stream';

const level: pino.Level = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

// 設定日誌文件的路徑
const logDirectory = './logs';

// 創建一個 rotating-file-stream，每七天創建一個新文件
const logStream = createStream((time) => {
  if (!time) return 'app.log'; // 初始文件名
  const date = new Date(time);
  return `app-${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}.log`;
}, {
  interval: '7d', // 每七天創建一個新文件
  path: logDirectory,
});

// 使用 pino-multi-stream 來處理多個輸出
const streams = [
  { stream: logStream }, // 將日誌輸出到 rotating-file-stream
];

const logger: Logger = pino(
  { level } as LoggerOptions,
  pino.multistream(streams)
);

export default logger;
