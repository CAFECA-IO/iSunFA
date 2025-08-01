import prisma from '@/client';
import { SortOrder } from '@/constants/sort';
import { STATUS_CODE, STATUS_MESSAGE } from '@/constants/status_code';
import { PLANS } from '@/constants/subscription';
import { TPlanType } from '@/interfaces/subscription';
import loggerBack from '@/lib/utils/logger_back';
import { Prisma } from '@prisma/client';

/**
 * Info: (20250514 - Tzuhan)
 * 用來取得指定 team 的 feature map

export async function getTeamPlanFeatures(
  teamId: number
): Promise<Record<string, string | string[]>> {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      subscriptions: {
        orderBy: { createdAt: SortOrder.DESC },
        take: 1,
        select: {
          planType: true,
        },
      },
    },
  });

  if (!team?.subscriptions[0]) {
    const error = new Error(STATUS_MESSAGE.SUBSCRIPTION_NOT_FOUND);
    error.name = STATUS_CODE.SUBSCRIPTION_NOT_FOUND;
    throw error;
  }
  const plan = PLANS.find((p) => {
    let planType: TPlanType = team?.subscriptions[0].planType as TPlanType;
    if (planType === TPlanType.TRIAL) planType = TPlanType.PROFESSIONAL;
    return p.id === planType;
  });
  if (!plan) {
    const error = new Error(STATUS_MESSAGE.PLAN_NOT_FOUND);
    error.name = STATUS_CODE.PLAN_NOT_FOUND;
    throw error;
  }
  return plan!.features.reduce(
    (acc, feature) => {
      acc[feature.name] = feature.value;
      return acc;
    },
    {} as Record<string, string | string[]>
  );
}
 */

export async function getTeamPlanFeatures(
  teamId: number,
  tx?: Prisma.TransactionClient
): Promise<Record<string, string | string[]>> {
  const db = tx ?? prisma;
  const latestSub = await db.teamSubscription.findFirst({
    where: { teamId },
    orderBy: { createdAt: SortOrder.DESC },
    select: { planType: true },
  });

  let planType: TPlanType = (latestSub?.planType as TPlanType) ?? TPlanType.BEGINNER;

  // Info: (20250522 - Tzuhan) TRIAL 採用與 PROFESSIONAL 相同的功能集
  if (planType === TPlanType.TRIAL) {
    planType = TPlanType.PROFESSIONAL;
  }

  const matchedPlan = PLANS.find((plan) => plan.id === planType);
  if (!matchedPlan) return {};

  return Object.fromEntries(matchedPlan.features.map((f) => [f.name, f.value]));
}

/**
 * Info: (20250514 - Tzuhan)
 * 檢查目前帳本數是否已達上限
 */
export async function checkAccountBookLimit(teamId: number) {
  const features = await getTeamPlanFeatures(teamId);
  const maxCount =
    features.OWNED_TEAM_LEDGER_LIMIT === 'UNLIMITED' ||
    features.OWNED_TEAM_LEDGER_LIMIT === undefined
      ? Infinity
      : 1;
  const companyCount = await prisma.accountBook.count({ where: { teamId, deletedAt: null } });

  if (companyCount >= maxCount) {
    const error = new Error(STATUS_MESSAGE.ACCOUNT_BOOK_LIMIT_REACHED);
    error.name = STATUS_CODE.ACCOUNT_BOOK_LIMIT_REACHED;
    loggerBack.info(`目前方案限制擁有 ${maxCount} 本帳本，請升級方案。`);
    throw error;
  }
}

/**
 * Info: (20250514 - Tzuhan)
 * 檢查是否可上傳檔案，並計算新上傳是否超出儲存上限
 */
export async function checkStorageLimit(teamId: number, fileSize: number) {
  const features = await getTeamPlanFeatures(teamId);
  const maxSize =
    features.STORAGE === 'STORAGE_10GB'
      ? 10 * 1024 ** 3
      : // ?1 * 1024 ** 2 // Info: (20250515 - tzuhan) 測試用：限制為 1MB
        features.STORAGE === 'STORAGE_50GB'
        ? 50 * 1024 ** 3
        : features.STORAGE === 'STORAGE_200GB'
          ? 200 * 1024 ** 3
          : 0;

  const usedSizeResult = await prisma.file.aggregate({
    _sum: { size: true },
    where: {
      deletedAt: null,
      InvoiceRC2: {
        some: {
          accountbook: {
            teamId,
          },
        },
      },
    },
  });
  // eslint-disable-next-line no-underscore-dangle
  const usedSize = usedSizeResult._sum.size ?? 0;

  if (usedSize + fileSize > maxSize) {
    const error = new Error(STATUS_MESSAGE.LIMIT_EXCEEDED_STORAGE);
    error.name = STATUS_CODE.LIMIT_EXCEEDED_STORAGE;
    loggerBack.info(
      `usedSize + fileSize: ${usedSize + fileSize}儲存空間已達上限，請升級方案以取得更多空間。`
    );
    throw error;
  }
}

/**
 * Info: (20250514 - Tzuhan)
 * 檢查 team 成員數是否達上限
 */
export async function checkTeamMemberLimit(
  teamId: number,
  addMemberCount: number,
  tx?: Prisma.TransactionClient
) {
  const db = tx ?? prisma;
  const features = await getTeamPlanFeatures(teamId, tx);
  const limitEntry = features.OWNED_TEAM_MEMBER_LIMIT || features.EVERY_OWNED_TEAM_MEMBER_LIMIT;
  const match = limitEntry
    ? (limitEntry as string).match(/LIMIT_(\d+)_MEMBER(?:S)?(?:_PAID_EXTENSION)?/)
    : null;

  const limit = match ? parseInt(match[1], 10) : Infinity;
  const isPaidExtension = limitEntry?.includes('_PAID_EXTENSION') ?? false;

  loggerBack.info(
    `checkTeamMemberLimit 團隊id: ${teamId} limitEntry: ${limitEntry}, match: ${match}, limit: ${limit}, isPaidExtension: ${isPaidExtension}`
  );

  const memberCount = await db.teamMember.count({ where: { teamId, status: 'IN_TEAM' } });

  if (memberCount + addMemberCount > limit) {
    const error = new Error(STATUS_MESSAGE.LIMIT_EXCEEDED_TEAM_MEMBER);
    error.name = STATUS_CODE.LIMIT_EXCEEDED_TEAM_MEMBER;
    loggerBack.info(
      `團隊id: ${teamId} 現有成員人數: ${memberCount}， 新增成員人數： ${addMemberCount}, 目前方案限制每個團隊最多 ${limit} 位成員，請升級方案或減少人數。`
    );
    throw error;
  }
}
