import { ProgressStatus } from '@/constants/account';

export interface IOCR {
  id: number;
  aichResultId: string;
  imageName: string; // Info: from frontend (20240815 - Shirley)
  imageUrl: string;
  imageSize: string; // Info: from frontend (20240815 - Shirley)
  progress: number; // 0 ~ 100 Float
  status: ProgressStatus;
  createdAt: number;
  uploadIdentifier?: string; // Info: from frontend (20240815 - Shirley)
}

export interface IOCRItem {
  name: string;
  size: string;
  type: string;
  encryptedContent: ArrayBuffer;
  uploadIdentifier: string;

  iv: Uint8Array;
  timestamp: number;
  encryptedSymmetricKey: string;
  publicKey: JsonWebKey;
  companyId: number;
  userId: number;
}

export interface IOCRItemFromIndexedDB {
  id: string;
  data: IOCRItem;
}
