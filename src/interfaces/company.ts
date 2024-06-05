export interface ICompany {
  id: number;
  code: string;
  regional: string;
  name: string;
  kycStatus: boolean;
  imageId: string | null;
  startDate: number;
  createdAt: number;
  updatedAt: number;
}
