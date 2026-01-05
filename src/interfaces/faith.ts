import { Prisma } from '@prisma/client';
import { JSONValue } from '@/interfaces/common';

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
  certificates?: IFaithCertificate[];
}

export interface IFaithContent {
  id: string;
  role: IFaithRole;
  textContent: string;
  content: JSONValue;
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
    taxRate: Prisma.Decimal | null;
    salesAmount: Prisma.Decimal | null;
    tax: Prisma.Decimal | null;
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
      amount: Prisma.Decimal;
    }[];
    sum: {
      debit: boolean;
      amount: Prisma.Decimal;
    };
  };
}

export interface ICreateSessionOptions {
  id?: number;
  userId: number;
  title: string;
  description: string;
}

export interface ICreateContentOptions {
  id?: number;
  sessionId: number;
  role: IFaithRole;
  content: string;
}

export interface ICreateCertificateOptions {
  id: number;
  name: string;
  description: string;
  image: string;
  taxInfo: IFaithCertificate['taxInfo'];
  voucherInfo: IFaithCertificate['voucherInfo'];
}

export interface ICreateTaxOptions {
  id?: number;
  certificateId: number;
  invoiceNo: string;
  issueDate: number;
  tradingPartnerName: string;
  tradingPartnerTaxId: string;
  taxType: string;
  taxRate: Prisma.Decimal;
  salesAmount: Prisma.Decimal;
  tax: Prisma.Decimal;
}

export interface ICreateVoucherOptions {
  id?: number;
  certificateId: number;
  voucherType: string;
  voucherNo: string;
  issueDate: number;
  description: string;
  lineItems: {
    accountName: string;
    accountCode: string;
    description: string;
    debit: boolean;
    amount: Prisma.Decimal;
  }[];
  sumDebit: boolean;
  sumAmount: Prisma.Decimal;
}

export interface ICreateLineItemOptions {
  id?: number;
  voucherId: number;
  accountName: string;
  accountCode: string;
  description: string;
  debit: boolean;
  amount: Prisma.Decimal;
}
