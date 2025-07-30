import prisma from '@/client';
import { NOTIFICATION_EVENT, PRIVATE_CHANNEL } from '@/constants/pusher';
import { SortOrder } from '@/constants/sort';
import { NotificationType, NotificationEvent } from '@/interfaces/notification';
import { getPusherInstance } from '@/lib/utils/pusher';
import { Prisma, NotificationType as PrismaNotificationType } from '@prisma/client';
import loggerBack from '@/lib/utils/logger_back';

export async function listNotifications(userId: number) {
  return prisma.notification.findMany({
    where: {
      userId,
      deletedAt: null,
      read: false,
    },
    orderBy: {
      createdAt: SortOrder.DESC,
    },
  });
}

export async function getNotificationById(userId: number, id: number) {
  return prisma.notification.findFirst({
    where: {
      id,
      userId,
      deletedAt: null,
    },
  });
}

export async function markNotificationAsRead(userId: number, id: number) {
  return prisma.notification.updateMany({
    where: {
      id,
      userId,
      deletedAt: null,
    },
    data: {
      read: true,
      updatedAt: Math.floor(Date.now() / 1000),
    },
  });
}

type CreateNotificationParams = {
  userId: number;
  email?: string;
  template: string;
  teamId?: number;
  type: NotificationType;
  event: NotificationEvent;
  title: string;
  message: string;
  content: Record<string, string | number | boolean>;
  actionUrl?: string;
  imageUrl?: string;
  priority?: number;
  pushPusher?: boolean;
  sendEmail?: boolean;
};

type CreateManyNotificationParams = Omit<CreateNotificationParams, 'userId' | 'email'> & {
  userEmailMap: { userId?: number; email: string }[];
};

export async function createNotification(params: CreateNotificationParams) {
  const now = Math.floor(Date.now() / 1000);
  const notification = await prisma.notification.create({
    data: {
      userId: params.userId,
      teamId: params.teamId,
      type: params.type as PrismaNotificationType,
      event: params.event as string,
      title: params.title,
      message: params.message,
      content: params.content,
      actionUrl: params.actionUrl,
      imageUrl: params.imageUrl,
      priority: params.priority ?? 1,
      read: false,
      createdAt: now,
      updatedAt: now,
    },
  });

  if (params.pushPusher) {
    const pusher = getPusherInstance();
    await pusher.trigger(
      `${PRIVATE_CHANNEL.USER}-${params.userId}`,
      NOTIFICATION_EVENT.NEW,
      notification
    );
  }

  if (params.sendEmail && params.email) {
    await prisma.emailJob.create({
      data: {
        title: params.title,
        receiver: params.email,
        template: params.template,
        data: {
          ...params.content,
          title: params.title,
          message: params.message,
        },
        createdAt: now,
        updatedAt: now,
      },
    });
  }

  return notification;
}

export async function createNotificationsBulk(
  tx: Prisma.TransactionClient,
  params: CreateManyNotificationParams
) {
  const now = Math.floor(Date.now() / 1000);

  const notifications = params.userEmailMap
    .filter(({ userId }) => !!userId)
    .map(({ userId }) => ({
      userId: userId!,
      teamId: params.teamId,
      type: params.type as PrismaNotificationType,
      event: params.event,
      title: params.title,
      message: params.message,
      content: params.content,
      actionUrl: params.actionUrl,
      imageUrl: params.imageUrl,
      priority: params.priority ?? 1,
      read: false,
      createdAt: now,
      updatedAt: now,
    }));

  await tx.notification.createMany({ data: notifications });

  loggerBack.info(`pusher: ${params.pushPusher}`);

  if (params.pushPusher !== false) {
    const pusher = getPusherInstance();
    const pushEvents = notifications.map((notification) => {
      loggerBack.info(
        `channel: ${PRIVATE_CHANNEL.USER}-${notification.userId}, notification: ${JSON.stringify(notification)}`
      );
      return pusher.trigger(
        `${PRIVATE_CHANNEL.USER}-${notification.userId}`,
        NOTIFICATION_EVENT.NEW,
        notification
      );
    });
    await Promise.all(pushEvents);
  }

  if (params.sendEmail) {
    const emails = params.userEmailMap.map(({ email }) => ({
      title: params.title,
      receiver: email,
      template: params.template, // ToDo: (202516 - Tzuhan) 要請前端幫忙處理
      data: {
        ...params.content,
        title: params.title,
        message: params.message,
      },
      status: 'PENDING',
      retry: 0,
      maxRetry: 3,
      createdAt: now,
      updatedAt: now,
    }));
    await tx.emailJob.createMany({ data: emails });
  }
}
