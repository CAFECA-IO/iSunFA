import prisma from '@/client';
import { Role } from '@prisma/client';
import { getTimestampNow } from '@/lib/utils/common';

export const createRole = async (
  data: Omit<Role, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>
): Promise<Role> => {
  const nowInSecond = getTimestampNow();
  return prisma.role.create({
    data: {
      ...data,
      createdAt: nowInSecond,
      updatedAt: nowInSecond,
    },
  });
};

export const getRoleById = async (id: number): Promise<Role | null> => {
  let result: Role | null = null;
  if (id > 0) {
    result = await prisma.role.findUnique({
      where: { id },
    });
  }
  return result;
};

export const listRole = async (): Promise<Role[]> => {
  return prisma.role.findMany();
};

export const updateRole = async (
  id: number,
  data: Partial<Omit<Role, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>>
): Promise<Role | null> => {
  let result: Role | null = null;
  if (id > 0) {
    const nowInSecond = getTimestampNow();
    result = await prisma.role.update({
      where: { id },
      data: {
        ...data,
        updatedAt: nowInSecond,
      },
    });
  }
  return result;
};

export const deleteRole = async (id: number): Promise<Role | null> => {
  let result: Role | null = null;
  if (id > 0) {
    const nowInSecond = getTimestampNow();
    result = await prisma.role.update({
      where: { id },
      data: {
        deletedAt: nowInSecond,
      },
    });
  }
  return result;
};
