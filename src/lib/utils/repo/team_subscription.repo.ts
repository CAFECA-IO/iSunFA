import prisma from '@/client';
import { Prisma, PrismaClient, TeamPlanType } from '@prisma/client';
import { STATUS_CODE, STATUS_MESSAGE } from '@/constants/status_code';
import { ITeamSubscription } from '@/interfaces/payment';
import { getTimestampNow } from '@/lib/utils/common';
import { ITeamInvoice, IUserOwnedTeam, TPaymentStatus, TPlanType } from '@/interfaces/subscription';
import { LeaveStatus } from '@/interfaces/team';
import { SortBy, SortOrder } from '@/constants/sort';
import { IPaginatedOptions } from '@/interfaces/pagination';
import { updateTeamMemberSession } from '@/lib/utils/session';
import {
  assertUserIsTeamMember,
  assertUserCan,
} from '@/lib/utils/permission/assert_user_team_permission';
import { TeamPermissionAction } from '@/interfaces/permissions';
import { addMonths, getUnixTime } from 'date-fns';
import { ORDER_STATUS } from '@/constants/order';
import { TRANSACTION_STATUS } from '@/constants/transaction';
import { PAYEE } from '@/constants/payment';

export const createTeamSubscription = async (
  options: ITeamSubscription,
  tx: Prisma.TransactionClient | PrismaClient = prisma
): Promise<ITeamSubscription> => {
  const permission = await assertUserCan({
    userId: options.userId,
    teamId: options.teamId,
    action: TeamPermissionAction.MODIFY_SUBSCRIPTION,
  });

  if (!permission.can) {
    const error = new Error(STATUS_MESSAGE.PERMISSION_DENIED);
    error.name = STATUS_CODE.PERMISSION_DENIED;
    throw error;
  }

  const data = {
    teamId: options.teamId,
    planType: options.planType as TeamPlanType,
    startDate: options.startDate,
    expiredDate: options.expiredDate,
    createdAt: options.createdAt,
    updatedAt: options.updatedAt,
  };
  const teamSubscription: ITeamSubscription = (await tx.teamSubscription.create({
    data,
  })) as ITeamSubscription;

  if (!teamSubscription) {
    throw new Error(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
  }

  return teamSubscription;
};

export const updateTeamSubscription = async (
  options: ITeamSubscription,
  tx: Prisma.TransactionClient | PrismaClient = prisma
): Promise<ITeamSubscription> => {
  const data = {
    planType: options.planType as TeamPlanType,
    startDate: options.startDate,
    expiredDate: options.expiredDate,
    updatedAt: options.updatedAt,
  };
  const teamSubscription: ITeamSubscription = (await tx.teamSubscription.update({
    where: { id: options.id },
    data,
  })) as ITeamSubscription;
  if (!teamSubscription) {
    throw new Error(STATUS_MESSAGE.DATABASE_UPDATE_FAILED_ERROR);
  }
  return teamSubscription;
};

export const listValidTeamSubscription = async (
  teamId: number,
  tx: Prisma.TransactionClient | PrismaClient = prisma
): Promise<ITeamSubscription[]> => {
  const nowInSecond = getTimestampNow();
  const teamSubscriptions: ITeamSubscription[] = (
    await tx.teamSubscription.findMany({
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
        team: {
          select: {
            ownerId: true,
          },
        },
        plan: true,
      },
    })
  ).map((item) => ({
    ...item,
    userId: item.team.ownerId,
    enableAutoRenewal: true,
  })) as ITeamSubscription[];

  return teamSubscriptions;
};

export async function listTeamSubscription(
  userId: number,
  page = 1,
  pageSize = 20,
  tx: Prisma.TransactionClient | PrismaClient = prisma
): Promise<IPaginatedOptions<IUserOwnedTeam[]>> {
  const teamMemberships = await tx.teamMember.findMany({
    where: {
      userId,
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
            include: { plan: true },
          },
          teamOrder: {
            orderBy: { createdAt: SortOrder.DESC },
            take: 1,
            include: {
              teamPaymentTransaction: {
                include: {
                  teamInvoice: true,
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

  const totalCount = await tx.teamMember.count({
    where: {
      userId,
      status: LeaveStatus.IN_TEAM,
    },
  });

  const metas = await Promise.all(
    teamMemberships.map(({ teamId }) => assertUserIsTeamMember(userId, teamId))
  );

  const data: IUserOwnedTeam[] = teamMemberships.map(({ team }, index) => {
    const meta = metas[index];
    const latestSub = team.subscriptions[0];
    const latestOrder = team.teamOrder[0];
    const latestTxn = latestOrder?.teamPaymentTransaction[0];
    const hasInvoice = (latestTxn?.teamInvoice?.length ?? 0) > 0;

    let paymentStatus: TPaymentStatus = TPaymentStatus.FREE;

    if (latestSub) {
      if (!latestTxn) {
        paymentStatus = TPaymentStatus.TRIAL;
      } else {
        paymentStatus = hasInvoice ? TPaymentStatus.PAID : TPaymentStatus.PAYMENT_FAILED;
      }
    }

    if (latestOrder?.status === ORDER_STATUS.CANCELLED) {
      paymentStatus = TPaymentStatus.PAYMENT_FAILED;
    }

    return {
      id: team.id,
      name: team.name,
      plan: meta.planType,
      enableAutoRenewal: true,
      expiredTimestamp: meta.expiredAt,
      nextRenewalTimestamp: meta.expiredAt,
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
  teamId: number,
  page: number = 1,
  pageSize: number = 10,
  tx: Prisma.TransactionClient | PrismaClient = prisma
): Promise<IPaginatedOptions<ITeamInvoice[]>> {
  const skip = (page - 1) * pageSize;
  const take = pageSize;

  const subscriptions = await listValidTeamSubscription(teamId);
  // Info: (20250411 - Tzuhan) 權限檢查已透過 prisma 查詢條件限制為 `role: OWNER` 成員，無需額外 assertUserCan。
  const teamOrders = await tx.teamOrder.findMany({
    where: {
      teamId,
    },
    select: {
      orderDetails: true,
      teamPaymentTransaction: {
        include: {
          teamInvoice: true,
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
    skip,
    take,
  });

  const invoices: ITeamInvoice[] = [];
  const subscription = subscriptions[0];
  const planStartTimestamp = subscription?.startDate ?? 0;
  const planEndTimestamp = subscription?.expiredDate ?? 0;

  teamOrders.forEach((order) => {
    const transaction = order.teamPaymentTransaction?.[0];
    const invoice = transaction?.teamInvoice?.[0];
    const detail = order.orderDetails?.[0];

    if (!transaction || !detail) return;

    invoices.push({
      id: invoice?.id ?? transaction.id,
      teamId,
      status: invoice?.status === TRANSACTION_STATUS.SUCCESS, // Info: (20250401 - Tzuhan) 目前不確定 DB 發票狀態的定義（schema 上是 string），這邊假設是 'SUCCESS' 代表付款成功
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
        name: PAYEE.NAME,
        address: PAYEE.ADDRESS,
        phone: PAYEE.PHONE,
        taxId: PAYEE.TAX_ID,
      },
      subtotal: invoice?.price ?? detail.amount ?? 0,
      tax: invoice?.tax ?? 0,
      total: invoice?.total ?? detail.amount ?? 0,
      amountDue: invoice?.total ?? detail.amount ?? 0,
    });
  });

  const totalCount = await tx.teamOrder.count({
    where: {
      teamId,
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

export async function getTeamInvoiceById(
  invoiceId: number,
  tx: Prisma.TransactionClient | PrismaClient = prisma
): Promise<ITeamInvoice | null> {
  const invoice = await tx.teamInvoice.findUnique({
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
    status: invoice.status === ORDER_STATUS.PAID,
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
      name: PAYEE.NAME,
      address: PAYEE.ADDRESS,
      phone: PAYEE.PHONE,
      taxId: PAYEE.TAX_ID,
    },
    subtotal: invoice.price ?? 0,
    tax: invoice.tax ?? 0,
    total: invoice.total ?? 0,
    amountDue: invoice.total ?? 0,
  };
}

export async function getSubscriptionByTeamId(
  userId: number,
  teamId: number,
  tx: Prisma.TransactionClient | PrismaClient = prisma
): Promise<IUserOwnedTeam | null> {
  // Info: (20250410 - tzuhan) Step 1: 確認該用戶是團隊成員（任何角色都可以）
  const { expiredAt, inGracePeriod, effectiveRole } = await assertUserIsTeamMember(userId, teamId);
  // Info: (20250410 - tzuhan) Step 2: 強化 session 資料一致性
  await updateTeamMemberSession(userId, teamId, effectiveRole);
  // Info: (20250410 - tzuhan) Step 3: 查詢訂閱資料
  const permission = await assertUserCan({
    userId,
    teamId,
    action: TeamPermissionAction.VIEW_SUBSCRIPTION,
  });

  if (!permission.can) {
    const error = new Error(STATUS_MESSAGE.PERMISSION_DENIED);
    error.name = STATUS_CODE.PERMISSION_DENIED;
    throw error;
  }

  const team = await tx.team.findUnique({
    where: { id: teamId },
    select: {
      id: true,
      name: true,
      subscriptions: {
        orderBy: { createdAt: SortOrder.DESC },
        take: 1,
        include: { plan: true },
      },
      teamOrder: {
        orderBy: { createdAt: SortOrder.DESC },
        take: 1,
        include: {
          teamPaymentTransaction: {
            include: { teamInvoice: true },
          },
        },
      },
    },
  });

  if (!team) return null;

  const latestSub = team.subscriptions[0];

  const now = new Date();
  const nowInSecond = getUnixTime(now);
  const startAt = latestSub?.startDate ?? 0;
  const isValid = startAt <= nowInSecond && expiredAt > nowInSecond;
  const isExpired = !(isValid || inGracePeriod);
  const planType = isExpired ? TPlanType.BEGINNER : (latestSub?.plan?.type as TPlanType);

  const latestOrder = team.teamOrder[0];
  const latestTxn = latestOrder?.teamPaymentTransaction[0];
  const hasInvoice = latestTxn?.teamInvoice?.length > 0;

  let paymentStatus: TPaymentStatus = TPaymentStatus.FREE;
  if (latestSub) {
    if (!latestTxn) {
      paymentStatus = TPaymentStatus.TRIAL;
    } else {
      paymentStatus = hasInvoice ? TPaymentStatus.PAID : TPaymentStatus.PAYMENT_FAILED;
    }
  }
  if (latestOrder?.status === ORDER_STATUS.CANCELLED) {
    paymentStatus = TPaymentStatus.PAYMENT_FAILED;
  }

  return {
    id: team.id,
    name: team.name,
    plan: planType,
    enableAutoRenewal: true,
    expiredTimestamp: latestSub?.expiredDate ?? 0,
    nextRenewalTimestamp: latestSub?.expiredDate ?? 0,
    paymentStatus,
  };
}

export const updateSubscription = async (
  userId: number,
  teamId: number,
  input: { plan?: TPlanType; autoRenew?: boolean },
  tx: Prisma.TransactionClient | PrismaClient = prisma
): Promise<IUserOwnedTeam> => {
  const { plan, autoRenew } = input;

  const permission = await assertUserCan({
    userId,
    teamId,
    action: TeamPermissionAction.MODIFY_SUBSCRIPTION,
  });
  if (!permission.can) {
    const error = new Error(STATUS_MESSAGE.PERMISSION_DENIED);
    error.name = STATUS_CODE.PERMISSION_DENIED;
    throw error;
  }

  const now = Math.floor(Date.now() / 1000);

  if (plan) {
    const expired = getUnixTime(addMonths(new Date(), 1));
    await tx.teamSubscription.create({
      data: {
        teamId,
        planType: plan,
        startDate: now,
        expiredDate: expired,
        createdAt: now,
        updatedAt: now,
      },
    });
  }

  if (autoRenew === false) {
    const latestOrder = await tx.teamOrder.findFirst({
      where: { teamId, status: { not: ORDER_STATUS.CANCELLED } },
      orderBy: { createdAt: SortOrder.DESC },
    });
    if (latestOrder) {
      await tx.teamOrder.update({
        where: { id: latestOrder.id },
        data: { status: ORDER_STATUS.CANCELLED },
      });
    }
  }

  const team = await tx.team.findUnique({
    where: { id: teamId },
    select: {
      id: true,
      name: true,
      subscriptions: {
        orderBy: { createdAt: SortOrder.DESC },
        take: 1,
        include: { plan: true },
      },
      teamOrder: {
        orderBy: { createdAt: SortOrder.DESC },
        take: 1,
        include: {
          teamPaymentTransaction: { include: { teamInvoice: true } },
        },
      },
    },
  });

  const latestSub = team?.subscriptions[0];
  const latestOrder = team?.teamOrder[0];
  const latestTxn = latestOrder?.teamPaymentTransaction[0];
  const hasInvoice = (latestTxn?.teamInvoice?.length ?? 0) > 0;

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
    id: team!.id,
    name: team!.name,
    plan: (latestSub?.planType as TPlanType) || TPlanType.BEGINNER,
    enableAutoRenewal: true,
    expiredTimestamp: latestSub?.expiredDate ?? 0,
    nextRenewalTimestamp: latestSub?.expiredDate ?? 0,
    paymentStatus,
  };
};
