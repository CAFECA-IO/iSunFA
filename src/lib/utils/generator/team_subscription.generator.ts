import { ITeamSubscription } from '@/interfaces/payment';
import { TPlanType } from '@/interfaces/subscription';
import { ONE_MONTH_IN_S } from '@/constants/time';
import { getTimestampNow } from '@/lib/utils/common';
import { listValidTeamSubscription } from '@/lib/utils/repo/team_subscription.repo';
import { ITeamOrder } from '@/interfaces/order';
import { DefaultValue } from '@/constants/default_value';
import { PRODUCT_ID } from '@/constants/order';

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
  teamPlanType: TPlanType,
  teamOrder: ITeamOrder
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
  // ToDo: (20250326 - Luphia) 方案基礎會員數，應該要從 team_plan 取得，無法取得才使用預設值
  const basicMemberCount = DefaultValue.BASIC_MEMBER_COUNT;
  // Info: (20250516 - Luphia) 訂單內容購買的額外會員數量
  const extraMemberCount =
    teamOrder.details.find((detail) => detail.productId === PRODUCT_ID.EXTRA_MEMBER)?.quantity || 0;
  const maxMembers = basicMemberCount + extraMemberCount;
  const teamSubscription: ITeamSubscription = oldTeamSubscription
    ? {
        ...oldTeamSubscription,
        expiredDate: oldTeamSubscription.expiredDate + ONE_MONTH_IN_S, // Info: (20250411 - Luphia) 延長原有訂閱時間
        updatedAt: nowInSecond,
      }
    : {
        userId,
        teamId,
        planType: teamPlanType,
        maxMembers,
        startDate: nowInSecond,
        expiredDate: nowInSecond + ONE_MONTH_IN_S,
        createdAt: nowInSecond,
        updatedAt: nowInSecond,
      };

  return teamSubscription;
};
