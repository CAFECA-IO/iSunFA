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

// Info: (20240604 - Murky) if process.env is not set, the error will stop all process, error can't be caught
export const googleStorage = new Storage({
  projectId: GOOGLE_PROJECT_ID,
  credentials: GOOGLE_CREDENTIALS,
});

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
  uploadFile: SaveData,
  destFileName: string,
  mimeType: string
): Promise<string> {
  let url = '';
  try {
    const file = googleBucket.file(destFileName);

    await file.save(uploadFile, {
      metadata: {
        contentType: mimeType,
      },
    });

    // 將文件設置為公開
    await file.makePublic();
    url = `${GOOGLE_STORAGE_BUCKET_URL}${destFileName}`;
  } catch (error) {
    // Info: For debugging purpose
    // eslint-disable-next-line no-console
    console.error('Failed to upload SVG to Google Cloud', error);
  }
  return url;
}

export async function uploadFiles(files: File[]) {
  const uploadPromises = files.map(async (file) => {
    const mimeType = file.mimetype ?? 'image/png';
    const destFileName = generateDestinationFileNameInGoogleBucket(file.filepath);

    const uploadFile = await fs.readFile(file.filepath);
    const uploadPromise = uploadFileToGoogleCloud(uploadFile, destFileName, mimeType);
    return uploadPromise;
  });

  // 等待所有文件上傳完成
  const urls = await Promise.all(uploadPromises);
  return urls; // 返回所有文件的URLs
}
