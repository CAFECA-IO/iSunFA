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

export interface ICompanyDetail extends ICompany {
  ownerId: number;
}
