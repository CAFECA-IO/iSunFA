export interface IJournal {
  id: string;
  createdAt: string;
  text: string;
  fileId: string;
  file?: {
    id: string;
    hash: string;
    fileName: string;
  };
}