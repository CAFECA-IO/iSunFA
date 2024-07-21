import { RepresentativeIDType, UploadDocumentKeys } from '@/constants/kyc';

export interface IUploadDocuments {
  [UploadDocumentKeys.REPRESENTATIVE_ID_TYPE]: RepresentativeIDType;
  [UploadDocumentKeys.BUSINESS_REGISTRATION_CERTIFICATE_ID]: {
    id: string | undefined;
    file: File | undefined;
  };
  [UploadDocumentKeys.TAX_STATUS_CERTIFICATE_ID]: {
    id: string | undefined;
    file: File | undefined;
  };
  [UploadDocumentKeys.REPRESENTATIVE_CERTIFICATE_ID]: {
    id: string | undefined;
    file: File | undefined;
  };
}

export const initialUploadDocuments: IUploadDocuments = {
  [UploadDocumentKeys.REPRESENTATIVE_ID_TYPE]: RepresentativeIDType.PASSPORT,
  [UploadDocumentKeys.BUSINESS_REGISTRATION_CERTIFICATE_ID]: {
    id: undefined,
    file: undefined,
  },
  [UploadDocumentKeys.TAX_STATUS_CERTIFICATE_ID]: {
    id: undefined,
    file: undefined,
  },
  [UploadDocumentKeys.REPRESENTATIVE_CERTIFICATE_ID]: {
    id: undefined,
    file: undefined,
  },
};
