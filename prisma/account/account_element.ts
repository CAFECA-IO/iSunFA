import { PUBLIC_COMPANY_ID } from '@/constants/company';

export class AccountElement {
  companyId: number = PUBLIC_COMPANY_ID;

  system: string = "IFRS";

  type: string;

  debit: boolean;

  liquidity: boolean;

  code: string;

  name: string;

  forUser: boolean;

  parentCode: string;

  rootCode: string;

  createdAt: number = 0;

  updatedAt: number = 0;

  constructor(type: string, debit: boolean, liquidity: boolean, code: string, name: string, forUser: boolean, parentCode: string, rootCode: string) {
    this.type = type;
    this.debit = debit;
    this.liquidity = liquidity;
    this.code = code;
    this.name = name;
    this.forUser = forUser;
    this.parentCode = parentCode;
    this.rootCode = rootCode;
  }
}
