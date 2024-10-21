export interface IRole {
  id: number;
  name: string;
  permissions: string[];
  lastLoginAt: number;
  createdAt: number;
  updatedAt: number;
}
