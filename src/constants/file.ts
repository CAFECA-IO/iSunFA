export enum FileFolder {
  INVOICE = 'invoice',
  KYC = 'kyc',
  TMP = 'tmp',
}

export enum UploadDocumentType {
  BUSINESS_REGISTRATION_CERTIFICATE = 'business_registration_certificate',
  TAX_STATUS_CERTIFICATE = 'tax_status_certificate',
  REPRESENTATIVE_ID_CERTIFICATE = 'representative_id_certificate',
}

export const BASE_STORAGE_FOLDER = process.env.BASE_STORAGE_PATH || '/tmp';

export const VERCEL_STORAGE_FOLDER = '/tmp';
