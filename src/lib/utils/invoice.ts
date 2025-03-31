import { IInvoiceEntity } from '@/interfaces/invoice';
import { Invoice as PrismaInvoice } from '@prisma/client';
import { InvoiceTaxType, InvoiceTransactionDirection, InvoiceType } from '@/constants/invoice';
import { ICounterPartyEntity } from '@/interfaces/counterparty';
import { CurrencyType } from '@/constants/currency';
import { getTimestampNow } from '@/lib/utils/common';
import { ITeamOrder } from '@/interfaces/order';
import { ITeamPaymentTransaction } from '@/interfaces/payment';

export function calculateTaxAmount(amount: number, taxRate: number): number {
  let taxRateInDecimal = taxRate;

  if (taxRate >= 1) {
    taxRateInDecimal = taxRate / 100;
  }

  return amount * taxRateInDecimal;
}

export function calculateTotalAmountAfterTax(amount: number, taxRate: number): number {
  return amount + calculateTaxAmount(amount, taxRate);
}

export function initInvoiceEntity(
  dto: Partial<PrismaInvoice> & {
    certificateId: number;
    counterPartyId: number; // TODO: (20250114 - Shirley) DB migration 為了讓功能可以使用的暫時解法，invoice 功能跟 counterParty 相關的資料之後需要一一檢查或修改
    counterPartyInfo: string; // TODO: (20250114 - Shirley) DB migration 為了讓功能可以使用的暫時解法，invoice 功能跟 counterParty 相關的資料之後需要一一檢查或修改
    inputOrOutput: InvoiceTransactionDirection;
    date: number;
    no: string;
    currencyAlias: CurrencyType;
    taxType: InvoiceTaxType;
    taxRatio: number;
    priceBeforeTax: number;
    taxPrice: number;
    totalPrice: number;
    type: InvoiceType;
    deductible: boolean;
    counterParty?: ICounterPartyEntity;
  }
): IInvoiceEntity {
  const nowInSecond = getTimestampNow();

  const invoiceEntity: IInvoiceEntity = {
    id: dto.id ?? 0,
    certificateId: dto.certificateId,
    counterPartyId: dto.counterPartyId, // TODO: (20250114 - Shirley) DB migration 為了讓功能可以使用的暫時解法，invoice 功能跟 counterParty 相關的資料之後需要一一檢查或修改
    counterPartyInfo: dto.counterPartyInfo, // TODO: (20250114 - Shirley) DB migration 為了讓功能可以使用的暫時解法，invoice 功能跟 counterParty 相關的資料之後需要一一檢查或修改
    inputOrOutput: dto.inputOrOutput,
    date: dto.date,
    no: dto.no,
    currencyAlias: dto.currencyAlias,
    priceBeforeTax: dto.priceBeforeTax,
    taxType: dto.taxType,
    taxRatio: dto.taxRatio,
    taxPrice: dto.taxPrice,
    totalPrice: dto.totalPrice,
    type: dto.type,
    deductible: dto.deductible,
    createdAt: dto?.createdAt || nowInSecond,
    updatedAt: dto?.updatedAt || nowInSecond,
    deletedAt: dto?.deletedAt || null,
    counterParty: dto.counterParty,
  };

  return invoiceEntity;
}

export interface ITeamInvoice {
  id?: number;
  teamOrderId: number;
  teamPaymentTansactionId: number;
  invoiceCode: string;
  price: number;
  tax: number;
  total: number;
  currency: CurrencyType;
  payerId?: string;
  payerName?: string;
  payerEmail?: string;
  payerAddress?: string;
  payerPhone?: string;
  status: string;
  issuedAt: number;
  createdAt: number;
}

export interface ITeamInvoiceDetail {
  id?: number;
  teamOrder: ITeamOrder;
  teamPaymentTransaction: ITeamPaymentTransaction;
  invoiceCode: string;
  price: number;
  tax: number;
  total: number;
  currency: CurrencyType;
  payerId?: string;
  payerName?: string;
  payerEmail?: string;
  payerAddress?: string;
  payerPhone?: string;
  status: string;
  issuedAt: number;
  createdAt: number;
}
