import { ITeamSubscription } from '@/interfaces/payment';
import { TPlanType } from '@/interfaces/subscription';
import { ONE_MONTH_IN_S } from '@/constants/time';
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
  teamId: number,
  teamPlanType: TPlanType
): Promise<ITeamSubscription> => {
  const nowInSecond = getTimestampNow();
  const teamSubscriptions = await listValidTeamSubscription(teamId);
  // Info: (20250411 - Luphia) 找出有相同期間、相同方案的訂閱紀錄
  const oldTeamSubscription = teamSubscriptions.find(
    (subscription) =>
      subscription.planType === teamPlanType &&
      subscription.startDate <= nowInSecond &&
      subscription.expiredDate >= nowInSecond
  );
  const teamSubscription: ITeamSubscription = oldTeamSubscription
    ? {
        ...oldTeamSubscription,
        expiredDate: oldTeamSubscription.expiredDate + ONE_MONTH_IN_S, // Info: (20250411 - Luphia) 延長原有訂閱時間
        updatedAt: nowInSecond,
      }
    : {
        teamId,
        planType: teamPlanType,
        startDate: nowInSecond,
        expiredDate: nowInSecond + ONE_MONTH_IN_S,
        createdAt: nowInSecond,
        updatedAt: nowInSecond,
      };

  return teamSubscription;
};
