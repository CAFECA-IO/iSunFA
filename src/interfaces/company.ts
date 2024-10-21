import { IRole } from '@/interfaces/role';

export interface ICompany {
  id: number;
  imageId: string;
  name: string;
  taxId: string;
  tag: string;
  startDate: number;
  createdAt: number;
  updatedAt: number;
}

export interface ICompanyDetail extends ICompany {
  ownerId: number;
  kycStatusDetail: string;
}

export interface ICompanyAndRoleDetail {
  company: ICompanyDetail;
  role: IRole;
}

export interface ICompanyAndRole {
  company: ICompany;
  role: IRole;
}
