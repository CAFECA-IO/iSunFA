import { ProgressStatus } from '@/constants/account';

export interface IOCR {
  id: number;
  imageName: string;
  imageUrl: string;
  imageSize: number;
  createdAt: number;
  updatedAt: number;
}

export interface IUnprocessedOCR {
  id: number;
  aichResultId: string;
  imageName: string;
  imageUrl: string;
  imageSize: string;
  progress: number; // 0 ~ 100 Float
  status: ProgressStatus;
  createdAt: number;
}
