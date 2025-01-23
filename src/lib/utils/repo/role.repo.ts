import prisma from '@/client';
import { Role } from '@prisma/client';
import { getTimestampNow } from '@/lib/utils/common';
import { RoleType } from '@/constants/role';

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

export const getRoleByName = async (name: string): Promise<Role | null> => {
  let result: Role | null = null;
  if (name) {
    result = await prisma.role.findFirst({
      where: { name },
    });
  }
  return result;
};

export const listRole = async (type: RoleType): Promise<Role[]> => {
  return prisma.role.findMany({
    where: {
      type,
    },
  });
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
