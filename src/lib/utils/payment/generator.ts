import { ITeamInvoice } from "@/interfaces/invoice";
import { TPlanType } from "@/interfaces/subscription";
import { getTeamPlanByType } from "@/lib/utils/repo/team_plan.repo";
import { countTeamMembersById } from "@/lib/utils/repo/team.repo";
import { getUserPaymentInfoById } from "@/lib/utils/repo/user_payment_info.repo";
import { ITeamOrder, ITeamOrderDetail } from "@/interfaces/order";
import { ITeam } from "@/interfaces/team";
import { IUser } from "@/interfaces/user";
import { DefaultValue } from "@/constants/default_value";
import { STATUS_MESSAGE } from "@/constants/status_code";
import { EXTRA_MEMBBER, ORDER_STATUS, ORDER_UNIT } from "@/constants/order";
import { getTimestampNow } from "@/lib/utils/common";
import { CurrencyType } from "@/constants/currency";
import { ISUNFA } from "@/constants/common";
import { ITeamPaymentTransaction } from "@/interfaces/transaction";

export const generateOrder = async (options: {
  userId: number,
  teamId: number,
  teamPlanType: TPlanType,
  quantity: number,
}): Promise<ITeamOrder> => {
  const { userId, teamId, teamPlanType, quantity = 1 } = options;
  const teamPlan = await getTeamPlanByType(teamPlanType);
  if (!teamPlan) {
    throw new Error(STATUS_MESSAGE.PLAN_NOT_FOUND);
  }
  const teamMembersCount = await countTeamMembersById(teamId);
  const basicPrice = teamPlan.price;
  const basicMemberCount = DefaultValue.BASIC_MEMBER_COUNT; // ToDo: (20250326 - Luphia) 基礎會員數應該要從 team_plan 取得，無法取得才使用預設值
  const extraMemberCount = teamMembersCount > basicMemberCount ? teamMembersCount - basicMemberCount : 0;
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
    productId: teamPlan.id,
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
      productId: EXTRA_MEMBBER,
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

/*
  const invoice = {
    id: Date.now(), //  Info: (20250218 - tzuhan) 模擬發票 ID
    teamId: 3, //  Info: (20250218 - tzuhan) 假設綁定的團隊 ID
    status: true, //  Info: (20250218 - tzuhan) 模擬付款成功
    issuedTimestamp,
    dueTimestamp,
    planId: planId as TPlanType,
    planStartTimestamp: issuedTimestamp,
    planEndTimestamp: dueTimestamp,
    planQuantity: quantity,
    planUnitPrice: unitPrice,
    planAmount: totalPrice,
    payer: {
      name: 'John Doe',
      address: '1234 Main St',
      phone: '123-456-7890',
      taxId: '123456789',
    },
    payee: {
      name: 'Jane Doe',
      address: '5678 Elm St',
      phone: '098-765-4321',
      taxId: '987654321',
    },
    subtotal,
    tax,
    total: totalPrice,
    amountDue: 0, //  Info: (20250218 - tzuhan) 假設一次付清
  };
*/

export const generateInvoice = async (
  order: ITeamOrder,
  transaction: ITeamPaymentTransaction,
): Promise<ITeamInvoice> => {
  const nowInSecond = getTimestampNow();
  const invoiceNo = ISUNFA + transaction.id;
  const invoice: ITeamInvoice = {
    id: order.id,
    invoiceNo,
    
  };
  return invoice;
};
