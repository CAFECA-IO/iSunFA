import { ProgressStatus } from '@/constants/account';

export enum RepresentativeIDType {
  PASSPORT = 'PASSPORT',
  ID_CARD = 'ID_CARD',
  DRIVER_LICENSE = 'DRIVER_LICENSE',
}

export enum UploadDocumentKeys {
  REPRESENTATIVE_ID_TYPE = 'representative_id_type',
  BUSINESS_REGISTRATION_CERTIFICATE = 'business_registration_certificate',
  TAX_STATUS_CERTIFICATE = 'tax_status_certificate',
  REPRESENTATIVE_ID_CERTIFICATE = 'representative_id_certificate',
}

export interface IUploadDocuments {
  [UploadDocumentKeys.REPRESENTATIVE_ID_TYPE]: RepresentativeIDType;
  [UploadDocumentKeys.BUSINESS_REGISTRATION_CERTIFICATE]: {
    file: File | null;
    status: ProgressStatus | null;
    fileId: string | null;
  };
  [UploadDocumentKeys.TAX_STATUS_CERTIFICATE]: {
    file: File | null;
    status: ProgressStatus | null;
    fileId: string | null;
  };
  [UploadDocumentKeys.REPRESENTATIVE_ID_CERTIFICATE]: {
    file: File | null;
    status: ProgressStatus | null;
    fileId: string | null;
  };
}

export const initialUploadDocuments: IUploadDocuments = {
  [UploadDocumentKeys.REPRESENTATIVE_ID_TYPE]: RepresentativeIDType.PASSPORT,
  [UploadDocumentKeys.BUSINESS_REGISTRATION_CERTIFICATE]: {
    file: null,
    status: null,
    fileId: null,
  },
  [UploadDocumentKeys.TAX_STATUS_CERTIFICATE]: { file: null, status: null, fileId: null },
  [UploadDocumentKeys.REPRESENTATIVE_ID_CERTIFICATE]: { file: null, status: null, fileId: null },
};
