// model AssociateLineItem {
//   id                 Int     @id @default(autoincrement())
//   associateVoucherId Int     @map("accociate_voucher_id")
//   originalLineItemId Int     @map("original_line_item_id")
//   resultLineItemId   Int     @map("result_line_item_id")
//   debit              Boolean
//   amount             Int
//   createdAt          Int     @map("created_at")
//   updatedAt          Int     @map("updated_at")
//   deletedAt          Int?    @map("deleted_at")

import type { IAssociateVoucherEntity } from '@/interfaces/associate_voucher';
import type { ILineItemEntity } from '@/interfaces/line_item';

export interface IAssociateLineItemEntity {
  id: number;
  associateVoucherId: number;
  originalLineItemId: number;
  resultLineItemId: number;
  debit: boolean;
  amount: string;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
  associateVoucher?: IAssociateVoucherEntity;
  originalLineItem?: ILineItemEntity;
  resultLineItem?: ILineItemEntity;
}
