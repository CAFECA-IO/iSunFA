// Info: (20260508 - Julian) 帳簿介面
export interface IAccountBook {
  id: string;
  name: string;
  country: string;
  currency: string;
  rule: string;
  teamId?: string;
  teamName?: string;
  userRole?: string;
  enterpriseId?: string | null;
  esgIndustryId?: number | null;
  createdAt?: string | Date;
}

// Info: (20260508 - Julian) AI 分析日記帳、傳票、碳盤查計算時會用到的帳簿介面
export interface IAccountBookForPrompt {
  name: string;
  country: string;
  currency: string;
  rule: string;
}
