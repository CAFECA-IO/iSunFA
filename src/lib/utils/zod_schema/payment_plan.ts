import { z } from 'zod';
import { TPlanType } from '@/interfaces/subscription';

// Info: (20250225 - Shirley) 定義 Feature 的 Schema
const featureSchema = z.object({
  id: z.string(),
  name: z.string(),
  value: z.union([z.string(), z.array(z.string())]),
});

// Info: (20250225 - Shirley) 定義 PaymentPlan 的 Schema
const paymentPlanSchema = z.object({
  id: z.nativeEnum(TPlanType),
  planName: z.string(),
  price: z.number(),
  extraMemberPrice: z.number().optional(),
  features: z.array(featureSchema),
});

// Info: (20250225 - Shirley) 定義 API 回應的 Schema
const paymentPlanResponseSchema = z.array(paymentPlanSchema);

// Info: (20250225 - Shirley) 定義空的查詢參數 Schema（因為這個 API 不需要任何參數）
const paymentPlanNullSchema = z.union([z.object({}), z.string()]);

// Info: (20250225 - Shirley) 導出 Schema
export const paymentPlanListSchema = {
  input: {
    querySchema: paymentPlanNullSchema,
    bodySchema: paymentPlanNullSchema,
  },
  outputSchema: paymentPlanResponseSchema,
  frontend: paymentPlanNullSchema,
};

// Info: (20250225 - Shirley) 導出型別
export type IFeatureSchema = z.infer<typeof featureSchema>;
export type IPaymentPlanSchema = z.infer<typeof paymentPlanSchema>;
export type IPaymentPlanResponse = z.infer<typeof paymentPlanResponseSchema>;
