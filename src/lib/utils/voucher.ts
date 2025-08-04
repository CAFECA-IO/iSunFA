import { IVoucherDataForSavingToDB, IVoucherEntity } from '@/interfaces/voucher';
import { EventType } from '@/constants/account';
import { JOURNAL_EVENT } from '@/constants/journal';
import { Voucher as PrismaVoucher } from '@prisma/client';
import { getTimestampNow } from '@/lib/utils/common';
import type { IEventEntity } from '@/interfaces/event';
import type { ILineItemEntity } from '@/interfaces/line_item';
import type { ICertificateEntity } from '@/interfaces/certificate';
import type { IUserEntity } from '@/interfaces/user';
import { IAssetEntity } from '@/interfaces/asset';

/**
 * Info: (20241023 - Murky)
 * @note Used to create a new voucher entity directly from scratch,
 * @note please use parsePrismaVoucherToVoucherEntity instead to convert PrismaVoucher to VoucherEntity
 */
export function initVoucherEntity(
  dto: Partial<PrismaVoucher> & {
    issuerId: number;
    counterPartyId: number | null;
    accountBookId: number;
    status: JOURNAL_EVENT;
    editable: boolean;
    no: string;
    date: number;
    type: EventType;
    originalEvents?: IEventEntity[];
    resultEvents?: IEventEntity[];
    lineItems?: ILineItemEntity[];
    aiResultId?: string;
    aiStatus?: string;
    certificates?: ICertificateEntity[];
    issuer?: IUserEntity;
    asset?: IAssetEntity[];
  }
): IVoucherEntity {
  const nowInSecond = getTimestampNow();
  const voucherEntity: IVoucherEntity = {
    id: dto.id || 0,
    issuerId: dto.issuerId,
    counterPartyId: dto.counterPartyId,
    accountBookId: dto.accountBookId,
    status: dto.status,
    editable: dto.editable,
    no: dto.no,
    date: dto.date,
    type: dto.type,
    note: dto.note || null,
    aiResultId: dto.aiResultId,
    // aiStatus: dto.aiStatus,
    createdAt: dto.createdAt || nowInSecond,
    updatedAt: dto.updatedAt || nowInSecond,
    deletedAt: dto.deletedAt || null,
    originalEvents: dto.originalEvents || [],
    resultEvents: dto.resultEvents || [],
    lineItems: dto.lineItems || [],
    certificates: dto.certificates || [],
    issuer: dto.issuer,

    asset: dto.asset || [],
  };
  return voucherEntity;
}

export function isVoucherAmountGreaterOrEqualThenPaymentAmount(
  voucher: IVoucherDataForSavingToDB,
  price: number
): boolean {
  let debitAmount = 0;
  let creditAmount = 0;

  voucher.lineItems.forEach((lineItem) => {
    if (lineItem.debit) {
      debitAmount += lineItem.amount;
    } else {
      creditAmount += lineItem.amount;
    }
  });

  const isDebitCreditEqual = debitAmount === creditAmount;
  const isDebitCreditGreaterOrEqualPaymentAmount = debitAmount >= price && creditAmount >= price;

  return isDebitCreditEqual && isDebitCreditGreaterOrEqualPaymentAmount;
}
