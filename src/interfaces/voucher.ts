import { VoucherType } from '@/constants/account';
import { ILineItem, ILineItemBeta } from '@/interfaces/line_item';
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
  voucherDate: number;
  voucherNo: string;
  voucherType: VoucherType;
  note: string;
  counterParty: {
    companyId: string;
    name: string;
  };
  issuer: {
    avatar: string;
    name: string;
  };
  onRead: boolean;

  lineItemsInfo: {
    sum: {
      debit: boolean;
      amount: number;
    };
    lineItems: ILineItemBeta[];
  };
}
export const dummyVoucherList: IVoucherBeta[] = [
  {
    id: 1,
    voucherDate: 1632511200,
    voucherNo: '20240920-0001',
    voucherType: VoucherType.RECEIVE,
    note: 'Printer-0001',
    counterParty: {
      companyId: '59373022',
      name: 'PX Mart',
    },
    issuer: {
      avatar: 'https://i.pinimg.com/originals/51/7d/4e/517d4ea58fa6c12aca4e035cdbf257b6.jpg',
      name: 'Julian',
    },
    onRead: false,
    lineItemsInfo: {
      sum: {
        debit: true,
        amount: 100200,
      },
      lineItems: [
        {
          id: 1001,
          account: null,
          description: 'Printer',
          amount: 100000,
          debit: true,
        },
        {
          id: 1002,
          account: null,
          amount: 200,
          description: 'Printer',
          debit: true,
        },
        {
          id: 1003,
          account: null,
          amount: 100200,
          description: 'Printer',
          debit: false,
        },
      ],
    },
  },
  {
    id: 2,
    voucherDate: 1662511200,
    voucherNo: '20240922-0001',
    voucherType: VoucherType.EXPENSE,
    note: 'Printer-0002',
    counterParty: {
      companyId: '59373022',
      name: 'PX Mart',
    },
    issuer: {
      avatar: 'https://i.pinimg.com/originals/51/7d/4e/517d4ea58fa6c12aca4e035cdbf257b6.jpg',
      name: 'Julian',
    },
    onRead: true,
    lineItemsInfo: {
      sum: {
        debit: true,
        amount: 10200,
      },
      lineItems: [
        {
          id: 2001,
          account: null,
          description: 'Printer',
          amount: 10200,
          debit: true,
        },
        {
          id: 2002,
          account: null,
          amount: 10200,
          description: 'Printer',
          debit: false,
        },
      ],
    },
  },
  {
    id: 3,
    voucherDate: 1672592800,
    voucherNo: '20240925-0002',
    voucherType: VoucherType.RECEIVE,
    note: 'Scanner-0001',
    counterParty: {
      companyId: '59373022',
      name: 'PX Mart',
    },
    issuer: {
      avatar: 'https://i.pinimg.com/originals/51/7d/4e/517d4ea58fa6c12aca4e035cdbf257b6.jpg',
      name: 'Julian',
    },
    onRead: true,
    lineItemsInfo: {
      sum: {
        debit: true,
        amount: 100200,
      },
      lineItems: [
        {
          id: 3001,
          account: null,
          description: 'Scanner',
          amount: 100000,
          debit: true,
        },
        {
          id: 3002,
          account: null,
          amount: 200,
          description: 'Scanner',
          debit: true,
        },
        {
          id: 3003,
          account: null,
          amount: 200,
          description: 'Scanner',
          debit: false,
        },
        {
          id: 3004,
          account: null,
          amount: 100000,
          description: 'Scanner',
          debit: false,
        },
      ],
    },
  },
  {
    id: 4,
    voucherDate: 1702511200,
    voucherNo: '20240922-0002',
    voucherType: VoucherType.TRANSFER,
    note: 'Mouse-0001',
    counterParty: {
      companyId: '59373022',
      name: 'PX Mart',
    },
    issuer: {
      avatar: 'https://i.pinimg.com/originals/51/7d/4e/517d4ea58fa6c12aca4e035cdbf257b6.jpg',
      name: 'Julian',
    },
    onRead: true,
    lineItemsInfo: {
      sum: {
        debit: true,
        amount: 300,
      },
      lineItems: [
        {
          id: 4001,
          account: null,
          description: 'Mouse',
          amount: 300,
          debit: true,
        },
        {
          id: 4002,
          account: null,
          amount: 300,
          description: 'Mouse',
          debit: false,
        },
      ],
    },
  },
  {
    id: 5,
    voucherDate: 1674762800,
    voucherNo: '20240925-0001',
    voucherType: VoucherType.RECEIVE,
    note: 'Keyboard-0001',
    counterParty: {
      companyId: '59373022',
      name: 'PX Mart',
    },
    issuer: {
      avatar: 'https://i.pinimg.com/originals/51/7d/4e/517d4ea58fa6c12aca4e035cdbf257b6.jpg',
      name: 'Julian',
    },
    onRead: true,
    lineItemsInfo: {
      sum: {
        debit: true,
        amount: 213,
      },
      lineItems: [
        {
          id: 5001,
          account: null,
          description: 'Keyboard',
          amount: 213,
          debit: true,
        },
        {
          id: 5002,
          account: null,
          amount: 213,
          description: 'Keyboard',
          debit: false,
        },
      ],
    },
  },
];

export interface IVoucherUI extends IVoucherBeta {
  isSelected: boolean;
}
