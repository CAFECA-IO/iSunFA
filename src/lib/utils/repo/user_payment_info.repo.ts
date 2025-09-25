import prisma from '@/client';
import { Prisma, PrismaClient } from '@prisma/client';
import { PAYMENT_METHOD_TYPE } from '@/constants/payment';
import { IPaymentInfo, IPaymentMethod } from '@/interfaces/payment';
import { TPlanType } from '@/interfaces/subscription';
import { z } from 'zod';
import { getTimestampNow } from '@/lib/utils/common';
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
  userId: z.string().transform((val) => parseInt(val, 10)),
  paymentMethodId: z.string().transform((val) => parseInt(val, 10)),
});

export const PaymentBodySchema = z.object({
  teamPlanType: z.nativeEnum(TPlanType),
  teamId: z.number(),
  referralCode: z.string().optional(),
});

// Info: (20250218 - tzuhan) 已綁定信用卡資訊，具備 user_payment_info id
export const PaymentMethodSchema = z.object({
  id: z.number(),
  type: z.nativeEnum(PAYMENT_METHOD_TYPE),
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
  planId: z.nativeEnum(TPlanType),
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

// Info: (20250326 - Luphia) 取得用戶支付方法
export const getUserPaymentInfoById = async (
  id: number,
  tx: Prisma.TransactionClient | PrismaClient = prisma
): Promise<IPaymentInfo | null> => {
  let paymentInfo: IPaymentInfo | null = null;
  const query = {
    where: {
      id,
      deletedAt: null,
    },
  };
  const result = await tx.userPaymentInfo.findFirst(query);
  if (result) {
    paymentInfo = {
      id: result.id,
      userId: result.userId,
      token: result.token,
      transactionId: result.transactionId,
      default: result.default,
      detail: result.detail as unknown as IPaymentMethod,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };
  }
  return paymentInfo;
};

// Info: (20250319 - Luphia) 列出用戶完整支付方法
export const listUserPaymentInfo = async (
  userId: number,
  tx: Prisma.TransactionClient | PrismaClient = prisma
): Promise<IPaymentInfo[]> => {
  if (!userId) return [];
  const query = {
    where: {
      userId,
      deletedAt: null,
    },
    orderBy: {
      default: Prisma.SortOrder.desc,
    },
  };
  const result = await tx.userPaymentInfo.findMany(query);
  if (!result) return [];
  // Info: (20250319 - Luphia) 轉換回傳資訊為 IPaymentMethod，number 只保留末四碼，其餘轉換為 *，cvv 也轉換為 *
  const paymentInfoList: IPaymentInfo[] = result.map((item) => {
    const { detail } = item as unknown as IPaymentInfo;
    const paymentMethod: IPaymentMethod = {
      id: item.id,
      type: detail.type,
      number: `${DefaultValue.PAYMENT_METHOD_NUMBER.slice(0, -4)} ${detail.number.slice(-4)}`,
      expirationDate: detail.expirationDate,
      cvv: DefaultValue.PAYMENT_METHOD_CVV,
      default: item.default,
    };
    // Info: (20250319 - Luphia) 轉換回傳資訊為 IUserPaymentInfo
    const paymentInfo: IPaymentInfo = {
      id: item.id,
      userId: item.userId,
      token: item.token,
      transactionId: item.transactionId,
      default: item.default,
      detail: paymentMethod,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
    return paymentInfo;
  });
  return paymentInfoList;
};

// Info: (20250319 - Luphia) 列出用戶支付方法摘要資訊
export const listUserPaymentMethod = async (
  userId: number,
  tx: Prisma.TransactionClient | PrismaClient = prisma
): Promise<IPaymentMethod[]> => {
  const paymentInfoList = await listUserPaymentInfo(userId, tx);
  const paymentMethodList: IPaymentMethod[] = paymentInfoList.map((item) => item.detail);
  return paymentMethodList;
};

// Info: (20250418 - Luphia) 將用戶原有支付方法改為非預設
export const unsetDefaultUserPaymentMethod = async (
  userId: number,
  tx: Prisma.TransactionClient | PrismaClient = prisma
): Promise<void> => {
  if (!userId) return;
  const query = {
    where: {
      userId,
      default: true,
    },
    data: {
      default: false,
    },
  };
  await tx.userPaymentInfo.updateMany(query);
};

export const createUserPaymentInfo = async (
  userPaymentInfo: IPaymentInfo,
  tx: Prisma.TransactionClient | PrismaClient = prisma
): Promise<IPaymentInfo> => {
  const nowInSecond = getTimestampNow();
  const { userId } = userPaymentInfo;
  const { detail } = userPaymentInfo;
  const paymentMethod = {
    type: detail.type || PAYMENT_METHOD_TYPE.OTHER,
    number: detail.number || DefaultValue.PAYMENT_METHOD_NUMBER,
    expirationDate: detail.expirationDate || DefaultValue.PAYMENT_METHOD_EXPIRATION_DATE,
    cvv: detail.cvv || DefaultValue.PAYMENT_METHOD_CVV,
  };
  const newPaymentInfo = {
    userId,
    token: userPaymentInfo.token,
    transactionId: userPaymentInfo.transactionId,
    default: userPaymentInfo.default,
    detail: paymentMethod,
    createdAt: userPaymentInfo.createdAt || nowInSecond,
    updatedAt: nowInSecond,
  };
  const paymentInfo = await tx.userPaymentInfo.create({
    data: newPaymentInfo,
  });
  if (!paymentInfo) {
    throw new Error(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
  }
  const result: IPaymentInfo = {
    id: paymentInfo.id,
    userId: paymentInfo.userId,
    token: paymentInfo.token,
    transactionId: paymentInfo.transactionId,
    default: paymentInfo.default,
    detail: paymentMethod,
    createdAt: paymentInfo.createdAt,
    updatedAt: paymentInfo.updatedAt,
  };
  return result;
};

export const createDefaultUserPaymentInfo = async (
  userPaymentInfo: IPaymentInfo,
  tx: Prisma.TransactionClient | PrismaClient = prisma
): Promise<IPaymentInfo> => {
  let result: IPaymentInfo | null = null;
  const { userId } = userPaymentInfo;
  try {
    // Info: (20250319 - Luphia) 把該 user 其他卡改成非 default
    if (userPaymentInfo.default) {
      await unsetDefaultUserPaymentMethod(userId, tx);
    }
    // Info: (20250319 - Luphia) 建立 userPaymentInfo
    const paymentInfo = await createUserPaymentInfo(userPaymentInfo, tx);
    result = paymentInfo;
  } catch (error) {
    loggerError({
      userId,
      errorType: STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR,
      errorMessage: error as Error,
    });
    throw new Error(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
  }

  return result;
};
