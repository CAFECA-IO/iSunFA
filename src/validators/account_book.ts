import { z } from "zod";

// Info: (20260512 - Tzuhan) Create AccountBook Validator
export const CreateAccountBookSchema = z.object({
  name: z.string().min(1),
  country: z.string().min(1),
  currency: z.string().min(1),
  rule: z.string().min(1),
  teamId: z.string().min(1),
  enterpriseId: z.string().nullable().optional(),
  startYear: z.number().int().min(1990).max(2050).optional(),
  esgIndustryId: z.number().int().nullable().optional(),
  parValue: z
    .number()
    .positive("parValue 必須為正數 (Must be positive)")
    .optional(),
});

// Info: (20260512 - Tzuhan) Update AccountBook Validator
export const UpdateAccountBookSchema = z.object({
  name: z.string().min(1).optional(),
  country: z.string().optional(),
  currency: z.string().optional(),
  rule: z.string().optional(),
  enterpriseId: z.string().nullable().optional(),
  startYear: z.number().int().min(1990).max(2050).optional(),
  esgIndustryId: z.number().int().nullable().optional(),
  parValue: z
    .number()
    .positive("parValue 必須為正數 (Must be positive)")
    .optional(),
});
