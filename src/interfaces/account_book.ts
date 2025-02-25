/**
 * Info: (20240324 - Shirley) Account Book 相關的介面定義
 */

export interface IRole {
  id: number;
  name: string;
  permissions: string[];
}

export interface ITeam {
  id: number;
  name: string;
  description: string;
  imageId: string;
  createdAt: number;
  updatedAt: number;
}

export interface IAccountBook {
  id: number;
  imageId: string;
  name: string;
  taxId: string;
  startDate: number;
  createdAt: number;
  updatedAt: number;
  isPrivate: boolean;
}

export interface IAccountBookForUserWithTeam {
  company: IAccountBook;
  team: ITeam;
  tag: string;
  order: number;
  role: IRole;
}
