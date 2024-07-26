import { IncomingForm, Fields, Files } from 'formidable';
import { promises as fs } from 'fs';
import path from 'path';
import { NextApiRequest } from 'next';
import { FORMIDABLE_OPTIONS } from '@/constants/config';
import { BASE_STORAGE_FOLDER, FileFolder, VERCEL_STORAGE_FOLDER } from '@/constants/file';

export const parseForm = async (
  req: NextApiRequest,
  subDir: string = FileFolder.TMP // 預設子資料夾名稱為tmp
) => {
  // const BASE_STORAGE_FOLDER = process.env.BASE_STORAGE_PATH || 'kyc';
  const uploadDir =
    process.env.VERCEL === '1' ? VERCEL_STORAGE_FOLDER : path.join(BASE_STORAGE_FOLDER, subDir);
  const options = {
    ...FORMIDABLE_OPTIONS,
    uploadDir,
  };

  await fs.mkdir(uploadDir, { recursive: true });

  const form = new IncomingForm(options);
  const parsePromise = new Promise<{ fields: Fields; files: Files<string> }>((resolve, reject) => {
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
 * 讀取目標資料夾中的某個檔案，並將其加上前綴後改名
 * @param fileName - 要加前綴的檔案名稱
 * @param prefix - 要加的前綴
 * @param ext - 新的副檔名
 */
export async function addPrefixToFile(
  folder: string,
  fileName: string,
  prefix: string,
  ext: string
): Promise<string> {
  const targetFolder = path.join(BASE_STORAGE_FOLDER, folder); // 確保是從專案根目錄開始找目標資料夾

  // 檔案的完整路徑
  const oldFilePath = path.join(targetFolder, fileName);
  const currentExt = path.extname(fileName).slice(1); // 去除開頭的點 (.)

  // 根據現有副檔名與新的副檔名來決定是否需要更改
  const newFilePath = path.join(
    targetFolder,
    `${prefix}-${fileName}${currentExt === ext ? '' : `.${ext}`}`
  );

  // 檢查檔案是否存在
  await fs.access(oldFilePath);
  // 改名檔案
  await fs.rename(oldFilePath, newFilePath);
  return newFilePath;
}
