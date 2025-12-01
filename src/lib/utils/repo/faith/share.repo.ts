import prisma from '@/client';
import { IFaithSession } from '@/interfaces/faith';
import { Prisma } from '@prisma/client';
import { getTimestampNow } from '@/lib/utils/common';
import { JSONValue } from '@/interfaces/common';

/**
 * Info: (20251130 - Luphia) 指定 sessionId 建立分享資料
 * 1. 取得所有 content
 * 2. 取得所有 certificate 包含 taxInfo 與 voucherInfo
 * 3. 將所有資料整理為完整的 IFaithSession JSON
 * 4. 根據 IFaithSession JSON 建立分享資料
 */

const createShare = async (sessionId: number): Promise<IFaithSession | undefined> => {
  const sessionData = await prisma.faithSession.findUnique({
    where: { id: sessionId },
    include: {
      contents: true,
      certificates: {
        include: {
          taxInfo: true,
          voucherInfo: {
            include: {
              lineItems: true,
            },
          },
        },
      },
    },
  });
  // Info: (20251130 - Luphia) 沒有找到 sessionData 則不做任何處理
  if (!sessionData) return;

  const nowInSecond = getTimestampNow();
  const session: IFaithSession = {
    id: sessionData.id.toString(),
    title: sessionData.title,
    description: sessionData.description,
    unreadCount: 0, // Info: (20251130 - Luphia) Default value
    createdAt: sessionData.createdAt,
    updatedAt: sessionData.updatedAt,
    contents: sessionData.contents.map((content) => ({
      id: content.id.toString(),
      role: {
        id: content.roleId,
        name: content.roleName,
        image: content.roleImage,
      },
      textContent:
        (content.content as { type: string; content: string }[])?.find((content) => {
          return content.type === 'text';
        })?.content || '',
      content: content.content as JSONValue,
      like: false, // Info: (20251130 - Luphia) Default value
      dislike: false, // Info: (20251130 - Luphia) Default value
      createdAt: content.createdAt,
    })),
    certificates: sessionData.certificates.map((cert) => ({
      id: cert.id.toString(),
      name: cert.name,
      description: cert.description,
      image: cert.image,
      taxInfo: {
        invoiceNo: cert.taxInfo[0]?.invoiceNo || null,
        issueDate: cert.taxInfo[0]?.issueDate || null,
        tradingPartner: {
          name: cert.taxInfo[0]?.tradingPartnerName || null,
          taxId: cert.taxInfo[0]?.tradingPartnerTaxId || null,
        },
        taxType: cert.taxInfo[0]?.taxType || null,
        taxRate: cert.taxInfo[0]?.taxRate || null,
        salesAmount: cert.taxInfo[0]?.salesAmount || null,
        tax: cert.taxInfo[0]?.tax || null,
      },
      voucherInfo: {
        voucherType: cert.voucherInfo[0].voucherType,
        voucherNo: cert.voucherInfo[0].voucherNo,
        issueDate: cert.voucherInfo[0].issueDate,
        description: cert.voucherInfo[0].description,
        lineItems: cert.voucherInfo[0].lineItems.map((item) => ({
          account: {
            name: item.accountName,
            code: item.accountCode,
          },
          description: item.description,
          debit: item.debit,
          amount: item.amount,
        })),
        sum: {
          debit: true, // Info: (20251130 - Luphia) Simplified logic, might need adjustment based on actual requirement
          amount: cert.voucherInfo[0].lineItems.reduce(
            (acc, item) => acc.plus(item.amount),
            new Prisma.Decimal(0)
          ),
        },
      },
    })),
  };

  const result = await prisma.faithShare.create({
    data: {
      faithSessionId: sessionId,
      data: session as unknown as Prisma.InputJsonValue,
      views: 0,
      createdAt: nowInSecond,
      updatedAt: nowInSecond,
    },
  });

  const shareResult: IFaithSession = {
    ...session,
    id: result.id.toString(),
    createdAt: result.createdAt,
    updatedAt: result.updatedAt,
  };

  return shareResult;
};

export { createShare };
