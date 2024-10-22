export interface IFile {
  id: number;
  name: string;
  size: number;
  existed: boolean;
}

// Info: only for frontend without confidential data (20241021 - tzuhan)
export interface IFileUIBeta {
  id: number;
  name: string;
  size: number;
  url: string;
}
