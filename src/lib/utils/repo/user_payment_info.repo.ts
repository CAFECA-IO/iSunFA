import prisma from '@/client';
import { PAYMENT_METHOD_TYPE } from '@/constants/payment';
import { IPaymentInfo, IPaymentMethod } from '@/interfaces/payment';
import { ITeamInvoice, TPlanType } from '@/interfaces/subscription';
import { z } from 'zod';
import { getTimestampNow } from '@/lib/utils/common';
import { Prisma } from '@prisma/client';
import { loggerError } from '@/lib/utils/logger_back';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { DefaultValue } from '@/constants/default_value';

// Info: (20250218 - tzuhan) 綁卡 API 請求
export const BindCardQuerySchema = z.object({
  userId: z.number(),
});

// Info: (20250218 - tzuhan) 綁定信用卡資訊
export const BindCardBodySchema = z.object({
  type: z.nativeEnum(PAYMENT_METHOD_TYPE), // Info: (20250218 - tzuhan) 信用卡類型
  number: z.string().min(13).max(19), // Info: (20250218 - tzuhan) 信用卡號應該介於 13-19 位數
  expirationDate: z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/), // Info: (20250218 - tzuhan) 格式 MM/YY
  cvv: z.string().length(3), // Info: (20250218 - tzuhan) CVV 應該是 3 碼
  default: z.boolean(), // Info: (20250218 - tzuhan) 是否設為預設卡
});

// Info: (20250218 - tzuhan) 付款 API 請求
export const PaymentQuerySchema = z.object({
  userId: z.number(),
});

export const PaymentBodySchema = z.object({
  planId: z.nativeEnum(TPlanType),
});

// Info: (20250218 - tzuhan) 已綁定信用卡資訊，具備 user_payment_info id
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

// Info: (20250319 - Luphia) 取得用戶支付資訊
export const getDefaultUserPaymentInfo: (userId: number) => Promise<IPaymentInfo | null> = async (
  userId: number
) => {
  if (!userId) return null;
  const result = await prisma.userPaymentInfo.findFirst({
    where: {
      userId,
      default: true,
      deletedAt: null,
    },
  });
  if (!result) return null;
  // Info: (20250319 - Luphia) 轉換回傳資訊為 IPaymentMethod，number 只保留末四碼，其餘轉換為 *，cvv 也轉換為 *
  const { info } = result as unknown as { info: IPaymentMethod };
  const paymentMethod: IPaymentMethod = {
    id: result.id,
    type: info.type,
    number: `${DefaultValue.PAYMENT_METHOD_NUMBER.slice(0, -4)} ${info.number.slice(-4)}`,
    expirationDate: info.expirationDate,
    cvv: DefaultValue.PAYMENT_METHOD_CVV,
    default: result.default,
  };
  // Info: (20250319 - Luphia) 轉換回傳資訊為 IUserPaymentInfo
  const paymentInfo: IPaymentInfo = {
    id: result?.id,
    userId: result?.userId,
    token: result?.token,
    transactionId: result?.transactionId,
    default: result?.default,
    detail: paymentMethod,
    createdAt: result?.createdAt,
    updatedAt: result?.updatedAt,
  };
  return paymentInfo;
};

export const createDefaultUserPaymentInfo: (
  userPaymentInfo: IPaymentInfo
) => Promise<IPaymentInfo> = async (userPaymentInfo: IPaymentInfo) => {
  const nowInSecond = getTimestampNow();
  const { userId } = userPaymentInfo;
  const { detail } = userPaymentInfo;
  const paymentMethod: IPaymentMethod = {
    type: detail.type || PAYMENT_METHOD_TYPE.OTHER,
    number: detail.number || DefaultValue.PAYMENT_METHOD_NUMBER,
    expirationDate: detail.expirationDate || DefaultValue.PAYMENT_METHOD_EXPIRATION_DATE,
    cvv: detail.cvv || DefaultValue.PAYMENT_METHOD_CVV,
  };
  // Info: (20250319 - Luphia) **check the data format carefully**
  const newPaymentInfo: IPaymentInfo = {
    userId,
    token: userPaymentInfo.token,
    transactionId: userPaymentInfo.transactionId,
    default: true,
    detail: paymentMethod,
    createdAt: userPaymentInfo.createdAt || nowInSecond,
    updatedAt: nowInSecond,
  };
  const result = await prisma
    .$transaction(async (tx) => {
      const input = newPaymentInfo as unknown as Prisma.UserPaymentInfoCreateInput;
      // Info: (20250319 - Luphia) 確認 User 是否存在
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });
      if (!user) {
        throw new Error('User not found');
      }

      // Info: (20250319 - Luphia) 把該 user 其他卡改成非 default
      if (input.default) {
        await tx.userPaymentInfo.updateMany({
          where: {
            userId,
            default: true,
          },
          data: { default: false },
        });
      }

      // Info: (20250319 - Luphia) 建立 userPaymentInfo
      const paymentInfo = await tx.userPaymentInfo.create({
        data: input,
      });

      return paymentInfo;
    })
    .catch((error: Prisma.PrismaClientKnownRequestError | Error) => {
      loggerError({
        userId,
        errorType: 'Create invoice in createInvoice failed',
        errorMessage: error as Error,
      });
      throw new Error(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
    });

  return result as unknown as IPaymentInfo;
};

// Info: (20250218 - tzuhan) Mock 方案價格
export const planPrices: Record<string, number> = {
  beginner: 0,
  professional: 899,
  enterprise: 8990,
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
};
