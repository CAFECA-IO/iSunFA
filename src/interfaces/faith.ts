export interface IFaithRole {
  id: string;
  name: string;
  image: string;
}

export interface IFaithSession {
  id: string;
  title: string;
  description: string;
  unreadCount: number;
  createdAt: number;
  updatedAt: number;
  contents?: IFaithContent[];
}

export interface IFaithContent {
  id: string;
  role: IFaithRole;
  content: string;
  like: boolean;
  dislike: boolean;
  createdAt: number;
}

export interface IFaithCertificate {
  id: string;
  name: string;
  description: string;
  image: string;
  taxInfo: {
    invoiceNo: string | null;
    issueDate: number | null;
    tradingPartner: {
      name: string | null;
      taxId: string | null;
    };
    taxType: string | null;
    taxRate: number | null;
    salesAmount: number | null;
    tax: number | null;
  };
  voucherInfo: {
    voucherType: string;
    voucherNo: string;
    issueDate: number;
    description: string;
    lineItems: {
      account: {
        name: string;
        code: string;
      };
      description: string;
      debit: boolean;
      amount: number;
    }[];
    sum: {
      debit: boolean;
      amount: number;
    };
  };
}
