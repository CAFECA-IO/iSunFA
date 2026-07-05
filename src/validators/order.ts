import { z } from "zod";
import { ORDER_TYPE } from "@/constants/status";

// Info: (20260701 - Tzuhan) Validator for creating OEN_PAYMENT orders
export const generatePaymentOrderSchema = z.object({
  type: z.nativeEnum(ORDER_TYPE),
  amount: z
    .union([z.number(), z.string()])
    .transform((val) => Number(val))
    .refine((val) => val > 0, {
      message: "Amount must be greater than 0",
    }),
  credits: z
    .union([z.number(), z.string()])
    .transform((val) => Number(val))
    .refine((val) => !isNaN(val) && val >= 0, {
      message: "Credits must be greater than or equal to 0",
    })
    .optional()
    .default(0),
  paymentMethodId: z.string().min(1),
  unit: z.string().optional(),
  title: z.string().optional(),
  planId: z.string().optional(),
  billingInterval: z.enum(["month", "year"]).optional(),
  baseCredits: z.union([z.number(), z.string()]).optional(),
  bonusCredits: z.union([z.number(), z.string()]).optional(),
  items: z.array(z.any()).optional(),
  data: z.record(z.any()).optional(),
});
