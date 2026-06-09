export interface IPersonaSupplier {
  name: string;
  taxId: string;
  errorRate: number;
}

export interface IPersonaSupplierCategory {
  category: string;
  suppliers: IPersonaSupplier[];
}

export interface IRelatedParty {
  name: string;
  relationship: string;
}

export interface ICommonBankAccount {
  bankCode: string;
  isForeign: boolean;
}

export interface ICompanyPersona {
  industryDynamics: string;
  topSuppliers: IPersonaSupplierCategory[];
  relatedParties: IRelatedParty[];
  commonBankAccounts: ICommonBankAccount[];
}
