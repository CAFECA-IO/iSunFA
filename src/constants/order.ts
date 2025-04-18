import { TPlanType } from '@/interfaces/subscription';

export enum ORDER_STATUS {
  PENDING = 'PENDING',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
  FAILED = 'FAILED',
}

export enum ORDER_UNIT {
  MONTH = 'MONTH',
  YEAR = 'TEAR',
}

export const EXTRA_MEMBBER = 'EXTRA_MEMBER';

export const PRODUCT_ID = {
  [TPlanType.BEGINNER]: 1,
  [TPlanType.PROFESSIONAL]: 2,
  [TPlanType.ENTERPRISE]: 3,
  [TPlanType.TRIAL]: 4,
  EXTRA_MEMBER: 9,
};
