import { EventType, VoucherType } from '@/constants/account';
import { JOURNAL_EVENT } from '@/constants/journal';
import { ILineItem, ILineItemBeta } from '@/interfaces/line_item';
import type { ILineItemEntity } from '@/interfaces/line_item';
import { IPayment } from '@/interfaces/payment';
import { Prisma } from '@prisma/client';
import type { IEventEntity } from '@/interfaces/event';
import type { ICompanyEntity } from '@/interfaces/company';
import { ICounterPartyEntity } from '@/interfaces/counterparty';

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

/**
 * Info: (20241023 - Murky)
 * @description For voucher api passing data
 * @note Use  parsePrismaVoucherToVoucherEntity to convert PrismaVoucher to VoucherEntity
 * @note Use initVoucherEntity to create a new VoucherEntity from scratch
 */
export interface IVoucherEntity {
  /**
   * Info: (20241022 - Murky)
   * @description id in database, 0 if not yet saved in database
   */
  id: number;

  /**
   * Info: (20241022 - Murky)
   * @description userId, who created this voucher
   */
  issuerId: number;

  /**
   * Info: (20241022 - Murky)
   * @description companyId, 交易對象
   */
  counterPartyId: number;

  /**
   * Info: (20241022 - Murky)
   * @description  Which company this voucher be created
   */
  companyId: number;

  /**
   * Info: (20241022 - Murky)
   * @description uploaded / upcoming
   */
  status: JOURNAL_EVENT;

  /**
   * Info: (20241022 - Murky)
   * @description Is this voucher editable
   * @todo Need to write isEditable function, and guard other function
   */
  editable: boolean;

  /**
   * Info: (20241022 - Murky)
   * @description voucher sequence number
   */
  no: string;

  /**
   * Info: (20241022 - Murky)
   * @description voucher date, the date user selected
   */
  date: number;

  /**
   * Info: (20241022 - Murky)
   * @description payment or transfer or receiving
   */
  type: EventType;

  /**
   * Info: (20241022 - Murky)
   * @description voucher note for user to take note
   */
  note: string | null;

  /**
   * Info: (20241022 - Murky)
   * @description the time this voucher be created, not selected by user
   * @note need to be in seconds
   */
  createdAt: number;

  /**
   * Info: (20241023 - Murky)
   * @note need to be in seconds
   */
  updatedAt: number;

  /**
   * Info: (20241022 - Murky)
   * @description null if not deleted, timestamp if deleted
   * @note need to be in seconds
   * @todo Need to write isDeleted function, and guard other function
   */
  deletedAt: number | null;

  /**
   * Info: (20241023 - Murky)
   * @description array of voucher event that "originalVoucher" is this voucher
   */
  originalEvents: IEventEntity[];

  /**
   * Info: (20241023 - Murky)
   * @description array of voucher event that "resultVoucher" is this voucher
   */
  resultEvents: IEventEntity[];

  /**
   * Info: (20241023 - Murky)
   * @description indicate each line of this voucher, to represent the amount of money of each account in this voucher
   */
  lineItems: ILineItemEntity[];

  /**
   * Info: (20241023 - Murky)
   * @description which company create this voucher
   */
  company?: ICompanyEntity;

  /**
   * Info: (20241023 - Murky)
   * @description this voucher is caused by which company
   */
  counterParty?: ICounterPartyEntity;

  // ToDo: (20241023 - Murky) Asset
  // ToDo: (20241023 - Murky) UserVoucher => isRead
  // ToDo: (20241023 - Murky) Issuer => User
  // ToDo: (20241023 - Murky) Certificate
}
