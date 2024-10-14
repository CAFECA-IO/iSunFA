import { VoucherType } from '@/constants/account';
import { ILineItem } from '@/interfaces/line_item';
import { IPayment } from '@/interfaces/payment';
import { Prisma } from '@prisma/client';

export interface IVoucherMetaData {
  date: number;
  voucherType: VoucherType;
  companyId: string;
  companyName: string;
  description: string;
  reason: string; // 從paymentReason改這個
  projectId: string;
  project: string;
  contractId: string;
  contract: string;
  payment: IPayment;
}

export interface IVoucher {
  voucherIndex: string;
  invoiceIndex: string; // 改在這裡
  metaData: IVoucherMetaData[];
  lineItems: ILineItem[];
}

export interface IVoucherDataForAPIResponse {
  id: number;
  createdAt: number;
  updatedAt: number;
  journalId: number;
  no: string;
  lineItems: {
    id: number;
    amount: number;
    description: string;
    debit: boolean;
    accountId: number;
    voucherId: number;
    createdAt: number;
    updatedAt: number;
  }[];
}

export interface IVoucherDataForSavingToDB {
  journalId?: number;
  lineItems: ILineItem[];
}

export type IVoucherFromPrismaIncludeJournalLineItems = Prisma.VoucherGetPayload<{
  include: {
    invoiceVoucherJournals: {
      include: {
        journal: true;
      };
    };
    lineItems: {
      include: {
        account: true;
      };
    };
  };
}>;

export type IVoucherForCashFlow = Prisma.VoucherGetPayload<{
  include: {
    invoiceVoucherJournals: {
      include: {
        journal: true;
      };
    };
    lineItems: {
      include: {
        account: true;
      };
    };
  };
}>;

export type IVoucherFromPrismaIncludeLineItems = Prisma.VoucherGetPayload<{
  include: {
    lineItems: {
      include: {
        account: true;
      };
    };
  };
}>;

// Info: (20240926 - Julian) temp interface
export interface IVoucherBeta {
  id: number;
  date: number;
  voucherNo: string;
  voucherType: VoucherType;
  note: string;
  accounting: string[];
  credit: number[];
  debit: number[];
  counterparty: {
    code: string;
    name: string;
  };
  issuer: {
    avatar: string;
    name: string;
  };
  onRead: boolean;
}
export const dummyVoucherList: IVoucherBeta[] = [
  {
    id: 1,
    date: 1632511200,
    voucherNo: '20240920-0001',
    voucherType: VoucherType.RECEIVE,
    note: 'Printer-0001',
    accounting: [
      '1141 Accounts receivable',
      '1141 Accounts receivable',
      '1141 Accounts receivable',
    ],
    credit: [100200],
    debit: [100000, 200],
    counterparty: {
      code: '59373022',
      name: 'PX Mart',
    },
    issuer: {
      avatar: 'https://i.pinimg.com/originals/51/7d/4e/517d4ea58fa6c12aca4e035cdbf257b6.jpg',
      name: 'Julian',
    },
    onRead: false,
  },
  {
    id: 2,
    date: 1662511200,
    voucherNo: '20240922-0001',
    voucherType: VoucherType.EXPENSE,
    note: 'Printer-0002',
    accounting: ['1141 Accounts receivable', '1141 Accounts receivable'],
    credit: [10200],
    debit: [10200],
    counterparty: {
      code: '59373022',
      name: 'PX Mart',
    },
    issuer: {
      avatar: 'https://i.pinimg.com/originals/51/7d/4e/517d4ea58fa6c12aca4e035cdbf257b6.jpg',
      name: 'Julian',
    },
    onRead: true,
  },
  {
    id: 3,
    date: 1672592800,
    voucherNo: '20240925-0002',
    voucherType: VoucherType.RECEIVE,
    note: 'Scanner-0001',
    accounting: [
      '1141 Accounts receivable',
      '1141 Accounts receivable',
      '1141 Accounts receivable',
      '1141 Accounts receivable',
    ],
    credit: [100000, 200],
    debit: [100000, 200],
    counterparty: {
      code: '59373022',
      name: 'PX Mart',
    },
    issuer: {
      avatar: 'https://i.pinimg.com/originals/51/7d/4e/517d4ea58fa6c12aca4e035cdbf257b6.jpg',
      name: 'Julian',
    },
    onRead: true,
  },
  {
    id: 4,
    date: 1702511200,
    voucherNo: '20240922-0002',
    voucherType: VoucherType.TRANSFER,
    note: 'Mouse-0001',
    accounting: ['1141 Accounts receivable', '1141 Accounts receivable'],
    credit: [300],
    debit: [300],
    counterparty: {
      code: '59373022',
      name: 'PX Mart',
    },
    issuer: {
      avatar: 'https://i.pinimg.com/originals/51/7d/4e/517d4ea58fa6c12aca4e035cdbf257b6.jpg',
      name: 'Julian',
    },
    onRead: true,
  },
  {
    id: 5,
    date: 1674762800,
    voucherNo: '20240925-0001',
    voucherType: VoucherType.RECEIVE,
    note: 'Keyboard-0001',
    accounting: ['1141 Accounts receivable', '1141 Accounts receivable'],
    credit: [213],
    debit: [213],
    counterparty: {
      code: '59373022',
      name: 'PX Mart',
    },
    issuer: {
      avatar: 'https://i.pinimg.com/originals/51/7d/4e/517d4ea58fa6c12aca4e035cdbf257b6.jpg',
      name: 'Julian',
    },
    onRead: true,
  },
];
