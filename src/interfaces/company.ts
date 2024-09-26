import { IRole } from '@/interfaces/role';

export interface ICompany {
  id: number;
  code: string;
  regional: string;
  name: string;
  kycStatus: boolean;
  imageId: string;
  startDate: number;
  createdAt: number;
  updatedAt: number;
}

export interface ICompanyBeta {
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

export interface ICompanyAndRole {
  company: ICompanyDetail;
  role: IRole;
}
