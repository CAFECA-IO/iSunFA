// Info: (20260508 - Julian) 帳簿基本屬性
export interface IAccountBookBase {
  id: string;
  name: string;
  country: string;
  currency: string;
  rule: string;
}

// Info: (20260508 - Julian) 帳簿介面
export interface IAccountBook extends IAccountBookBase {
  teamId?: string;
  teamName?: string;
  userRole?: string;
  enterpriseId?: string | null;
  esgIndustryId?: number | null;
  parValue?: number; // Info: (20260510 - Tzuhan) 面額
  createdAt?: string | Date;
}
