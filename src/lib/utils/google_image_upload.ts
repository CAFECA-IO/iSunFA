import {
  GOOGLE_CREDENTIALS,
  GOOGLE_PROJECT_ID,
  GOOGLE_STORAGE_BUCKET_NAME,
  GOOGLE_STORAGE_BUCKET_URL,
  GOOGLE_UPLOAD_FOLDER,
} from '@/constants/google';
import { Storage } from '@google-cloud/storage';
import { SaveData } from 'node_modules/@google-cloud/storage/build/esm/src/file';
import path from 'path';
import fs from 'fs/promises';
import { File } from 'formidable';
import { BASE_STORAGE_FOLDER, VERCEL_STORAGE_FOLDER } from '@/constants/file';

// Info: (20240604 - Murky) if process.env is not set, the error will stop all process, error can't be caught
export const googleStorage = new Storage({
  projectId: GOOGLE_PROJECT_ID,
  credentials: GOOGLE_CREDENTIALS,
});

const savePath =
  process.env.VERCEL === '1' ? VERCEL_STORAGE_FOLDER : path.join(BASE_STORAGE_FOLDER, 'tmp');

function generateRandomUUID() {
  return crypto.randomUUID();
}

export async function generateSavePath(fileExtension: string) {
  const tmpDir = savePath;
  const filename = generateRandomUUID() + '.' + fileExtension;
  const filepath = `${tmpDir}/${filename}`;
  return filepath;
}
/**
 * Generates a destination file path in Google Cloud Storage
 * @param {string} filePath - the path to the file that will be uploaded, it can be "path/to/file.jpg" or "file.jpg"
 * @returns {string} - the destination file path in Google Cloud Storage
 */
export function generateDestinationFileNameInGoogleBucket(filePath: string) {
  const name = path.basename(filePath);
  const storePath = `${GOOGLE_UPLOAD_FOLDER}/${name}`;
  return storePath;
}

// Info: (20240604 - Murky) if process.env is not set, the error will stop all process, error can't be caught
export const googleBucket = googleStorage.bucket(GOOGLE_STORAGE_BUCKET_NAME);

export async function uploadFileToGoogleCloud(
  uploadedFile: SaveData,
  destFileName: string,
  mimeType: string
): Promise<string> {
  let url = '';
  try {
    const file = googleBucket.file(destFileName);

    await file.save(uploadedFile, {
      metadata: {
        contentType: mimeType,
      },
    });

    // Info: (20240712 - Jacky) 將文件設置為公開
    await file.makePublic();
    url = `${GOOGLE_STORAGE_BUCKET_URL}${destFileName}`;
  } catch (error) {
    // Todo: (20240822 - Anna) feat. Murky - 使用 logger
  }
  return url;
}

export async function uploadFile(file: File) {
  const mimeType = file.mimetype ?? 'image/png';
  const ext = file.originalFilename ? path.extname(file.originalFilename).slice(1) : '';
  const googlePath = await generateSavePath(ext);
  const destFileName = generateDestinationFileNameInGoogleBucket(googlePath);

  const uploadedFile = await fs.readFile(file.filepath);
  const url = await uploadFileToGoogleCloud(uploadedFile, destFileName, mimeType);
  return url;
}

export async function uploadFiles(files: File[]) {
  const uploadPromises = files.map(uploadFile);

  // Info: (20240712 - Jacky) 等待所有文件上傳完成
  const urls = await Promise.all(uploadPromises);
  return urls; // Info: (20240712 - Jacky) 回傳所有文件的 URLs
}
