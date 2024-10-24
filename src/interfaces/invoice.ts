import { IPayment } from '@/interfaces/payment';
import { EventType } from '@/constants/account';
import { ICounterparty } from '@/interfaces/counterparty';
import { InvoiceType } from '@/constants/invoice';

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

export enum FLOW_TYPES {
  INPUT = 'input',
  OUTPUT = 'output',
}

export enum FORM_TYPES {
  TRIPLICATE = 'Triplicate',
  DUPLICATE = 'Duplicate',
  SPECIAL = 'Special',
}

export enum TAX_TYPE {
  TAXABLE = 'taxable',
  TAX_FREE = 'tax free',
}

// Info: (20241022 - tzuhan) @Murky, @Jacky 這裡是參考 data model 來更新 IInvoiceBeta 的介面，需要確認是否有遺漏或錯誤
export interface IInvoiceBeta {
  id: number;
  // certificateId: number; // Info: (20241021 - tzuhan) @Jacky
  // counterPartyId: number; // Info: (20241021 - tzuhan) To Jacky, UI 需要改成 ICounterParty
  inputOrOutput: FLOW_TYPES;
  date: number;
  no: string;
  currencyAlias: string;
  priceBeforeTax: number;
  taxType: string; // Info: (20241021 - tzuhan) @Jacky 是指什麼？ 有 enum嗎？
  taxRatio: number;
  taxPrice: number;
  totalPrice: number;
  type: InvoiceType;
  deductible: boolean;
  createdAt: number;
  updatedAt: number;

  name: string; // Info: (20241021 - tzuhan) @Jacky @Murky, UI 需要，目前DB沒有
  uploader: string; // Info:(20241021 - tzuhan) @Jacky @Murkyy, 需要上傳者的資訊，目前DB沒有，可以在call create cerificate的時候透過userId存
  counterParty: ICounterparty;
}
