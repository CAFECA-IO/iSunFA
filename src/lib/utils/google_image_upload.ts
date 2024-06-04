import { GOOGLE_CREDENTIALS, GOOGLE_PROJECT_ID, GOOGLE_STORAGE_BUCKET_NAME, GOOGLE_STORAGE_BUCKET_URL, GOOGLE_UPLOAD_FOLDER } from "@/constants/google";
import { Storage } from "@google-cloud/storage";
import path from "path";

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
/**
 * Uploads a file to Google Cloud Storage, this is an factory function that returns a function that can be called to upload the file
 * @param {string} filePath - Path to local file that will be uploaded
 * @param {string} destFileName - the file path(file name included) in the bucket (e.g. 'folder1/folder2/filename.jpg', used to add public view permission)
 * @param {number} [generationMatchPrecondition=0] - the generation number of the file to be uploaded, used to prevent overwriting a file that has been updated since the last download
 * @returns {string} - the public URL of the uploaded file
 */
export function uploadGoogleFile(filePath: string, destFileName: string, generationMatchPrecondition: number = 0) {
  const options = {
      destination: destFileName,
      preconditionOpts: { ifGenerationMatch: generationMatchPrecondition },
  };
  const url = `${GOOGLE_STORAGE_BUCKET_URL}${destFileName}`;
  return async function uploadFile() {
    try {
      await googleBucket.upload(filePath, options);
      await googleBucket.file(destFileName).makePublic();
      return url;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to upload file to Google Cloud Storage', error);
      return '';
    }
  };
}
