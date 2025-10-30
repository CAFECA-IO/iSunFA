import { z } from 'zod';
import { NotificationType } from '@prisma/client';
import { zodStringToNumber, nullSchema } from '@/lib/utils/zod_schema/common';

export const NotificationContentSchema = z.record(z.any(), z.any());

export const NotificationSchema = z.object({
  id: z.number(),
  userId: z.number(),
  teamId: z.number().nullable().optional(),
  type: z.nativeEnum(NotificationType),
  event: z.string(),
  title: z.string(),
  message: z.string(),
  content: z.record(z.any(), z.any()),
  actionUrl: z.string().optional(),
  imageUrl: z.string().optional(),
  read: z.boolean(),
  priority: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable().optional(),
});

export const CreateNotificationSchema = z.object({
  userId: z.number().int(),
  teamId: z.number().int().optional(),
  type: z.nativeEnum(NotificationType),
  event: z.string().min(1), // Info: (20250516 - Tzuhan) e.g. 'TRANSFER', 'CANCEL'
  title: z.string().min(1),
  message: z.string().min(1),
  content: NotificationContentSchema,
  actionUrl: z.string().url().optional(),
  imageUrl: z.string().url().optional(),
  priority: z.number().int().optional(),
  pushPusher: z.boolean().optional(),
  sendEmail: z.boolean().optional(),
  email: z
    .object({
      receiver: z.string().email(),
      template: z.string().min(1),
    })
    .optional(),
});

export const BulkCreateNotificationSchema = z.object({
  userEmailMap: z
    .array(
      z.object({
        userId: z.number().int(),
        email: z.string().email(),
      })
    )
    .min(1),
  teamId: z.number().int().optional(),
  type: z.nativeEnum(NotificationType),
  event: z.string().min(1),
  title: z.string().min(1),
  message: z.string().min(1),
  content: NotificationContentSchema,
  actionUrl: z.string().url().optional(),
  imageUrl: z.string().url().optional(),
  priority: z.number().int().optional(),
  pushPusher: z.boolean().optional(),
  sendEmail: z.boolean().optional(),
});

// Info: (20250516 - Tzuhan) Zod Schema Definitions

export const listNotificationSchema = z.array(
  z.object({
    id: z.number(),
    userId: z.number(),
    teamId: z.number().nullable().optional(),
    type: z.nativeEnum(NotificationType),
    event: z.string(),
    title: z.string(),
    message: z.string(),
    content: z.record(z.any(), z.any()),
    actionUrl: z.string().optional(),
    imageUrl: z.string().optional(),
    read: z.boolean(),
    priority: z.number(),
    createdAt: z.number(),
    updatedAt: z.number(),
    deletedAt: z.number().nullable().optional(),
  })
);

export const getNotificationSchema = z.object({
  id: z.number(),
  userId: z.number(),
  teamId: z.number().nullable().optional(),
  type: z.nativeEnum(NotificationType),
  event: z.string(),
  title: z.string(),
  message: z.string(),
  content: z.record(z.any(), z.any()),
  actionUrl: z.string().optional(),
  imageUrl: z.string().optional(),
  read: z.boolean(),
  priority: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable().optional(),
});

export const listNotificationByUserIdSchema = {
  input: {
    querySchema: z.object({
      userId: zodStringToNumber,
    }),
    bodySchema: nullSchema,
  },
  outputSchema: z.array(NotificationSchema),
  frontend: z.array(NotificationSchema),
};

export const getNotificationByIdSchema = {
  input: {
    querySchema: z.object({
      userId: zodStringToNumber,
      notificationId: zodStringToNumber,
    }),
    bodySchema: nullSchema,
  },
  outputSchema: NotificationSchema,
  frontend: NotificationSchema,
};

export const readNotificationSchema = {
  input: {
    querySchema: z.object({
      userId: zodStringToNumber,
      notificationId: zodStringToNumber,
    }),
    bodySchema: nullSchema,
  },
  outputSchema: z.object({ count: z.number() }),
  frontend: z.object({ count: z.number() }),
};
