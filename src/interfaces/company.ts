export interface ICompany {
  id: number;
  code: string;
  regional: string;
  name: string;
}

export interface ICompanyItem {
  name: string;
  role: string;
  brn: string;
  icon: string;
  isPassedKyc: boolean;
}
