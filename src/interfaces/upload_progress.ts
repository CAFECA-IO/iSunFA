import { ProgressStatus } from '@/constants/account';

export interface IUploadProgress {
  fileId: string;
  status: ProgressStatus;
  progress: number;
}
