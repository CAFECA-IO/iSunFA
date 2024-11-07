export interface IUserRole {
  id: number;
  userId: number;
  roleId: number; // Info: (20241107 - Liz) 這邊會改成 roleName
  lastLoginAt: number;
  createdAt: number;
  updatedAt: number;
}
