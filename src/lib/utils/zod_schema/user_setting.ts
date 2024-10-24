import { z } from 'zod';
import { IZodValidator } from '@/interfaces/zod_validator';

// Info: (20241023 - Jacky) User setting get validator
const userSettingGetQueryValidator = z.object({
  userId: z.number().int(),
});
const userSettingGetBodyValidator = z.object({});

export const userSettingGetValidator: IZodValidator<
  (typeof userSettingGetQueryValidator)['shape'],
  (typeof userSettingGetBodyValidator)['shape']
> = {
  query: userSettingGetQueryValidator,
  body: userSettingGetBodyValidator,
};

// Info: (20241023 - Jacky) User setting put validator
const userSettingPutQueryValidator = z.object({
  userId: z.number().int(),
});
const userSettingPutBodyValidator = z.object({
  id: z.number(),
  userId: z.number().int(),
  personalInfo: z.object({
    firstName: z.string(),
    lastName: z.string(),
    country: z.string(),
    language: z.string(),
    phone: z.string(),
  }),
  notificationSetting: z.object({
    systemNotification: z.boolean(),
    updateAndSubscriptionNotification: z.boolean(),
    emailNotification: z.boolean(),
  }),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
});

export const userSettingPutValidator: IZodValidator<
  (typeof userSettingPutQueryValidator)['shape'],
  (typeof userSettingPutBodyValidator)['shape']
> = {
  query: userSettingPutQueryValidator,
  body: userSettingPutBodyValidator,
};

export const UserSettingSchema = z
  .object({
    id: z.number(),
    userId: z.number(),
    firstName: z.string().nullable().default(''), // 处理 null 转为空字符串
    lastName: z.string().nullable().default(''),
    country: z.string().nullable().default(''),
    language: z.string().nullable().default(''),
    phone: z.string().nullable().default(''),
    systemNotification: z.boolean(),
    updateAndSubscriptionNotification: z.boolean(),
    emailNotification: z.boolean(),
    createdAt: z.number(),
    updatedAt: z.number(),
    deletedAt: z.number().nullable().default(0), // 如果 null，默认为 0
  })
  .transform((userSetting) => ({
    id: userSetting.id,
    userId: userSetting.userId,
    personalInfo: {
      firstName: userSetting.firstName || '',
      lastName: userSetting.lastName || '',
      country: userSetting.country || '',
      language: userSetting.language || '',
      phone: userSetting.phone || '',
    },
    notificationSetting: {
      systemNotification: userSetting.systemNotification,
      updateAndSubscriptionNotification: userSetting.updateAndSubscriptionNotification,
      emailNotification: userSetting.emailNotification,
    },
    createdAt: userSetting.createdAt,
    updatedAt: userSetting.updatedAt,
    deletedAt: userSetting.deletedAt || 0, // 如果 deletedAt 是 null，默认设置为 0
  }));
