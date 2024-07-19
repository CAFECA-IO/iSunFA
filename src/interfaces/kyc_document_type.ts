import { ProgressStatus } from '@/constants/account';
import { RepresentativeIDType, UploadDocumentKeys } from '@/constants/kyc';

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
