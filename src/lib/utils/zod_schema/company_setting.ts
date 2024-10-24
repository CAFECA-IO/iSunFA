import { z } from 'zod';
import { IZodValidator } from '@/interfaces/zod_validator';

// Info: (20241023 - Jacky) Company setting get validator
const companySettingGetQueryValidator = z.object({
  companyId: z.number().int(),
});
const companySettingGetBodyValidator = z.object({});

export const companySettingGetValidator: IZodValidator<
  (typeof companySettingGetQueryValidator)['shape'],
  (typeof companySettingGetBodyValidator)['shape']
> = {
  query: companySettingGetQueryValidator,
  body: companySettingGetBodyValidator,
};

// Info: (20241023 - Jacky) Company setting put validator
const companySettingPutQueryValidator = z.object({
  companyId: z.number().int(),
});
const companySettingPutBodyValidator = z.object({
  id: z.number(),
  companyId: z.number().int(),
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

export const companySettingPutValidator: IZodValidator<
  (typeof companySettingPutQueryValidator)['shape'],
  (typeof companySettingPutBodyValidator)['shape']
> = {
  query: companySettingPutQueryValidator,
  body: companySettingPutBodyValidator,
};

export const CompanySettingSchema = z
  .object({
    id: z.number(),
    companyId: z.number(),
    company: z.object({
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
    companyId: companySetting.companyId,
    companyName: companySetting.company.name || '',
    companyTaxId: companySetting.company.taxId || '',
    taxSerialNumber: companySetting.taxSerialNumber || '',
    representativeName: companySetting.representativeName || '',
    country: companySetting.country || '',
    phone: companySetting.phone || '',
    address: companySetting.address || '',
    createdAt: companySetting.createdAt,
    updatedAt: companySetting.updatedAt,
  }));
