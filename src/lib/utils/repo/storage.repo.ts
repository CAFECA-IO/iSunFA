import prisma from '@/client';
import { SortOrder } from '@/constants/sort';
import { PLANS, TRAIL_PLAN } from '@/constants/subscription';
import { TPlanType } from '@/interfaces/subscription';

const parseStorageValue = (value: string): number | null => {
  if (value.startsWith('STORAGE_')) {
    const gb = parseInt(value.replace('STORAGE_', '').replace('GB', ''), 10);
    return gb * 1024 * 1024; // MB → byte 換算可移至呼叫端
  }
  return null;
};

export async function getPlanFeatureValue(
  teamId: number,
  featureName: string
): Promise<number | null> {
  // Step 1: 取得 team 對應的訂閱方案類型（例如：'BEGINNER'）
  const subscription = await prisma.teamSubscription.findFirst({
    where: {
      teamId,
    },
    orderBy: {
      createdAt: SortOrder.DESC,
    },
    select: {
      planType: true,
    },
  });

  const planType = subscription?.planType ?? TPlanType.BEGINNER;
  // Step 2: 從 PLANS 或 TRIAL_PLAN 中找出對應的 plan
  const plan = [...PLANS, TRAIL_PLAN].find((p) => p.id === planType);
  if (!plan) return null;

  // Step 3: 找出指定的 feature（例如 STORAGE）
  const feature = plan.features.find((f) => f.name === featureName);
  if (!feature) return null;

  // Step 4: 根據不同 featureName 做 parsing（目前僅處理 STORAGE）
  switch (featureName) {
    case 'STORAGE':
      return parseStorageValue(feature.value as string);
    default:
      return null;
  }
}

// Info: (20250507 - Tzuhan) Helper：格式化容量顯示（如：20.3 MB）
export function formatSize(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function checkStorageLimit(teamId: number, newUploadSize: number): Promise<void> {
  // Info: (20250507 - Tzuhan) Step 1: 找出所有該 Team 下的 company id
  const companies = await prisma.company.findMany({
    where: { teamId, deletedAt: null },
    select: { id: true },
  });
  const companyIds = companies.map((c) => c.id);
  if (companyIds.length === 0) return;

  // Info: (20250507 - Tzuhan) Step 2: 查找目前所有檔案的總大小
  const totalSize = await prisma.file.aggregate({
    _sum: { size: true },
    where: {
      deletedAt: null,
      OR: [
        {
          certificate: {
            companyId: { in: companyIds },
          },
        },
        {
          CertificateRC2: {
            some: {
              accountBookId: { in: companyIds },
            },
          },
        },
      ],
    },
  });

  // eslint-disable-next-line no-underscore-dangle
  const usedSize = totalSize._sum.size ?? 0; // Info: (20250507 - Tzuhan) 單位：byte

  // Info: (20250507 - Tzuhan) Step 3: 查訂閱限制（以 MB 為單位，需轉換成 byte）
  const maxStorageMb = await getPlanFeatureValue(teamId, 'MAX_STORAGE_MB');
  if (maxStorageMb === null) return;

  const maxStorageByte = maxStorageMb * 1024 * 1024;

  // Info: (20250507 - Tzuhan) Step 4: 檢查限制（已使用 + 新上傳 > 限制）
  if (usedSize + newUploadSize > maxStorageByte) {
    throw new Error('Storage limit exceeded');
  }
}
