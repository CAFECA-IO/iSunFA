import { RepresentativeIDType, UploadDocumentKeys } from '@/constants/kyc';

export interface IUploadDocuments {
  [UploadDocumentKeys.REPRESENTATIVE_ID_TYPE]: RepresentativeIDType;
  [UploadDocumentKeys.BUSINESS_REGISTRATION_CERTIFICATE_ID]: string;
  [UploadDocumentKeys.TAX_STATUS_CERTIFICATE_ID]: string;
  [UploadDocumentKeys.REPRESENTATIVE_CERTIFICATE_ID]: string;
}

export const initialUploadDocuments: IUploadDocuments = {
  [UploadDocumentKeys.REPRESENTATIVE_ID_TYPE]: RepresentativeIDType.PASSPORT,
  [UploadDocumentKeys.BUSINESS_REGISTRATION_CERTIFICATE_ID]: '',
  [UploadDocumentKeys.TAX_STATUS_CERTIFICATE_ID]: '',
  [UploadDocumentKeys.REPRESENTATIVE_CERTIFICATE_ID]: '',
};
