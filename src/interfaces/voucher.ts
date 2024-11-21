import { EventType, VoucherType } from '@/constants/account';
import { JOURNAL_EVENT } from '@/constants/journal';
import { ILineItem, ILineItemBeta } from '@/interfaces/line_item';
import type { ILineItemEntity, IReverseItem } from '@/interfaces/line_item';
import { IPayment } from '@/interfaces/payment';
import {
  Prisma,
  Voucher as PrismaVoucher,
  User as PrismaUser,
  Counterparty as PrismaCounterParty,
  AccociateVoucher as PrismaAssociateVoucher,
  Event as PrismaEvent,
  LineItem as PrismaLineItem,
  AssetVoucher as PrismaAssetVoucher,
  Asset as PrismaAsset,
  Certificate as PrismaCertificate,
  VoucherCertificate as PrismaVoucherCertificate,
  Account as PrismaAccount,
  Invoice as PrismaInvoice,
  File as PrismaFile,
  UserCertificate as PrismaUserCertificate,
  AccociateLineItem as PrismaAssociateLineItem,
  UserVoucher as PrismaUserVoucher,
} from '@prisma/client';
import type { IEventEntity } from '@/interfaces/event';
import type { ICompanyEntity } from '@/interfaces/company';
import type { ICounterparty, ICounterPartyEntity } from '@/interfaces/counterparty';
import type { IAssetDetails, IAssetEntity } from '@/interfaces/asset';
import type { ICertificate, ICertificateEntity } from '@/interfaces/certificate';
import type { IUserVoucherEntity } from '@/interfaces/user_voucher';
import type { IUserEntity } from '@/interfaces/user';

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
  invoiceIndex: string;
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

export interface IVoucherDetailForFrontend {
  id: number;
  voucherDate: number;
  type: string;
  note: string;
  counterParty: {
    id: number;
    companyId: number;
    name: string;
  };
  recurringInfo?: {
    // Info: (20241105 - Murky) @Julian 如過不需要的話可以加上?
    type: string;
    startDate: number;
    endDate: number;
    daysOfWeek: number[]; // Info: (20241029 - Julian) 0~6
    monthsOfYear: number[]; // Info: (20241029 - Julian) 0~11
  };
  payableInfo:
    | {
        total: number;
        alreadyHappened: number;
        remain: number;
      }
    | undefined;
  receivingInfo:
    | {
        total: number;
        alreadyHappened: number;
        remain: number;
      }
    | undefined;
  reverseVoucherIds: {
    id: number;
    voucherNo: string;
  }[];
  assets: IAssetDetails[];
  certificates: ICertificate[];
  lineItems: (ILineItemBeta & {
    reverseList: IReverseItem[];
  })[];
}

export const defaultVoucherDetail: IVoucherDetailForFrontend = {
  id: 0,
  voucherDate: 0,
  type: '',
  note: '',
  counterParty: {
    id: 0,
    companyId: 0,
    name: '',
  },
  recurringInfo: {
    type: '',
    startDate: 0,
    endDate: 0,
    daysOfWeek: [],
    monthsOfYear: [],
  },
  payableInfo: undefined,
  receivingInfo: undefined,
  reverseVoucherIds: [],
  assets: [],
  certificates: [],
  lineItems: [],
};

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
  unRead: boolean;

  lineItemsInfo: {
    sum: {
      debit: boolean;
      amount: number;
    };
    lineItems: ILineItemBeta[];
  };
  payableInfo:
    | {
        total: number;
        alreadyHappened: number;
        remain: number;
      }
    | undefined;
  receivingInfo:
    | {
        total: number;
        alreadyHappened: number;
        remain: number;
      }
    | undefined;
  /**
   * Info: (20241121 - Murky)
   * @Julian 這邊可以用來顯示 voucher list 後面要reverse的地方
   */
  reverseVouchers: {
    id: number;
    voucherNo: string;
  }[];
}

export interface IVoucherUI extends IVoucherBeta {
  isSelected: boolean;
}

/**
 * Info: (20241106 - Murky)
 * @description 這個interface是在 report 頁面中點擊某一個account後, 呈現所有有那個account的voucher
 * @note 後端須把lineItems 依照 debit在前, credit在後排序
 * @Anna src/components/button/balance_details_button.tsx 的資料會是這個interface
 */
export interface IVoucherForSingleAccount {
  /**
   * Info: (20241106 - Murky)
   * @description voucher id
   */
  id: number;
  /**
   * Info: (20241106 - Murky)
   * @description voucher date, selected by user
   */
  date: number;

  /**
   * Info: (20241106 - Murky)
   * @description voucher 流水號
   */
  voucherNo: string;

  /**
   * Info: (20241106 - Murky)
   * @enum VoucherType RECEIVE, TRANSFER, EXPENSE
   * @note 後端需要從EventType轉換成VoucherType
   */
  voucherType: VoucherType;

  /**
   * Info: (20241106 - Murky)
   * @description voucher note
   */
  note: string;

  /**
   * Info: (20241106 - Murky)
   * @description 畫面上的 `particulars`, amount 欄位用這邊loop顯示 (這是一個array)
   */
  lineItems: {
    /**
     * Info: (20241106 - Murky)
     * @description line item id
     */
    id: number;

    /**
     * Info: (20241106 - Murky)
     * @description line item amount
     */
    amount: number;

    /**
     * Info: (20241106 - Murky)
     * @description line item description (for `particular`)
     */
    description: string;

    /**
     * Info: (20241106 - Murky)
     * @description line item debit or credit
     */
    debit: boolean;
  }[];
  issuer: {
    /**
     * Info: (20241106 - Murky)
     * @description issuer avatar url
     * @note 後端請用fileUrl轉換
     */
    avatar: string;

    /**
     * Info: (20241106 - Murky)
     * @description issuer name
     */
    name: string;
  };
}

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
   * @description array of voucher event that "originalVoucher" is this voucher,
   * empty if this voucher is related to nothing
   */
  originalEvents: IEventEntity[];

  /**
   * Info: (20241023 - Murky)
   * @description array of voucher event that "resultVoucher" is this voucher
   * , empty if this voucher is related to nothing
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

  /**
   * Info: (20241024 - Murky)
   * @description Asset that related to this voucher,
   * undefined if not related to any asset
   */
  asset: IAssetEntity[];

  /**
   * Info: (20241024 - Murky)
   * @description aich result id
   * @note database has not yet created this column
   */
  aiResultId?: string;

  /**
   * Info: (20241024 - Murky)
   * @description aich result status
   * @note database has not yet created this column
   */
  // aiStatus?: string;

  // ToDo: (20241023 - Murky) Certificate
  certificates: ICertificateEntity[];

  /**
   * Info: (20241024 - Murky)
   * @description Who created this voucher
   */
  issuer?: IUserEntity;

  /**
   * Info: (20241024 - Murky)
   * @description Who read this voucher
   */
  readByUsers: IUserVoucherEntity[];
}

export type IGetOneVoucherResponse = PrismaVoucher & {
  issuer: PrismaUser;
  voucherCertificates: (PrismaVoucherCertificate & {
    certificate: PrismaCertificate & {
      invoices: PrismaInvoice[];
      file: PrismaFile;
      UserCertificate: PrismaUserCertificate[];
    };
  })[];
  counterparty: PrismaCounterParty;
  originalVouchers: (PrismaAssociateVoucher & {
    event: PrismaEvent;
    resultVoucher: PrismaVoucher & {
      lineItems: (PrismaLineItem & {
        account: PrismaAccount;
      })[];
    };
  })[];

  resultVouchers: (PrismaAssociateVoucher & {
    event: PrismaEvent;
    originalVoucher: PrismaVoucher & {
      lineItems: (PrismaLineItem & {
        account: PrismaAccount;
      })[];
    };
  })[];
  assetVouchers: (PrismaAssetVoucher & {
    asset: PrismaAsset;
  })[];
  lineItems: (PrismaLineItem & {
    account: PrismaAccount;
    originalLineItem: (PrismaAssociateLineItem & {
      resultLineItem: PrismaLineItem & {
        account: PrismaAccount;
      };
      accociateVoucher: PrismaAssociateVoucher & {
        event: PrismaEvent;
      };
    })[];
    resultLineItem: (PrismaAssociateLineItem & {
      originalLineItem: PrismaLineItem & {
        account: PrismaAccount;
      };
      accociateVoucher: PrismaAssociateVoucher & {
        event: PrismaEvent;
        originalVoucher: PrismaVoucher;
      };
    })[];
  })[];
};

export type IGetManyVoucherResponseButOne = PrismaVoucher & {
  issuer: PrismaUser & {
    imageFile: PrismaFile;
  };
  counterparty: PrismaCounterParty;
  originalVouchers: (PrismaAssociateVoucher & {
    event: PrismaEvent;
    resultVoucher: PrismaVoucher & {
      lineItems: (PrismaLineItem & {
        account: PrismaAccount;
      })[];
    };
  })[];
  lineItems: (PrismaLineItem & {
    account: PrismaAccount;
  })[];
  UserVoucher: PrismaUserVoucher[];
};

export interface IAIResultVoucher {
  voucherDate: number;
  type: string;
  note: string;
  counterParty?: ICounterparty;
  lineItems: ILineItemBeta[];
}
