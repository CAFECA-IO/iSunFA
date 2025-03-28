import { IRole } from '@/interfaces/role';

export interface IUserRole {
  id: number;
  userId: number;
  role: IRole;
  lastLoginAt: number;
  createdAt: number;
  updatedAt: number;
}

// ToDo: (20250328 - Liz) 預計改成新的格式:
// export interface IUserRole {
//   id: number;
//   userId: number;
//   roleName: RoleName;
//   type: RoleType;
//   lastLoginAt: number;
//   createdAt: number;
//   updatedAt: number;
//   deletedAt?: number;
// }
