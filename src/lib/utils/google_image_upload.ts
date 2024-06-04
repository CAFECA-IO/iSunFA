import { Storage } from "@google-cloud/storage";

export const googleStorage = new Storage({
    projectId: process.env.GOOGLE_PROJECT_ID,
    credentials: JSON.parse(process.env.GOOGLE_SERVICE_KEY || '{}'),
  });

  export const googleBucket = googleStorage.bucket(process.env.GOOGLE_STORAGE_BUCKET_NAME || '');

  /**
   * Uploads a file to Google Cloud Storage
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
    const url = `https://storage.googleapis.com/${process.env.GOOGLE_STORAGE_BUCKET_NAME ? process.env.GOOGLE_STORAGE_BUCKET_NAME + '/' : ''}${destFileName}`;
    return async function uploadFile() {
      await googleBucket.upload(filePath, options);
      await googleBucket.file(destFileName).makePublic();
      return url;
    };
  }
