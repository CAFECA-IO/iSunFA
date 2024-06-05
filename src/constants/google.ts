// Info: (20240604 - Murky) if process.env is not set, the error will stop all process, error can't be caught
export const GOOGLE_PROJECT_ID = process.env.GOOGLE_PROJECT_ID || 'google_project_id';
export const GOOGLE_STORAGE_BUCKET_NAME = process.env.GOOGLE_BUCKET_NAME || 'google_bucket_name';
export const GOOGLE_UPLOAD_FOLDER = process.env.GOOGLE_UPLOAD_FOLDER || 'google_upload_folder';
export const GOOGLE_STORAGE_BUCKET_URL = `https://storage.googleapis.com/${GOOGLE_STORAGE_BUCKET_NAME ? GOOGLE_STORAGE_BUCKET_NAME + '/' : ''}`;
export const GOOGLE_CREDENTIALS_BASE64 = process.env.GOOGLE_CREDENTIALS_BASE64 || '';
export const GOOGLE_CREDENTIALS = JSON.parse(
    Buffer.from(GOOGLE_CREDENTIALS_BASE64, 'base64').toString('ascii') || '{}',
  );
