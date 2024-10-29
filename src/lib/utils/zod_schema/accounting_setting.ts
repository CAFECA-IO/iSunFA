import { z } from 'zod';
import { zodStringToNumber } from '@/lib/utils/zod_schema/common';

// Info: (20241029 - Jacky) Accounting setting null schema
const accountingSettingNullSchema = z.union([z.object({}), z.string()]);

// Info: (20241015 - Jacky) Accounting setting get schema
const accountingSettingGetQuerySchema = z.object({
  companyId: zodStringToNumber,
});

// Info: (20241015 - Jacky) Accounting setting put schema
const accountingSettingPutQuerySchema = z.object({
  companyId: zodStringToNumber,
});
const accountingSettingPutBodySchema = z.object({
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

// Info: (20241015 - Jacky) Accounting setting output schema
export const accountingSettingOutputSchema = z
  .object({
    id: z.number(),
    companyId: z.number(),
    taxSettings: z.object({
      salesTax: z.object({
        taxable: z.boolean(),
        rate: z.number(),
      }),
      purchaseTax: z.object({
        taxable: z.boolean(),
        rate: z.number(),
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
  })
  .transform((accountingSetting) => ({
    id: accountingSetting.id,
    companyId: accountingSetting.companyId,
    taxSettings: accountingSetting.taxSettings,
    currency: accountingSetting.currency,
    shortcutList: accountingSetting.shortcutList,
  }));

// Info: (20241015 - Jacky) Accounting setting validate schema
const accountingSettingValidateSchema = z.object({
  id: z.number(),
  companyId: z.number(),
  taxSettings: z.object({
    salesTax: z.object({
      taxable: z.boolean(),
      rate: z.number(),
    }),
    purchaseTax: z.object({
      taxable: z.boolean(),
      rate: z.number(),
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

export const accountingSettingGetSchema = {
  input: {
    querySchema: accountingSettingGetQuerySchema,
    bodySchema: accountingSettingNullSchema,
  },
  outputSchema: accountingSettingOutputSchema,
  frontend: accountingSettingValidateSchema,
};

export const accountingSettingPutSchema = {
  input: {
    querySchema: accountingSettingPutQuerySchema,
    bodySchema: accountingSettingPutBodySchema,
  },
  outputSchema: accountingSettingOutputSchema,
  frontend: accountingSettingValidateSchema,
};
