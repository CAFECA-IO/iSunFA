import { z } from 'zod';
import { zodStringToNumber } from '@/lib/utils/zod_schema/common';
import { LocaleKey } from '@/constants/normal_setting';

// Info: (20241029 - Jacky) Company setting null schema
const companySettingNullSchema = z.union([z.object({}), z.string()]);

// Info: (20241023 - Jacky) Company setting get schema
const companySettingGetQuerySchema = z.object({
  accountBookId: zodStringToNumber,
});

// Info: (20241023 - Jacky) Company setting put schema
const companySettingPutQuerySchema = z.object({
  accountBookId: zodStringToNumber,
});
const companySettingPutBodySchema = z.object({
  id: z.number().optional(),
  accountBookId: z.number().int().optional(),
  companyName: z.string(),
  companyTaxId: z.string(),
  taxSerialNumber: z.string(),
  representativeName: z.string(),
  country: z.nativeEnum(LocaleKey),
  countryCode: z.nativeEnum(LocaleKey),
  phone: z.string(),
  address: z.string(),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
});

// Info: (20241029 - Jacky) Company setting output schema
export const companySettingOutputSchema = z
  .object({
    id: z.number(),
    accountBookId: z.number(),
    accountBook: z.object({
      name: z.string(),
      taxId: z.string(),
    }),
    taxSerialNumber: z.string().nullable().default(''),
    representativeName: z.string().nullable().default(''),
    country: z.string().nullable().default(''),
    phone: z.string().nullable().default(''),
    address: z.string().nullable().default(''),
    createdAt: z.number(),
    updatedAt: z.number(),
  })
  .transform((companySetting) => ({
    id: companySetting.id,
    accountBookId: companySetting.accountBookId,
    accountBookName: companySetting.accountBook.name || '',
    accountBookTaxId: companySetting.accountBook.taxId || '',
    taxSerialNumber: companySetting.taxSerialNumber || '',
    representativeName: companySetting.representativeName || '',
    country: LocaleKey.en || null,
    countryCode: LocaleKey.en,
    phone: companySetting.phone || '',
    address: companySetting.address || '',
    createdAt: companySetting.createdAt,
    updatedAt: companySetting.updatedAt,
  }));

// Info: (20241029 - Jacky) Company setting validate schema
const companySettingValidateSchema = z.object({
  id: z.number(),
  accountBookId: z.number(),
  companyName: z.string(),
  companyTaxId: z.string(),
  taxSerialNumber: z.string(),
  representativeName: z.string(),
  country: z.string(),
  phone: z.string(),
  address: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const companySettingGetSchema = {
  input: {
    querySchema: companySettingGetQuerySchema,
    bodySchema: companySettingNullSchema,
  },
  outputSchema: companySettingOutputSchema,
  frontend: companySettingValidateSchema,
};

export const companySettingPutSchema = {
  input: {
    querySchema: companySettingPutQuerySchema,
    bodySchema: companySettingPutBodySchema,
  },
  outputSchema: companySettingOutputSchema,
  frontend: companySettingValidateSchema,
};
