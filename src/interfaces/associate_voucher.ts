import type { IAssociateLineItemEntity } from '@/interfaces/associate_line_item';
import type { IEventEntity } from '@/interfaces/event';
import type { IVoucherEntity } from '@/interfaces/voucher';

export interface IAssociateVoucherEntity {
  id: number;
  eventId: number;
  originalVoucherId: number;
  resultVoucherId: number;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
  associateLineItems: IAssociateLineItemEntity[];
  event?: IEventEntity;
  originalVoucher?: IVoucherEntity;
  resultVoucher?: IVoucherEntity;
}
