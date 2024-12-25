import { IFileBeta } from '@/interfaces/file';

export interface IRoom {
  id: string;
  password: string;
  fileList: IFileBeta[];
}

export interface IRoomWithPrivateData extends IRoom {
  companyId: number;
}
