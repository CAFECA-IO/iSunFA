// import { IUser } from './user';

// export interface IAdmin extends IUser {
//   companyId: string;
//   companyName: string;
//   permissions: string[];
//   startDate: number;
//   endDate: number;
// }

export interface IRole {
  id: string;
  name: string;
  companyId: string;
  companyName: string;
  permissions: string[];
}
