import prisma from '@/client';
import { JSONValue } from '@/interfaces/common';
import { IFaithContent, ICreateContentOptions } from '@/interfaces/faith';
import { getTimestampNow } from '@/lib/utils/common';

const createContent = async (options: ICreateContentOptions): Promise<IFaithContent> => {
  const nowInSecond = getTimestampNow();
  const newContent = await prisma.faithContent.create({
    data: {
      faithSessionId: options.sessionId,
      roleId: options.role.id,
      roleName: options.role.name,
      roleImage: options.role.image,
      content: options.content,
      createdAt: nowInSecond,
      updatedAt: nowInSecond,
    },
  });
  const result: IFaithContent = {
    id: newContent.id.toString(),
    role: {
      id: newContent.roleId.toString(),
      name: newContent.roleName,
      image: newContent.roleImage,
    },
    textContent:
      (newContent.content as { type: string; content: string }[])?.find((content) => {
        return content.type === 'text';
      })?.content || '',
    content: newContent.content as JSONValue,
    like: false,
    dislike: false,
    createdAt: newContent.createdAt,
  };

  return result;
};

const listContentsBySessionId = async (sessionId: number): Promise<IFaithContent[]> => {
  const contents = await prisma.faithContent.findMany({
    where: { faithSessionId: sessionId },
    include: {
      like: true,
      dislike: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  const result: IFaithContent[] = contents.map((content) => ({
    id: content.id.toString(),
    role: {
      id: content.roleId.toString(),
      name: content.roleName,
      image: content.roleImage,
    },
    textContent:
      (content.content as { type: string; content: string }[])?.find((content) => {
        return content.type === 'text';
      })?.content || '',
    content: content.content as JSONValue,
    like: content.like.length > 0,
    dislike: content.dislike.length > 0,
    createdAt: content.createdAt,
  }));

  return result;
};

const updateContent = async (options: ICreateContentOptions) => {
  // Info: (20251128 - Luphia) 未指定 id 則不進行更新
  if (!options.id) {
    return;
  }

  const nowInSecond = getTimestampNow();
  await prisma.faithContent.update({
    where: { id: options.id },
    data: {
      content: options.content,
      updatedAt: nowInSecond,
    },
  });
};

const getContentById = async (contentId: number): Promise<IFaithContent | undefined> => {
  const content = await prisma.faithContent.findUnique({
    where: { id: contentId },
    include: {
      like: true,
      dislike: true,
    },
  });

  if (!content) {
    return undefined;
  }

  const result: IFaithContent = {
    id: content.id.toString(),
    role: {
      id: content.roleId.toString(),
      name: content.roleName,
      image: content.roleImage,
    },
    textContent:
      (content.content as { type: string; content: string }[])?.find((content) => {
        return content.type === 'text';
      })?.content || '',
    content: content.content as JSONValue,
    like: content.like.length > 0,
    dislike: content.dislike.length > 0,
    createdAt: content.createdAt,
  };

  return result;
};

export { listContentsBySessionId, createContent, updateContent, getContentById };
