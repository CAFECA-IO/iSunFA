import prisma from '@/client';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { ITeamSubscription } from '@/interfaces/payment';
import { getTimestampNow } from '@/lib/utils/common';
import { ITeamInvoice, IUserOwnedTeam, TPaymentStatus, TPlanType } from '@/interfaces/subscription';
import { TeamPlanType } from '@prisma/client';
import { LeaveStatus, TeamRole } from '@/interfaces/team';
import { SortBy, SortOrder } from '@/constants/sort';
import { IPaginatedOptions } from '@/interfaces/pagination';
import { updateTeamMemberSession } from '@/lib/utils/session';
import { assertUserIsTeamMember } from '@/lib/utils/repo/team.repo';

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

export const updateTeamSubscription = async (
  options: ITeamSubscription
): Promise<ITeamSubscription> => {
  const data = {
    planType: options.planType as TeamPlanType,
    startDate: options.startDate,
    expiredDate: options.expiredDate,
    updatedAt: options.updatedAt,
  };
  const teamSubscription: ITeamSubscription = (await prisma.teamSubscription.update({
    where: { id: options.id },
    data,
  })) as ITeamSubscription;
  if (!teamSubscription) {
    throw new Error(STATUS_MESSAGE.DATABASE_UPDATE_FAILED_ERROR);
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

export async function listTeamTransaction(
  userId: number,
  page: number = 1,
  pageSize: number = 10
): Promise<IPaginatedOptions<ITeamInvoice[]>> {
  const skip = (page - 1) * pageSize;
  const take = pageSize;

  const teamMembers = await prisma.teamMember.findMany({
    where: {
      userId,
      role: TeamRole.OWNER,
      status: LeaveStatus.IN_TEAM,
    },
    select: {
      teamId: true,
      team: {
        select: {
          subscriptions: {
            orderBy: { expiredDate: SortOrder.DESC },
            take: 1,
          },
          TeamOrder: {
            select: {
              id: true,
              teamId: true,
              orderDetails: true,
              TeamPaymentTransaction: {
                include: {
                  TeamInvoice: true,
                  userPaymentInfo: {
                    select: {
                      user: {
                        select: {
                          name: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    skip,
    take,
  });

  const invoices: ITeamInvoice[] = [];

  teamMembers.forEach(({ teamId, team }) => {
    const subscription = team.subscriptions?.[0];
    const planStartTimestamp = subscription?.startDate ?? 0;
    const planEndTimestamp = subscription?.expiredDate ?? 0;

    team.TeamOrder.forEach((order) => {
      const transaction = order.TeamPaymentTransaction?.[0];
      const invoice = transaction?.TeamInvoice?.[0];
      const detail = order.orderDetails?.[0];

      if (!transaction || !detail) return;

      invoices.push({
        id: invoice?.id ?? transaction.id,
        teamId,
        status: invoice?.status === 'SUCCESS', // Info: (20250401 - Tzuhan) 目前不確定 DB 發票狀態的定義（schema 上是 string），這邊假設是 'SUCCESS' 代表付款成功
        issuedTimestamp: invoice?.issuedAt ?? transaction.createdAt,
        dueTimestamp: invoice?.issuedAt ?? transaction.createdAt,

        planId: detail.productName as TPlanType,
        planStartTimestamp,
        planEndTimestamp,
        planQuantity: detail.quantity ?? 1,
        planUnitPrice: detail.unitPrice ?? 0,
        planAmount: detail.amount ?? 0,

        payer: {
          name: invoice?.payerName ?? transaction.userPaymentInfo?.user?.name ?? '—',
          address: invoice?.payerAddress ?? '—',
          phone: invoice?.payerPhone ?? '—',
          taxId: invoice?.payerId ?? '—',
        },
        payee: {
          name: 'iSunFa Inc.', // Info: (20250401 - Tzuhan) 這個要在跟 Luphia 確認
          address: 'Taipei, Taiwan',
          phone: '+886-2-12345678',
          taxId: '12345678',
        },

        subtotal: invoice?.price ?? detail.amount ?? 0,
        tax: invoice?.tax ?? 0,
        total: invoice?.total ?? detail.amount ?? 0,
        amountDue: invoice?.total ?? detail.amount ?? 0,
      });
    });
  });

  const totalCount = await prisma.teamMember.count({
    where: {
      userId,
      role: 'OWNER',
      status: 'IN_TEAM',
    },
  });

  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    data: invoices,
    page,
    totalPages,
    totalCount,
    pageSize,
  };
}

export async function getTeamInvoiceById(invoiceId: number): Promise<ITeamInvoice | null> {
  const invoice = await prisma.teamInvoice.findUnique({
    where: { id: invoiceId },
    include: {
      teamPaymentTransaction: {
        include: {
          teamOrder: {
            include: {
              orderDetails: true,
            },
          },
          userPaymentInfo: {
            select: {
              user: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!invoice) return null;

  return {
    id: invoice.id,
    teamId: invoice.teamPaymentTransaction.teamOrder.teamId,
    status: invoice.status === 'SUCCESS',
    issuedTimestamp: invoice.issuedAt,
    dueTimestamp: invoice?.issuedAt,

    planId: invoice.teamPaymentTransaction.teamOrder.orderDetails[0].productName as TPlanType,
    planStartTimestamp: invoice.teamPaymentTransaction.teamOrder.createdAt,
    planEndTimestamp: invoice.teamPaymentTransaction.teamOrder.createdAt,
    planQuantity: invoice.teamPaymentTransaction.teamOrder.orderDetails[0].quantity ?? 1,
    planUnitPrice: invoice.teamPaymentTransaction.teamOrder.orderDetails[0].unitPrice ?? 0,
    planAmount: invoice.teamPaymentTransaction.teamOrder.orderDetails[0].amount ?? 0,

    payer: {
      name: invoice.payerName ?? '—',
      address: invoice.payerAddress ?? '—',
      phone: invoice.payerPhone ?? '—',
      taxId: invoice.payerId ?? '—',
    },
    payee: {
      name: 'iSunFa Inc.', // Info: (20250401 - Tzuhan) 這個要在跟 Luphia 確認
      address: 'Taipei, Taiwan',
      phone: '+886-2-12345678',
      taxId: '12345678',
    },

    subtotal: invoice.price ?? 0,
    tax: invoice.tax ?? 0,
    total: invoice.total ?? 0,
    amountDue: invoice.total ?? 0,
  };
}

export async function getSubscriptionByTeamId(
  userId: number,
  teamId: number
): Promise<IUserOwnedTeam | null> {
  // Info: (20250410 - tzuhan) Step 1: 確認該用戶是團隊成員（任何角色都可以）
  const role = await assertUserIsTeamMember(userId, teamId);

  // Info: (20250410 - tzuhan) Step 2: 強化 session 資料一致性
  await updateTeamMemberSession(userId, teamId, role.effectiveRole);

  // Info: (20250410 - tzuhan) Step 3: 查詢訂閱資料
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: {
      id: true,
      name: true,
      subscriptions: {
        orderBy: { createdAt: SortOrder.DESC },
        take: 1,
        include: { plan: true },
      },
      TeamOrder: {
        orderBy: { createdAt: SortOrder.DESC },
        take: 1,
        include: {
          TeamPaymentTransaction: {
            include: { TeamInvoice: true },
          },
        },
      },
    },
  });

  if (!team) return null;

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
    enableAutoRenewal: true,
    expiredTimestamp: latestSub?.expiredDate ?? 0,
    nextRenewalTimestamp: latestSub?.expiredDate ?? 0,
    paymentStatus,
  };
}
