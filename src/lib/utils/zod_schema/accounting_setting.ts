import { z } from 'zod';
import { zodStringToNumber } from '@/lib/utils/zod_schema/common';
import { CurrencyType } from '@/constants/currency';

// Info: (20241029 - Jacky) Accounting setting null schema
const accountingSettingNullSchema = z.union([z.object({}), z.string()]);

// Info: (20241015 - Jacky) Accounting setting get schema
const accountingSettingGetQuerySchema = z.object({
  accountBookId: zodStringToNumber,
});

// Todo: (20250425 - Shirley) Share enum between frontend and backend
const validReturnPeriodicity = ['Monthly', 'Weekly'] as const;
type ReturnPeriodicity = (typeof validReturnPeriodicity)[number];

// Todo: (20250425 - Shirley) Share enum between frontend and backend
const returnPeriodicitySchema = z
  .string()
  .transform((val) => {
    const normalized = val.trim().toLowerCase();
    if (normalized === 'monthly') return 'Monthly';
    if (normalized === 'weekly') return 'Weekly';
    return val;
  })
  .refine(
    (val): val is ReturnPeriodicity => validReturnPeriodicity.includes(val as ReturnPeriodicity),
    {
      message: `Return periodicity must be one of: ${validReturnPeriodicity.join(', ')}`,
    }
  );

// Info: (20241015 - Jacky) Accounting setting put schema
const accountingSettingPutQuerySchema = z.object({
  accountBookId: zodStringToNumber,
});
const accountingSettingPutBodySchema = z.object({
  id: z.number(),
  accountBookId: z.number().int(),
  taxSettings: z.object({
    salesTax: z.object({
      taxable: z.boolean(),
      rate: z.number().min(0),
    }),
    purchaseTax: z.object({
      taxable: z.boolean(),
      rate: z.number().min(0),
    }),
    // Info: (20250425 - Shirley) Normalize and restrict returnPeriodicity to only accept 'Monthly' or 'Weekly'
    returnPeriodicity: returnPeriodicitySchema,
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
    accountBookId: z.number(),
    taxSettings: z.object({
      salesTax: z.object({
        taxable: z.boolean(),
        rate: z.number(),
      }),
      purchaseTax: z.object({
        taxable: z.boolean(),
        rate: z.number(),
      }),
      // Info: (20250425 - Shirley) Normalize and restrict returnPeriodicity to only accept 'Monthly' or 'Weekly'
      returnPeriodicity: returnPeriodicitySchema,
    }),
    currency: z.string().default(CurrencyType.TWD),
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
    accountBookId: accountingSetting.accountBookId,
    taxSettings: accountingSetting.taxSettings,
    currency: accountingSetting.currency,
    shortcutList: accountingSetting.shortcutList,
  }));

// Info: (20241015 - Jacky) Accounting setting validate schema
const accountingSettingValidateSchema = z.object({
  id: z.number(),
  accountBookId: z.number(),
  taxSettings: z.object({
    salesTax: z.object({
      taxable: z.boolean(),
      rate: z.number(),
    }),
    purchaseTax: z.object({
      taxable: z.boolean(),
      rate: z.number(),
    }),
    // Info: (20250425 - Shirley) Normalize and restrict returnPeriodicity to only accept 'Monthly' or 'Weekly'
    returnPeriodicity: returnPeriodicitySchema,
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

// Info: (20250425 - Shirley) Update entity validator to normalize and enforce valid return periodicity values
export const accountingSettingEntityValidator = z.object({
  accountBookId: z.number(),
  currency: z.nativeEnum(CurrencyType),
  salesTaxRate: z.number(),
  salesTaxTaxable: z.boolean(),
  purchaseTaxRate: z.number(),
  purchaseTaxTaxable: z.boolean(),
  returnPeriodicity: returnPeriodicitySchema,
});
