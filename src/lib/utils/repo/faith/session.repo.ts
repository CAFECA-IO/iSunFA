import prisma from '@/client';
import { IFaithSession, ICreateSessionOptions } from '@/interfaces/faith';
import { getTimestampNow } from '@/lib/utils/common';

const createSession = async (options: ICreateSessionOptions): Promise<IFaithSession> => {
  const nowInSecond = getTimestampNow();
  const newSession = await prisma.faithSession.create({
    data: {
      userId: options.userId,
      title: options.title,
      description: options.description,
      createdAt: nowInSecond,
      updatedAt: nowInSecond,
    },
  });
  const result: IFaithSession = {
    id: newSession.id.toString(),
    title: newSession.title,
    description: newSession.description,
    unreadCount: 0,
    createdAt: newSession.createdAt,
    updatedAt: newSession.updatedAt,
  };

  return result;
};

const listSessionsByUserId = async (userId: number): Promise<IFaithSession[]> => {
  const sessions = await prisma.faithSession.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
  });

  const result: IFaithSession[] = sessions.map((session) => ({
    id: session.id.toString(),
    title: session.title,
    description: session.description,
    unreadCount: 0,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  }));

  return result;
};

const getSessionById = async (sessionId: number): Promise<IFaithSession | undefined> => {
  const session = await prisma.faithSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    return undefined;
  }

  const result: IFaithSession = {
    id: session.id.toString(),
    title: session.title,
    description: session.description,
    unreadCount: 0,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };

  return result;
};

const updateSession = async (options: ICreateSessionOptions) => {
  // Info: (20251128 - Luphia) 未指定 id 則不進行更新
  if (!options.id) {
    return;
  }

  const nowInSecond = getTimestampNow();
  await prisma.faithSession.update({
    where: { id: options.id },
    data: {
      title: options.title,
      description: options.description,
      updatedAt: nowInSecond,
    },
  });
};

const deleteSession = async (sessionId: number) => {
  await prisma.faithSession.delete({
    where: { id: sessionId },
  });
};

export { createSession, listSessionsByUserId, getSessionById, updateSession, deleteSession };
