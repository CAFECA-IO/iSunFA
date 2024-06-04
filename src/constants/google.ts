export const GOOGLE_PROJECT_ID = process.env.GOOGLE_PROJECT_ID || 'mermer-official-415806';
export const GOOGLE_STORAGE_BUCKET_NAME = process.env.GOOGLE_BUCKET_NAME || 'mermer-offical-km';
export const GOOGLE_UPLOAD_FOLDER = process.env.GOOGLE_UPLOAD_FOLDER || 'ISunFa';
export const GOOGLE_STORAGE_BUCKET_URL = `https://storage.googleapis.com/${GOOGLE_STORAGE_BUCKET_NAME ? GOOGLE_STORAGE_BUCKET_NAME + '/' : ''}`;
export const GOOGLE_CREDENTIALS_BASE64 = process.env.GOOGLE_CREDENTIALS_BASE64 || '';
export const GOOGLE_CREDENTIALS = JSON.parse(
    Buffer.from(GOOGLE_CREDENTIALS_BASE64, 'base64').toString('ascii') || '{}',
  );
