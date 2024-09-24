export interface IRole {
  id: number;
  name: string;
  permissions: string[];
}

export interface IRoleBeta extends IRole {
  lastLoginAt: number;
  createdAt: number;
  updatedAt: number;
}
