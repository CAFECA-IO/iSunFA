import { STATUS_MESSAGE } from '@/constants/status_code';
import { IOrderOen, ITeamOrder } from '@/interfaces/order';
import { IUser } from '@/interfaces/user';

export const teamOrderToOrderOen = (order: ITeamOrder, user: IUser): IOrderOen => {
  const orderId = order.id?.toString();

  if (!orderId) throw new Error(STATUS_MESSAGE.INVALID_ORDER_DATA);

  const productDetails = order.details.map((detail) => ({
    productionCode: detail.productId.toString(),
    description: detail.productName,
    quantity: detail.quantity,
    unit: detail.unit,
    unitPrice: detail.unitPrice,
  }));

  const orderOen: IOrderOen = {
    amount: order.amount,
    currency: order.currency,
    orderId,
    userName: user.name,
    userEmail: user.email,
    productDetails,
  };

  return orderOen;
};
