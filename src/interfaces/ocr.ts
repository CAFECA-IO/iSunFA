import { ProgressStatus } from '@/constants/account';

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
