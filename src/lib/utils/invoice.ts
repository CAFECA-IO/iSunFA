import { IInvoiceEntity } from '@/interfaces/invoice';
import { Invoice as PrismaInvoice } from '@prisma/client';
import { InvoiceTaxType, InvoiceTransactionDirection, InvoiceType } from '@/constants/invoice';
import { ICounterPartyEntity } from '@/interfaces/counterparty';
import { CurrencyType } from '@/constants/currency';
import { getTimestampNow } from './common';

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
    counterPartyId: number;
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
    counterPartyId: dto.counterPartyId,
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
