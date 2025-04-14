import { TPlanType } from '@/interfaces/subscription';
import { getTeamPlanByType } from '@/lib/utils/repo/team_plan.repo';
import { countTeamMembersById } from '@/lib/utils/repo/team.repo';
import { ITeamOrder, ITeamOrderDetail } from '@/interfaces/order';
import { DefaultValue } from '@/constants/default_value';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { EXTRA_MEMBBER, ORDER_STATUS, ORDER_UNIT, PRODUCT_ID } from '@/constants/order';
import { getTimestampNow } from '@/lib/utils/common';
import { CurrencyType } from '@/constants/currency';

export const generateTeamOrder = async (options: {
  userId: number;
  teamId: number;
  teamPlanType: TPlanType;
  quantity: number;
}): Promise<ITeamOrder> => {
  const { userId, teamId, teamPlanType, quantity = 1 } = options;
  const teamPlan = await getTeamPlanByType(teamPlanType);
  if (!teamPlan) {
    throw new Error(STATUS_MESSAGE.PLAN_NOT_FOUND);
  }
  const teamMembersCount = await countTeamMembersById(teamId);
  const basicPrice = teamPlan.price;
  const basicMemberCount = DefaultValue.BASIC_MEMBER_COUNT; // ToDo: (20250326 - Luphia) 基礎會員數應該要從 team_plan 取得，無法取得才使用預設值
  const extraMemberCount =
    teamMembersCount > basicMemberCount ? teamMembersCount - basicMemberCount : 0;
  const extraMemberPrice = teamPlan.extraMemberPrice || 0;
  const extraMemberFee = extraMemberCount > 0 ? extraMemberCount * extraMemberPrice : 0;
  const totalPrice = (basicPrice + extraMemberFee) * quantity;
  const nowInSecond = getTimestampNow();

  const order: ITeamOrder = {
    userId,
    teamId,
    status: ORDER_STATUS.PENDING,
    amount: totalPrice,
    currency: CurrencyType.TWD,
    details: [],
    createdAt: nowInSecond,
    updatedAt: nowInSecond,
  };

  const orderDetailPlan: ITeamOrderDetail = {
    productId: PRODUCT_ID[teamPlanType],
    productName: teamPlan.planName,
    unit: ORDER_UNIT.MONTH,
    unitPrice: teamPlan.price,
    quantity,
    currency: CurrencyType.TWD,
    amount: teamPlan.price * quantity,
  };
  order.details.push(orderDetailPlan);

  // Info: (20250328 - Luphia) 如果有額外會員，則加入額外會員的訂單明細
  if (extraMemberCount > 0) {
    const orderDetailExtra: ITeamOrderDetail = {
      productId: PRODUCT_ID.EXTRA_MEMBER,
      productName: EXTRA_MEMBBER,
      unit: ORDER_UNIT.MONTH,
      unitPrice: extraMemberPrice * extraMemberCount,
      quantity,
      currency: CurrencyType.TWD,
      amount: extraMemberPrice * extraMemberCount * quantity,
    };
    order.details.push(orderDetailExtra);
  }

  return order;
};
