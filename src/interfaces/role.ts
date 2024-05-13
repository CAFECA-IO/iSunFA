export interface IRole {
  id: number;
  name: string;
  companyId: number;
  companyName: string;
  permissions: string[];
}
