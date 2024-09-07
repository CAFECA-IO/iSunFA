import { ProgressStatus } from '@/constants/account';
import { Prisma } from '@prisma/client';

export interface IOCR {
  id: number;
  aichResultId: string;
  imageName: string; // Info: (20240815 - Shirley) from frontend
  imageUrl: string;
  imageSize: string; // Info: (20240815 - Shirley) from frontend
  progress: number; // Info: (20240611 - Murky) 0 ~ 100 Float
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

export type ocrIncludeFile = Prisma.OcrGetPayload<{
  include: {
    imageFile: true;
  };
}>;
