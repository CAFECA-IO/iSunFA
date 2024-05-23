export interface IUploadedItem {
  id: string;
  fileName: string;
  thumbnailSrc: string;
  fileSize: string;
  progressPercentage: number;
  isPaused: boolean;
  isError: boolean;
}
