import prisma from '@/client';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { ITeamSubscription } from '@/interfaces/payment';
import { getTimestampNow } from '@/lib/utils/common';
import { ITeamInvoice, IUserOwnedTeam, TPaymentStatus, TPlanType } from '@/interfaces/subscription';
import { TeamPlanType } from '@prisma/client';
import { LeaveStatus, TeamRole } from '@/interfaces/team';
import { SortBy, SortOrder } from '@/constants/sort';
import { IPaginatedOptions } from '@/interfaces/pagination';

export const createTeamSubscription = async (
  options: ITeamSubscription
): Promise<ITeamSubscription> => {
  const data = {
    teamId: options.teamId,
    planType: options.planType as TeamPlanType,
    startDate: options.startDate,
    expiredDate: options.expiredDate,
    createdAt: options.createdAt,
    updatedAt: options.updatedAt,
  };
  const teamSubscription: ITeamSubscription = (await prisma.teamSubscription.create({
    data,
  })) as ITeamSubscription;

  if (!teamSubscription) {
    throw new Error(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
  }

  return teamSubscription;
};

export const listValidTeamSubscription = async (teamId: number): Promise<ITeamSubscription[]> => {
  const nowInSecond = getTimestampNow();
  const teamSubscriptions: ITeamSubscription[] = (
    await prisma.teamSubscription.findMany({
      where: {
        teamId,
        startDate: {
          lte: nowInSecond,
        },
        expiredDate: {
          gt: nowInSecond,
        },
      },
      include: {
        plan: true,
      },
    })
  ).map((item) => ({
    ...item,
    enableAutoRenewal: true,
  })) as ITeamSubscription[];

  return teamSubscriptions;
};

export async function listTeamSubscription(
  userId: number,
  page = 1,
  pageSize = 20
): Promise<IPaginatedOptions<IUserOwnedTeam[]>> {
  // Info: (20250401 - Tzuhan) 1. 找到 user 為 OWNER 的 teamId 列表
  const ownerTeams = await prisma.teamMember.findMany({
    where: {
      userId,
      role: TeamRole.OWNER,
      status: LeaveStatus.IN_TEAM,
    },
    select: {
      teamId: true,
      team: {
        select: {
          id: true,
          name: true,
          subscriptions: {
            orderBy: { createdAt: SortOrder.DESC },
            take: 1,
            include: {
              plan: true,
            },
          },
          TeamOrder: {
            orderBy: { createdAt: SortOrder.DESC },
            take: 1,
            include: {
              TeamPaymentTransaction: {
                include: {
                  TeamInvoice: true,
                },
              },
            },
          },
        },
      },
    },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  // Info: (20250401 - Tzuhan) 2. 計算總數
  const totalCount = await prisma.teamMember.count({
    where: {
      userId,
      role: TeamRole.OWNER,
      status: LeaveStatus.IN_TEAM,
    },
  });

  const data: IUserOwnedTeam[] = ownerTeams.map(({ team }) => {
    const latestSub = team.subscriptions[0];
    const latestOrder = team.TeamOrder[0];
    const latestTxn = latestOrder?.TeamPaymentTransaction[0];
    const hasInvoice = latestTxn?.TeamInvoice?.length > 0;

    let paymentStatus: TPaymentStatus = TPaymentStatus.FREE;
    if (latestSub) {
      if (!latestTxn) {
        paymentStatus = TPaymentStatus.TRIAL;
      } else {
        paymentStatus = hasInvoice ? TPaymentStatus.PAID : TPaymentStatus.PAYMENT_FAILED;
      }
    }
    if (latestOrder?.status === 'CANCELED') {
      paymentStatus = TPaymentStatus.PAYMENT_FAILED;
    }

    return {
      id: team.id,
      name: team.name,
      plan: (latestSub?.planType as TPlanType) || TPlanType.BEGINNER,
      enableAutoRenewal: true, // Info: (20250401 - Tzuhan) 目前不支援修改自動續約
      expiredTimestamp: latestSub?.expiredDate ?? 0,
      nextRenewalTimestamp: latestSub?.expiredDate ?? 0,
      paymentStatus,
    };
  });

  return {
    data,
    page,
    totalPages: Math.ceil(totalCount / pageSize),
    totalCount,
    pageSize,
    sort: [{ sortBy: SortBy.CREATED_AT, sortOrder: SortOrder.DESC }],
  };
}

export async function listTeamInvoice(userId: number): Promise<ITeamInvoice[]> {
  const ownerTeams = await prisma.teamMember.findMany({
    where: {
      userId,
      role: TeamRole.OWNER,
      status: LeaveStatus.IN_TEAM,
    },
    select: {
      teamId: true,
    },
  });

  const teamIds = ownerTeams.map((m) => m.teamId);

  const invoices = await prisma.teamInvoice.findMany({
    where: {
      teamOrder: {
        teamId: { in: teamIds },
      },
    },
    include: {
      teamOrder: {
        include: {
          orderDetails: true,
        },
      },
    },
  });

  return invoices.map((invoice) => {
    const detail = invoice.teamOrder.orderDetails[0]; // Info: (20250401 - Tzuhan) 假設每張發票對應一項訂閱產品
    return {
      id: invoice.id,
      teamId: invoice.teamOrder.teamId,
      status: invoice.status === 'SUCCESS', // Info: (20250401 - Tzuhan) 目前不確定 DB 發票狀態的定義（schema 上是 string），這邊假設是 'SUCCESS' 代表付款成功
      issuedTimestamp: invoice.issuedAt,
      dueTimestamp: invoice.issuedAt, // Info: (20250401 - Tzuhan) 根據我們定義的邏輯為開立日
      planId: detail?.productName as TPlanType,
      planStartTimestamp: 0, // Info: (20250401 - Tzuhan) 如果資料中有開始時間，可補上
      planEndTimestamp: 0, // Info: (20250401 - Tzuhan) 如果資料中有結束時間，可補上
      planQuantity: detail?.quantity ?? 1,
      planUnitPrice: detail?.unitPrice ?? 0,
      planAmount: detail?.amount ?? 0,
      payer: {
        name: invoice.payerName ?? '',
        address: invoice.payerAddress ?? '',
        phone: invoice.payerPhone ?? '',
        taxId: invoice.payerId ?? '',
      },
      payee: {
        name: 'ISunFa Co., Ltd.', // Info: (20250401 - Tzuhan) 這個要在跟 Luphia 確認
        address: 'Taipei, Taiwan',
        phone: '+886-2-12345678',
        taxId: '12345678',
      },
      subtotal: invoice.price,
      tax: invoice.tax,
      total: invoice.total,
      amountDue: invoice.total, // Info: (20250401 - Tzuhan) 目前無付款紀錄可扣除，可調整
    };
  });
}
