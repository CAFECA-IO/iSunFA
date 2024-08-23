import * as path from 'path';

export enum FileFolder {
  INVOICE = 'invoice',
  KYC = 'kyc',
  TMP = 'tmp',
}

export enum UploadType {
  KYC = 'kyc',
  COMPANY = 'company',
  USER = 'user',
  PROJECT = 'project',
}

export enum UploadDocumentType {
  BUSINESS_REGISTRATION_CERTIFICATE = 'business_registration_certificate',
  TAX_STATUS_CERTIFICATE = 'tax_status_certificate',
  REPRESENTATIVE_ID_CERTIFICATE = 'representative_id_certificate',
}

export const BASE_STORAGE_FOLDER = process.env.BASE_STORAGE_PATH || '.';

export const VERCEL_STORAGE_FOLDER = '/tmp';

export const LOG_FOLDER = path.join(BASE_STORAGE_FOLDER, './log');

export const UPLOAD_IMAGE_FOLDERS_TO_CREATE_WHEN_START_SERVER =
  process.env.VERCEL === '1'
    ? [VERCEL_STORAGE_FOLDER]
    : Object.values(FileFolder).map((folder) => path.join(BASE_STORAGE_FOLDER, folder));
