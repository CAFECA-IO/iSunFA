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
  const files = await fs.readdir(baseFolder);
  const foundFile = files.find((file) => path.basename(file, path.extname(file)) === fileName);
  return foundFile ? path.join(baseFolder, foundFile) : null;
}
