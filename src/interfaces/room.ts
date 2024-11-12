import { IFileBeta } from '@/interfaces/file';

export interface IRoom {
  id: string;
  password: string;
  fileList: IFileBeta[];
}
