import prisma from '@/client';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IValue } from '@/interfaces/project';

export async function listProjectValue(projectId: number) {
  const valueList: IValue[] = await prisma.value.findMany({
    where: {
      projectId,
    },
  });
  if (!valueList) {
    throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
  }
  return valueList;
}
