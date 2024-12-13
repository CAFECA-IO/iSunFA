import { LocaleKey } from '@/constants/normal_setting';
import { z } from 'zod';

// Info: (20241029 - Jacky) User setting null schema
const userSettingNullSchema = z.union([z.object({}), z.string(), z.null()]);

// Info: (20241023 - Jacky) User setting get schema
const userSettingGetQuerySchema = z
  .object({
    // userId: zodStringToNumber,
  })
  .optional();

// Info: (20241023 - Jacky) User setting put schema
const userSettingPutQuerySchema = z.object({
  // userId: zodStringToNumber,
});
const userSettingPutBodySchema = z.object({
  id: z.number(),
  userId: z.number().int(),
  personalInfo: z.object({
    firstName: z.string(),
    lastName: z.string(),
    country: z.nativeEnum(LocaleKey),
    language: z.nativeEnum(LocaleKey),
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

// Info: (20241023 - Jacky) User setting validate schema
const userSettingValidateSchema = z.object({
  id: z.number(),
  userId: z.number(),
  personalInfo: z.object({
    firstName: z
      .string()
      .nullable()
      .transform((value) => value || ''),
    lastName: z
      .string()
      .nullable()
      .transform((value) => value || ''),
    country: z.nativeEnum(LocaleKey).transform((value) => value || LocaleKey.tw),
    language: z.nativeEnum(LocaleKey).transform((value) => value || LocaleKey.tw),
    phone: z
      .string()
      .nullable()
      .transform((value) => value || ''),
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
    firstName: z
      .string()
      .nullable()
      .transform((value) => value || ''),
    lastName: z
      .string()
      .nullable()
      .transform((value) => value || ''),
    country: z
      .nativeEnum(LocaleKey)
      .nullable()
      .transform((value) => value || LocaleKey.tw),
    language: z
      .nativeEnum(LocaleKey)
      .nullable()
      .transform((value) => value || LocaleKey.tw),
    phone: z
      .string()
      .nullable()
      .transform((value) => value || ''),
    systemNotification: z.boolean(),
    updateAndSubscriptionNotification: z.boolean(),
    emailNotification: z.boolean(),
    createdAt: z.number(),
    updatedAt: z.number(),
    deletedAt: z.number().nullable(),
  })
  .transform((userSetting) => {
    const correctUserSetting = {
      id: userSetting.id,
      userId: userSetting.userId,
      personalInfo: {
        firstName: userSetting.firstName || '',
        lastName: userSetting.lastName || '',
        country: userSetting.country || LocaleKey.tw,
        language: userSetting.language || LocaleKey.tw,
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
    };

    const data = userSettingValidateSchema.parse(correctUserSetting);
    return data;
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
