import { z } from 'zod';
import { IZodValidator } from '@/interfaces/zod_validator';

// Info: (20241015 - Jacky) Accounting setting get validator
const accountingSettingGetQueryValidator = z.object({
  companyId: z.number().int(),
});
const accountingSettingGetBodyValidator = z.object({});

export const accountingSettingGetValidator: IZodValidator<
  (typeof accountingSettingGetQueryValidator)['shape'],
  (typeof accountingSettingGetBodyValidator)['shape']
> = {
  query: accountingSettingGetQueryValidator,
  body: accountingSettingGetBodyValidator,
};

// Info: (20241015 - Jacky) Accounting setting put validator
const accountingSettingPutQueryValidator = z.object({
  companyId: z.number().int(),
});
const accountingSettingPutBodyValidator = z.object({
  id: z.number(),
  companyId: z.number().int(),
  taxSettings: z.object({
    salesTax: z.object({
      taxable: z.boolean(),
      rate: z.number().min(0),
    }),
    purchaseTax: z.object({
      taxable: z.boolean(),
      rate: z.number().min(0),
    }),
    returnPeriodicity: z.string(),
  }),
  currency: z.string(),
  shortcutList: z.array(
    z.object({
      action: z.object({
        name: z.string(),
        description: z.string(),
        fieldList: z.array(
          z.object({
            name: z.string(),
            value: z.string(),
          })
        ),
      }),
      keyList: z.array(z.string()),
    })
  ),
});

export const accountingSettingPutValidator: IZodValidator<
  (typeof accountingSettingPutQueryValidator)['shape'],
  (typeof accountingSettingPutBodyValidator)['shape']
> = {
  query: accountingSettingPutQueryValidator,
  body: accountingSettingPutBodyValidator,
};
