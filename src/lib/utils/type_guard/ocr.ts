import { IOCRItem } from '@/interfaces/ocr';

export const isValidEncryptedDataForOCR = (ocr: IOCRItem): boolean => {
  const requiredFields: (keyof IOCRItem)[] = [
    'userId',
    'companyId',
    'uploadIdentifier',
    'encryptedContent',
    'encryptedSymmetricKey',
    'publicKey',
    'iv',
    'name',
    'timestamp',
    'size',
    'type',
  ];

  // Info: (20240827 - Shirley) 檢查必要欄位是否存在且有值
  const hasAllRequiredFields = requiredFields.every((field) => {
    return Object.prototype.hasOwnProperty.call(ocr, field) && !!ocr[field];
  });

  if (!hasAllRequiredFields) {
    return false;
  }

  // Info: (20240827 - Shirley) 檢查每個欄位的類型是否正確
  const isValidUserId = typeof ocr.userId === 'number';
  const isValidCompanyId = typeof ocr.companyId === 'number';
  const isValidUploadIdentifier = typeof ocr.uploadIdentifier === 'string';
  const isValidEncryptedContent = ocr.encryptedContent instanceof ArrayBuffer;
  const isValidEncryptedSymmetricKey = typeof ocr.encryptedSymmetricKey === 'string';
  const isValidPublicKey = typeof ocr.publicKey === 'object';
  const isValidIV = ocr.iv instanceof Uint8Array;
  const isValidName = typeof ocr.name === 'string';
  const isValidTimestamp = typeof ocr.timestamp === 'number';
  const isValidSize = typeof ocr.size === 'string';
  const isValidType = typeof ocr.type === 'string';

  if (
    !isValidUserId ||
    !isValidCompanyId ||
    !isValidUploadIdentifier ||
    !isValidEncryptedContent ||
    !isValidEncryptedSymmetricKey ||
    !isValidPublicKey ||
    !isValidIV ||
    !isValidName ||
    !isValidTimestamp ||
    !isValidSize ||
    !isValidType
  ) {
    return false;
  }

  return true;
};
