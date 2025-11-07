import { PrismaClient, TeamPlanType } from '@prisma/client';
import { getUnixTime, addMonths, formatISO, fromUnixTime } from 'date-fns';

const prisma = new PrismaClient();

// Info: (20251107 - Tzuhan) 日誌記錄功能
const logInfo = (message: string) => {
  const timestamp = new Date().toISOString();
  // Info: (20251107 - Tzuhan) 輸出資訊日誌

  // eslint-disable-next-line no-console
  console.log(`${timestamp} [INFO]: ${message}`);
};

const logError = (message: string, error?: Error) => {
  const timestamp = new Date().toISOString();
  let fullMessage = message;
  if (error) {
    const errMessage = error.stack || error.message || String(error);
    fullMessage += `\n${errMessage}`;
  }
  // Info: (20251107 - Tzuhan) 輸出錯誤日誌
  // eslint-disable-next-line no-console
  console.error(`${timestamp} [ERROR]: ${fullMessage}`);
};

/**
 * 1. Info: (20251107 - Tzuhan) 找出所有團隊。
 * 2. Info: (20251107 - Tzuhan) 檢查每個團隊的最新訂閱計劃。
 */
async function main() {
  logInfo('==================================================');
  logInfo('STARTING Daily Trial Extension Job');
  logInfo('==================================================');

  const now = new Date();
  const nowTimestamp = getUnixTime(now);
  const newExpiredDate = getUnixTime(addMonths(now, 1));

  let checkedTeams = 0;
  let extendedTeams = 0;
  let skippedTeams = 0;
  let errorTeams = 0;

  try {
    const teams = await prisma.team.findMany({
      include: {
        subscriptions: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
    });

    logInfo(`Found ${teams.length} total teams to check.`);

    for (const team of teams) {
      checkedTeams++;
      const latestSub = team.subscriptions[0];
      const originalPlan = latestSub?.planType ?? 'None';
      const originalExpiry = latestSub?.expiredDate ?? 0;

      const shouldExtend =
        !latestSub || latestSub.planType === TeamPlanType.BEGINNER || latestSub.planType === null;

      if (shouldExtend) {
        try {
          await prisma.teamSubscription.create({
            data: {
              teamId: team.id,
              planType: TeamPlanType.TRIAL,
              startDate: nowTimestamp,
              expiredDate: newExpiredDate,
              createdAt: nowTimestamp,
              updatedAt: nowTimestamp,
            },
          });

          logInfo(
            `SUCCESS: Extended Team ID: ${team.id} (Name: ${team.name}). ` +
              `Original Plan: ${originalPlan}. ` +
              `Original Expiry: ${originalExpiry > 0 ? formatISO(fromUnixTime(originalExpiry)) : 'N/A'}. ` +
              `New Expiry: ${formatISO(fromUnixTime(newExpiredDate))}.`
          );
          extendedTeams++;
        } catch (createError) {
          logError(
            `FAILED: Could not create subscription for Team ID: ${team.id} (Name: ${team.name}).`,
            createError as Error
          );
          errorTeams++;
        }
      } else {
        logInfo(
          `SKIP: Team ID: ${team.id} (Name: ${team.name}). ` +
            `Current Plan: ${originalPlan}. No action taken.`
        );
        skippedTeams++;
      }
    }
  } catch (error) {
    logError(`CRITICAL_ERROR: Job failed during team query.`, error as Error);
  } finally {
    await prisma.$disconnect();
    logInfo('==================================================');
    logInfo('FINISHED Daily Trial Extension Job');
    logInfo(
      `Summary: Checked: ${checkedTeams}, Extended: ${extendedTeams}, Skipped: ${skippedTeams}, Errors: ${errorTeams}`
    );
    logInfo('==================================================\n');
  }
}

// Info: (20251107 - Tzuhan) 執行主函數並處理未捕獲的異常
main()
  .catch((e) => {
    logError(`UNHANDLED_EXCEPTION:`, e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
