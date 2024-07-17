export enum KYCDocumentType {
  BUSINESS_REGISTRATION_CERTIFICATE = 'business_registration_certificate',
  TAX_STATUS_CERTIFICATE = 'tax_status_certificate',
  REPRESENTATIVE_ID_CERTIFICATE = 'representative_id_certificate',
}

export interface KYCDocuments {
  [KYCDocumentType.BUSINESS_REGISTRATION_CERTIFICATE]: File | null;
  [KYCDocumentType.TAX_STATUS_CERTIFICATE]: File | null;
  [KYCDocumentType.REPRESENTATIVE_ID_CERTIFICATE]: File | null;
}

export const initialKYCDocuments: KYCDocuments = {
  [KYCDocumentType.BUSINESS_REGISTRATION_CERTIFICATE]: null,
  [KYCDocumentType.TAX_STATUS_CERTIFICATE]: null,
  [KYCDocumentType.REPRESENTATIVE_ID_CERTIFICATE]: null,
};
