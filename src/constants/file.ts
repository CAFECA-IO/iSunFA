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
  INVOICE = 'invoice',
}

export enum FileDatabaseConnectionType {
  COMPANY_KYC_REGISTRATION_CERTIFICATE = 'companyKYCregistrationCertificateFile',
  COMPANY_KYC_TAX_CERTIFICATE = 'companyKYCtaxCertificateFile',
  COMPANY_KYC_REPRESENTATIVE_ID_CARD = 'companyKYCrepresentativeIdCardFile',
  COMPANY_IMAGE = 'companyImageFile',
  INVOICE_IMAGE = 'invoiceImageFile',
  OCR_IMAGE = 'ocrImageFile',
  USER_IMAGE = 'userImageFile',
  PROJECT_IMAGE = 'projectImageFile',
}

export const UPLOAD_TYPE_TO_FOLDER_MAP = {
  [UploadType.KYC]: FileFolder.KYC,
  [UploadType.COMPANY]: FileFolder.TMP,
  [UploadType.USER]: FileFolder.TMP,
  [UploadType.PROJECT]: FileFolder.TMP,
  [UploadType.INVOICE]: FileFolder.INVOICE,
};

export enum UploadDocumentType {
  BUSINESS_REGISTRATION_CERTIFICATE = 'business_registration_certificate',
  TAX_STATUS_CERTIFICATE = 'tax_status_certificate',
  REPRESENTATIVE_ID_CERTIFICATE = 'representative_id_certificate',
}

export const BASE_STORAGE_PLACEHOLDER = '{BASE_URL_PLACEHOLDER}';

export const BASE_STORAGE_FOLDER = process.env.BASE_STORAGE_PATH || '.';

export const VERCEL_STORAGE_FOLDER = '/tmp';

export const LOG_FOLDER = path.join(BASE_STORAGE_FOLDER, './log');

export const STORAGE_FOLDER =
  process.env.VERCEL === '1' ? VERCEL_STORAGE_FOLDER : BASE_STORAGE_FOLDER;

// Info: (20240828 - Murky) To avoid cyclic dependency, we need to add function here not utils
export function getFileFolder(folder: FileFolder): string {
  const filePath = path.join(STORAGE_FOLDER, folder);
  return filePath;
}

export const UPLOAD_IMAGE_FOLDERS_TO_CREATE_WHEN_START_SERVER = Object.values(FileFolder).map(
  (folder) => getFileFolder(folder)
);

export const PUBLIC_IMAGE_ID = 1000;
