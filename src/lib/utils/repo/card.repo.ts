import { PAYMENT_METHOD_TYPE } from '@/constants/payment';
import { IPaymentMethod } from '@/interfaces/payment';
import { ITeamInvoice, TPlanType } from '@/interfaces/subscription';
import prisma from '@/client';
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

export const PaymentBodySchema = z.object({
  planId: z.enum(Object.keys(TPlanType) as [string, ...string[]]),
});

export const planPrices: Record<string, number> = {
  beginner: 0,
  professional: 899,
  enterprise: 8990,
};

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

// Info: (20250312 - Luphia) 根據 userId 取得用戶的信用卡資訊，若無則回傳 null
export const getCardByUserId = async (userId: number) => {
  const paymentInfo = await prisma.userPaymentInfo.findFirst({
    where: { userId, default: true, deletedAt: null },
  });
  return paymentInfo;
};

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
  10000000: {
    id: 1,
    type: PAYMENT_METHOD_TYPE.MASTER,
    number: '**** **** **** 1234',
    expirationDate: '12/25',
    cvv: '123',
    default: true,
  },
};

export const mockInvoices: Record<number, ITeamInvoice> = {
  1001: {
    id: 100000,
    teamId: 3,
    status: false,
    issuedTimestamp: 1630406400000,
    dueTimestamp: 1630406400000,
    planId: TPlanType.PROFESSIONAL,
    planStartTimestamp: 1630406400000,
    planEndTimestamp: 1630406400000,
    planQuantity: 1,
    planUnitPrice: 1000,
    planAmount: 1000,
    payer: {
      name: 'John Doe',
      address: '1234 Main St',
      phone: '123-456-7890',
      taxId: '123456789',
    },
    payee: {
      name: 'Jane Doe',
      address: '5678 Elm St',
      phone: '098-765-4321',
      taxId: '987654321',
    },
    subtotal: 899,
    tax: 0,
    total: 899,
    amountDue: 899,
  },
  10000000: {
    id: 100000,
    teamId: 3,
    status: false,
    issuedTimestamp: 1630406400000,
    dueTimestamp: 1630406400000,
    planId: TPlanType.PROFESSIONAL,
    planStartTimestamp: 1630406400000,
    planEndTimestamp: 1630406400000,
    planQuantity: 1,
    planUnitPrice: 1000,
    planAmount: 1000,
    payer: {
      name: 'John Doe',
      address: '1234 Main St',
      phone: '123-456-7890',
      taxId: '123456789',
    },
    payee: {
      name: 'Jane Doe',
      address: '5678 Elm St',
      phone: '098-765-4321',
      taxId: '987654321',
    },
    subtotal: 899,
    tax: 0,
    total: 899,
    amountDue: 899,
  },
};
