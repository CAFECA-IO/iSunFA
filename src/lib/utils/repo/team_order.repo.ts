import prisma from '@/client';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { ITeamOrder, ITeamOrderDetail } from '@/interfaces/order';

const createTeamOrderDetail = async (
  orderId: number,
  options: ITeamOrderDetail[],
  tx = prisma
): Promise<ITeamOrderDetail[]> => {
  const data = options.map((item) => ({
    orderId,
    productId: item.productId,
    productName: item.productName,
    unit: item.unit,
    unitPrice: item.unitPrice,
    quantity: item.quantity,
    currency: item.currency,
    amount: item.amount,
  }));
  const teamOrderDetails = await tx.teamOrderDetail.createMany({
    data,
  });
  if (!teamOrderDetails) {
    throw new Error(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
  }
  return options;
};

export const createTeamOrder = async (options: ITeamOrder, tx = prisma): Promise<ITeamOrder> => {
  const data = {
    userId: options.userId,
    teamId: options.teamId,
    amount: options.amount,
    currency: options.currency,
    status: options.status,
    createdAt: options.createdAt,
    updatedAt: options.updatedAt,
  };
  const teamOrder: ITeamOrder = (await tx.teamOrder.create({
    data,
  })) as ITeamOrder;

  if (!teamOrder.id) {
    throw new Error(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
  }
  await createTeamOrderDetail(teamOrder.id, options.details);

  const result = { ...options, id: teamOrder.id };
  return result;
};

// Info: (20250418 - Luphia) 更新訂單只允許更改狀態
export const updateTeamOrderStatus = async (
  options: ITeamOrder,
  tx = prisma
): Promise<ITeamOrder> => {
  const { id, status } = options;
  const data = {
    status,
    updatedAt: options.updatedAt,
  };
  const teamOrder: ITeamOrder = (await tx.teamOrder.update({
    where: {
      id,
    },
    data,
  })) as ITeamOrder;

  if (!teamOrder) {
    throw new Error(STATUS_MESSAGE.DATABASE_UPDATE_FAILED_ERROR);
  }

  return teamOrder;
};
