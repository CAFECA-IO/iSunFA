import { IPayment } from '@/interfaces/payment';
import { EventType } from '@/constants/account';
import { ICounterPartyEntity, ICounterpartyOptional } from '@/interfaces/counterparty';
import { InvoiceTaxType, InvoiceTransactionDirection, InvoiceType } from '@/constants/invoice';
import { CurrencyType } from '@/constants/currency';

// Info: （ 20240522 - Murky）To Emily, To Julian 這個interface是用來存入prisma的資料, 用來在ISFMK00052時Upload使用
export interface IInvoice {
  journalId: number | null;
  date: number; // Info: (20240522 - Murky) timestamp
  eventType: EventType;
  paymentReason: string;
  description: string;
  vendorOrSupplier: string;
  projectId: number | null;
  project: string | null;
  contractId: number | null;
  contract: string | null;
  payment: IPayment;
}

// Info: (20250328 - Luphia) 記錄團隊訂閱發票，包含訂單與付費紀錄，並補上稅金資訊、發票號碼
export interface ITeamInvoice {
  id?: number;
  invoiceNo: string;
  teamId: number;
  teamOrderId: number;
  teamPaymentTransactionId: number;
  cancelled: boolean;
  currency: CurrencyType;
  amount: number;
  tax: number;
  total: number;
  createdAt: number;
  updatedAt: number;
}

export interface IInvoiceBeta {
  id: number;
  counterParty: ICounterpartyOptional;
  inputOrOutput: InvoiceTransactionDirection;
  date: number;
  no: string;
  currencyAlias: CurrencyType;
  priceBeforeTax: number;
  taxType: InvoiceTaxType;
  taxRatio: number | null;
  taxPrice: number;
  totalPrice: number;
  type: InvoiceType;
  deductible: boolean;
  createdAt: number;
  updatedAt: number;
  // Info: (20250421 - Anna) 扣抵類型
  deductionType?: string;
  // Info: (20250428 - Anna) 彙總發票張數
  summarizedInvoiceCount?: number;
  // Info: (20250429 - Anna) 是否為彙總金額代表憑證
  isSharedAmount?: boolean;
  // Info: (20250429 - Anna) 其他憑證編號
  otherCertificateNo?: string;
}

export type IInvoiceBetaOptional = Partial<IInvoiceBeta>;

/**
 * Info: (20241024 - Murky)
 * @description Invoice Entity for backend, this is not "Invoice" in real life, this is the metadata of certificate
 * @note use parsePrismaInvoiceToInvoiceEntity to convert prisma invoice to this entity
 * @note use initInvoiceEntity to create a new invoice entity
 */
export interface IInvoiceEntity {
  /**
   * Info: (20241024 - Murky)
   * @description id in database, 0 if not yet saved in database
   */
  id: number;

  /**
   * Info: (20241024 - Murky)
   * @description certificateId of certificate this invoice data belongs to
   */
  certificateId: number;

  /**
   * Info: (20241024 - Murky)
   * @description counterPartyId of counterParty that this invoice is coming from or going to (base on inputOrOutput)
   */
  counterPartyId: number; // TODO: (20250114 - Shirley) DB migration 為了讓功能可以使用的暫時解法，invoice 功能跟 counterParty 相關的資料之後需要一一檢查或修改

  counterPartyInfo?: string; // TODO: (20250114 - Shirley) DB migration 為了讓功能可以使用的暫時解法，invoice 功能跟 counterParty 相關的資料之後需要一一檢查或修改

  /**
   * Info: (20241024 - Murky)
   * @description is invoice caused by input or output of money
   */
  inputOrOutput: InvoiceTransactionDirection;

  /**
   * Info: (20241024 - Murky)
   * @description date of invoice, selected by user
   */
  date: number;

  /**
   * Info: (20241024 - Murky)
   * @description 發票號碼
   */
  no: string;

  /**
   * Info: (20241024 - Murky)
   * @description 貨幣別
   */
  currencyAlias: CurrencyType;

  /**
   * Info: (20241024 - Murky)
   * @description 稅前金額
   */
  priceBeforeTax: number;

  /**
   * Info: (20241024 - Murky)
   * @description 應稅或免稅，零稅率包含在應稅
   */
  taxType: InvoiceTaxType;

  /**
   * Info: (20241024 - Murky)
   * @Integer
   * @description 5% will be written as 5
   */
  taxRatio: number;

  /**
   * Info: (20241024 - Murky)
   * @Integer
   * @description amount of consumption tax
   */
  taxPrice: number;

  /**
   * Info: (20241024 - Murky)
   * @Integer
   * @description total price after tax
   */
  totalPrice: number;

  /**
   * Info: (20241024 - Murky)
   * @description 發票種類 來源於國稅局
   */
  type: InvoiceType;

  /**
   * Info: (20241024 - Murky)
   * @description 此Invoice可否抵扣
   */
  deductible: boolean;

  /**
   * Info: (20241024 - Murky)
   * @note need to be in seconds
   */
  createdAt: number;

  /**
   * Info: (20241024 - Murky)
   * @note need to be in seconds
   */
  updatedAt: number;

  /**
   * Info: (20241024 - Murky)
   * @note need to be in seconds, null if not deleted
   */
  deletedAt: number | null;

  counterParty?: ICounterPartyEntity;
  // ToDo: (20241024 - Murky) Certificate
}

export interface IAIInvoice {
  resultId: string;

  certificateId: number;

  /**
   * Info: (20241024 - Murky)
   * @description is invoice caused by input or output of money
   */
  inputOrOutput: string;

  /**
   * Info: (20241024 - Murky)
   * @description date of invoice, selected by user
   */
  date: number;

  /**
   * Info: (20241024 - Murky)
   * @description 發票號碼
   */
  no: string;

  /**
   * Info: (20241024 - Murky)
   * @description 貨幣別
   */
  currencyAlias: string;

  /**
   * Info: (20241024 - Murky)
   * @description 稅前金額
   */
  priceBeforeTax: number;

  /**
   * Info: (20241024 - Murky)
   * @description 應稅或免稅，零稅率包含在應稅
   */
  taxType: string;

  /**
   * Info: (20241024 - Murky)
   * @Integer
   * @description 5% will be written as 5
   */
  taxRatio: number;

  /**
   * Info: (20241024 - Murky)
   * @Integer
   * @description amount of consumption tax
   */
  taxPrice: number;

  /**
   * Info: (20241024 - Murky)
   * @Integer
   * @description total price after tax
   */
  totalPrice: number;

  /**
   * Info: (20241024 - Murky)
   * @description 發票種類 來源於國稅局
   */
  type: string;

  /**
   * Info: (20241024 - Murky)
   * @description 此Invoice可否抵扣
   */
  deductible: boolean;

  counterpartyName: string;
}
