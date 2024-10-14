import { IVoucherDataForSavingToDB } from '@/interfaces/voucher';
import { IInvoice } from '@/interfaces/invoice';
import { Prisma } from '@prisma/client';
import { JOURNAL_EVENT } from '@/constants/journal';

export interface IJournal {
  id: number;
  event: JOURNAL_EVENT;
  tokenContract: string;
  tokenId: string;
  aichResultId: string;
  projectId: number;
  contractId: number;
  imageUrl: string;
  invoice: IInvoice;
  voucher: IVoucherDataForSavingToDB;
}

// ToDo: (20240528 - Julian) [Beta] 用於 journal list 的 dummy interface，之後會被取代
export interface IJournalListItem {
  id: number;
  date: number;
  event: JOURNAL_EVENT;
  type: string | undefined;
  particulars: string | undefined;
  fromTo: string | undefined;
  account:
    | {
        id: number;
        debit: boolean;
        account: string;
        amount: number;
      }[]
    | undefined;
  projectName: string | undefined;
  projectImageId: string | null | undefined;
  voucherId: number | undefined;
  voucherNo: string | undefined;
}

export type IJournalFromPrismaIncludeProjectContractInvoiceVoucher = Prisma.JournalGetPayload<{
  include: {
    contract: true;
    project: {
      include: {
        imageFile: true;
      };
    };
    invoice: {
      include: {
        payment: true;
        imageFile: true;
      };
    };
    voucher: {
      include: {
        lineItems: {
          include: {
            account: true;
          };
        };
      };
    };
  };
}>;
