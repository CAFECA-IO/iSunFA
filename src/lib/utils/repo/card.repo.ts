import { PAYMENT_METHOD_TYPE } from '@/constants/payment';
import { IPaymentMethod } from '@/interfaces/payment';
import { TPlanType } from '@/interfaces/subscription';
import { z } from 'zod';

// Info: (20250218 - tzuhan) 綁卡 API 請求
export const BindCardQuerySchema = z.object({
  userId: z.number(),
});

/**
 * Info: (20250218 - tzuhan)
 * 綁卡請求 Schema
 */
export const BindCardBodySchema = z.object({
  type: z.enum(Object.keys(PAYMENT_METHOD_TYPE) as [string, ...string[]]),
  number: z.string().min(13).max(19), // Info: (20250218 - tzuhan) 信用卡號應該介於 13-19 位數
  expirationDate: z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/), // Info: (20250218 - tzuhan) 格式 MM/YY
  cvv: z.string().length(3), // Info: (20250218 - tzuhan) CVV 應該是 3 碼
  default: z.boolean(), // Info: (20250218 - tzuhan) 是否設為預設卡
});

// Info: (20250218 - tzuhan) 付款 API 請求
export const PaymentSchema = z.object({
  id: z.number(),
});

/**
 * Info: (20250218 - tzuhan)
 * 信用卡資訊
 */
export const PaymentMethodSchema = z.object({
  id: z.number(),
  type: z.enum(Object.keys(PAYMENT_METHOD_TYPE) as [string, ...string[]]),
  number: z.string(),
  expirationDate: z.string(),
  cvv: z.string(),
  default: z.boolean(),
});

/**
 * Info: (20250218 - tzuhan)
 * 付款資訊 Schema
 */
export const PayerSchema = z.object({
  name: z.string(),
  address: z.string(),
  phone: z.string(),
  taxId: z.string(),
});

export const PayeeSchema = z.object({
  name: z.string(),
  address: z.string(),
  phone: z.string(),
  taxId: z.string(),
});

export const TeamInvoiceSchema = z.object({
  id: z.number(),
  teamId: z.number(),
  status: z.boolean(),
  issuedTimestamp: z.number(),
  dueTimestamp: z.number(),
  planId: z.enum(Object.keys(TPlanType) as [string, ...string[]]),
  planStartTimestamp: z.number(),
  planEndTimestamp: z.number(),
  planQuantity: z.number(),
  planUnitPrice: z.number(),
  planAmount: z.number(),
  payer: PayerSchema,
  payee: PayeeSchema,
  subtotal: z.number(),
  tax: z.number(),
  total: z.number(),
  amountDue: z.number(),
});

// Info: (20250218 - tzuhan) Mock 信用卡資料
export const mockCards: Record<number, IPaymentMethod> = {
  1001: {
    id: 1,
    type: PAYMENT_METHOD_TYPE.MASTER,
    number: '**** **** **** 1234',
    expirationDate: '12/25',
    cvv: '123',
    default: true,
  },
};
