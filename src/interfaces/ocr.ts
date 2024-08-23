import { ProgressStatus } from '@/constants/account';

export interface IOCR {
  id: number;
  aichResultId: string;
  imageName: string; // Info: (20240815 - Shirley) from frontend
  imageUrl: string;
  imageSize: string; // Info: (20240815 - Shirley) from frontend
  progress: number; // 0 ~ 100 Float
  status: ProgressStatus;
  createdAt: number;
  uploadIdentifier?: string; // Info: (20240815 - Shirley) from frontend
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
