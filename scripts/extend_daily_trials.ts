import { PrismaClient, TeamPlanType } from '@prisma/client';
import { getUnixTime, addMonths, formatISO } from 'date-fns';
import { scriptLogger } from './logger_script';

const prisma = new PrismaClient();

async function extendDailyTrials() {
  scriptLogger.info('==================================================');
  scriptLogger.info('STARTING Daily Trial Extension Job');
  scriptLogger.info('==================================================');

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

    scriptLogger.info(`Found ${teams.length} total teams to check.`);

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

          scriptLogger.info(
            `SUCCESS: Extended Team ID: ${team.id} (Name: ${team.name}). ` +
              `Original Plan: ${originalPlan}. ` +
              `Original Expiry: ${originalExpiry > 0 ? formatISO(new Date(originalExpiry * 1000)) : 'N/A'}. ` +
              `New Expiry: ${formatISO(new Date(newExpiredDate * 1000))}.`
          );
          extendedTeams++;
        } catch (createError) {
          scriptLogger.error(
            `FAILED: Could not create subscription for Team ID: ${team.id} (Name: ${team.name}).`,
            createError as Error
          );
          errorTeams++;
        }
      } else {
        scriptLogger.info(
          `SKIP: Team ID: ${team.id} (Name: ${team.name}). ` +
            `Current Plan: ${originalPlan}. No action taken.`
        );
        skippedTeams++;
      }
    }
  } catch (error) {
    scriptLogger.error(`CRITICAL_ERROR: Job failed during team query.`, error as Error);
  } finally {
    await prisma.$disconnect();
    scriptLogger.info('==================================================');
    scriptLogger.info('FINISHED Daily Trial Extension Job');
    scriptLogger.info(
      `Summary: Checked: ${checkedTeams}, Extended: ${extendedTeams}, Skipped: ${skippedTeams}, Errors: ${errorTeams}`
    );
    scriptLogger.info('==================================================\n');
  }
}

extendDailyTrials()
  .catch((e) => {
    scriptLogger.error(`UNHANDLED_EXCEPTION:`, e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
