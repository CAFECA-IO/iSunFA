import { LOG_FOLDER } from '@/constants/file';
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

// Info: (20240823 - Gibbs) 使用 pino-multi-stream 來處理多個輸出
const streams = [
  { level, stream: logStream, sync: false }, // Info: (20240823 - Gibbs) 將日誌輸出到 rotating-file-stream
  { level, stream: prettyStream }, // Info: (20240823 - Murky) 將日誌輸出到 console
];

const logger: Logger = pino({ level }, pino.multistream(streams));

export default logger;
