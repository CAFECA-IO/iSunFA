export interface INews {
  id: number;
  // imageId: number; // ToDo: (20241024 - Jacky) Add imageId after schema changed
  title: string;
  content: string;
  type: string;
  createdAt: number;
  updatedAt: number;
}
