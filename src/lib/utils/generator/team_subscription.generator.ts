import { ITeamSubscription } from '@/interfaces/payment';
import { TPlanType } from '@/interfaces/subscription';
import { getTimestampNow } from '@/lib/utils/common';
import { listValidTeamSubscription } from '@/lib/utils/repo/team_subscription.repo';

/**
 * Info: (20250330 - Luphia) 生成團隊訂閱紀錄
 * Step 1. 讀取團隊是否在訂閱期間
 * Step 2. 若在訂閱期間則延長該訂閱時間
 * Step 3. 若不在訂閱期間則建立新的訂閱紀錄
 * @param teamId
 * @param teamPlanType
 */
export const generateTeamSubscription = async (
  userId: number,
  teamId: number,
  teamPlanType: TPlanType
): Promise<ITeamSubscription> => {
  const nowInSecond = getTimestampNow();

  const teamSubscriptions = await listValidTeamSubscription(teamId);
  const teamSubscription: ITeamSubscription = teamSubscriptions[0]
    ? teamSubscriptions[0]
    : {
        userId,
        teamId,
        planType: teamPlanType,
        startDate: nowInSecond,
        expiredDate: nowInSecond,
        createdAt: nowInSecond,
        updatedAt: nowInSecond,
      };

  return teamSubscription;
};
