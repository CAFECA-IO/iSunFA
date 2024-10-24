import { ProgressStatus } from '@/constants/account';

export interface IFile {
  id: number;
  name: string;
  size: number;
  existed: boolean;
}

// Info: only for frontend without confidential data (20241021 - tzuhan)
export interface IFileUIBeta {
  id: number | null;
  certificateId?: number;
  name: string;
  size: number;
  url: string;
  progress: number; // Info: (20240919 - tzuhan) 上傳進度（0-100）
  status: ProgressStatus; // Info: (20240919 - tzuhan) 是否暫停
}
