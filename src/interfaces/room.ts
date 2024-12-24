import { IFileBeta } from '@/interfaces/file';

export interface IRoom {
  id: string;
  password: string;
  fileList: IFileBeta[];
}

export interface IRoomWithKeyChain extends IRoom {
  publicKey: JsonWebKey;
  privateKey: JsonWebKey;
}
