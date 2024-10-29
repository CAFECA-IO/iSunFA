import { z } from 'zod';
import { zodStringToNumber } from '@/lib/utils/zod_schema/common';

// Info: (20241029 - Jacky) User setting null schema
const userSettingNullSchema = z.union([z.object({}), z.string()]);

// Info: (20241023 - Jacky) User setting get schema
const userSettingGetQuerySchema = z.object({
  userId: zodStringToNumber,
});

// Info: (20241023 - Jacky) User setting put schema
const userSettingPutQuerySchema = z.object({
  userId: zodStringToNumber,
});
const userSettingPutBodySchema = z.object({
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

// Info: (20241023 - Jacky) User setting output schema
export const userSettingOutputSchema = z
  .object({
    id: z.number(),
    userId: z.number(),
    firstName: z.string().nullable().default(''),
    lastName: z.string().nullable().default(''),
    country: z.string().nullable().default(''),
    language: z.string().nullable().default(''),
    phone: z.string().nullable().default(''),
    systemNotification: z.boolean(),
    updateAndSubscriptionNotification: z.boolean(),
    emailNotification: z.boolean(),
    createdAt: z.number(),
    updatedAt: z.number(),
    deletedAt: z.number().nullable().default(0),
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

// Info: (20241023 - Jacky) User setting validate schema
const userSettingValidateSchema = z.object({
  id: z.number(),
  userId: z.number(),
  personalInfo: z.object({
    firstName: z.string().nullable().default(''),
    lastName: z.string().nullable().default(''),
    country: z.string().nullable().default(''),
    language: z.string().nullable().default(''),
    phone: z.string().nullable().default(''),
  }),
  notificationSetting: z.object({
    systemNotification: z.boolean(),
    updateAndSubscriptionNotification: z.boolean(),
    emailNotification: z.boolean(),
  }),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable().default(0),
});

export const userSettingGetSchema = {
  input: {
    querySchema: userSettingGetQuerySchema,
    bodySchema: userSettingNullSchema,
  },
  outputSchema: userSettingOutputSchema,
  frontend: userSettingValidateSchema,
};

export const userSettingPutSchema = {
  input: {
    querySchema: userSettingPutQuerySchema,
    bodySchema: userSettingPutBodySchema,
  },
  outputSchema: userSettingOutputSchema,
  frontend: userSettingValidateSchema,
};
