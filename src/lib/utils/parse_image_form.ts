import { IncomingForm, Fields, Files, Part } from 'formidable';
import { promises as fs } from 'fs';
import path from 'path';
import { NextApiRequest } from 'next';
import { FORMIDABLE_OPTIONS } from '@/constants/config';
import { FileFolder, getFileFolder } from '@/constants/file';
import loggerBack from '@/lib/utils/logger_back';

export const parseForm = async (
  req: NextApiRequest,
  subDir: FileFolder = FileFolder.TMP, // Info: (20240726 - Jacky) 預設子資料夾名稱為tmp
  subSubDir?: string // Info: (202410008 - Tzuhan) 如果有傳入subSubDir，則使用subSubDir
) => {
  loggerBack.info(`parseForm req.headers:`, req.headers);
  loggerBack.debug(`parseForm called with subDir: ${subDir}, subSubDir: ${subSubDir}`);
  let uploadDir = getFileFolder(subDir);

  loggerBack.debug(`Upload directory: ${uploadDir}`);
  // Info: (202410008 - Tzuhan) 如果有傳入subSubDir，更新 uploadDir
  if (subSubDir) {
    uploadDir = path.join(uploadDir, subSubDir);
    await fs.mkdir(uploadDir, { recursive: true }); // Info: (202410008 - Tzuhan) 確保該目錄存在
  }

  const options = {
    ...FORMIDABLE_OPTIONS,
    uploadDir,
  };

  loggerBack.debug(`Formidable options:`, options);

  const form = new IncomingForm(options);

  form.on('fileBegin', (name, file) => {
    loggerBack.debug(`📝 fileBegin triggered: ${name}, path: ${file.filepath}`);
  });
  form.on('end', () => {
    loggerBack.debug('✅ Formidable end triggered');
  });
  form.on('error', (err) => {
    loggerBack.error(err, '❌ Formidable error');
  });

  form.onPart = function onPart(part: Part) {
    // Info: (20250704 - Luphia) 無法規避的例外函式命名
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore: 使用私有方法處理所有 part
    // eslint-disable-next-line no-underscore-dangle
    form._handlePart(part);
  };

  const parsePromise = new Promise<{ fields: Fields; files: Files<string> }>((resolve, reject) => {
    loggerBack.debug(`📦 Incoming headers:`, req.headers);
    form.parse(req, (err, fields, files) => {
      if (err) {
        reject(err);
      } else {
        resolve({ fields, files });
      }
    });
  });

  return parsePromise;
};

export async function findFileByName(baseFolder: string, fileName: string): Promise<string | null> {
  let foundFile: string | null = null;

  try {
    const files = await fs.readdir(baseFolder);
    foundFile = files.find((file) => file.includes(fileName)) || null;
    if (foundFile) {
      foundFile = path.join(baseFolder, foundFile);
    }
  } catch {
    foundFile = null;
  }

  return foundFile;
}

/**
 * Info: (20240828 - Murky)
 * Read file from the given folder and file name
 * @param baseFolder - the folder path
 * @param fileName - the file name
 * @returns - the file buffer
 */
export async function readFile(baseFolder: string, fileName?: string): Promise<Buffer | null> {
  const filePath = fileName ? path.join(baseFolder, fileName) : baseFolder;
  let fileBuffer: Buffer | null = null;
  try {
    fileBuffer = await fs.readFile(filePath);
  } catch (error) {
    loggerBack.error(error, `Error in readFile: ${filePath}`);
  }
  return fileBuffer;
}

export function bufferToBlob(buffer: Buffer, type?: string): Blob {
  return new Blob([buffer], { type });
}

/**
 * Info: (20240726 - Jacky) 讀取目標資料夾中的某個檔案，並將其加上前綴後改名
 * @param fileName - 要加前綴的檔案名稱
 * @param prefix - 要加的前綴
 * @param ext - 新的副檔名
 */
export async function addPrefixToFile(
  folder: FileFolder,
  fileName: string,
  prefix: string,
  ext: string
): Promise<string> {
  const targetFolder = getFileFolder(folder); // Info: (20240726 - Jacky) 確保是從專案根目錄開始找目標資料夾

  // Info: (20240723 - Jacky) 檔案的完整路徑
  const oldFilePath = path.join(targetFolder, fileName);
  const currentExt = path.extname(fileName).slice(1); // Info: (20240726 - Jacky) 去除開頭的點 (.)

  // Info: (20240726 - Jacky) 根據現有副檔名與新的副檔名來決定是否需要更改
  const newFilename = `${prefix}-${fileName}${currentExt === ext ? '' : `.${ext}`}`;
  const newFilePath = path.join(targetFolder, newFilename);

  // Info: (20240726 - Jacky) 檢查檔案是否存在
  await fs.access(oldFilePath);
  // Info: (20240726 - Jacky) 改名檔案
  await fs.rename(oldFilePath, newFilePath);
  return newFilename;
}
