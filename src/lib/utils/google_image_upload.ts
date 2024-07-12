import {
  GOOGLE_CREDENTIALS,
  GOOGLE_PROJECT_ID,
  GOOGLE_STORAGE_BUCKET_NAME,
  GOOGLE_STORAGE_BUCKET_URL,
  GOOGLE_UPLOAD_FOLDER,
} from '@/constants/google';
import { Storage } from '@google-cloud/storage';
import path from 'path';

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

export async function uploadSvgToGoogleCloud(
  iconSvg: string,
  destFileName: string
): Promise<string> {
  let url = '';
  try {
    const file = googleBucket.file(destFileName);

    await file.save(iconSvg, {
      metadata: {
        contentType: 'image/svg+xml',
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
