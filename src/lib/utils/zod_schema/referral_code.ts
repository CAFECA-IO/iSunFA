import { z } from 'zod';

const getReferralCodeQuerySchema = z.object({
  code: z.string(),
});

const getReferralCodeOutputSchema = z.object({
  userId: z.number(),
  code: z.string(),
  discountPercentage: z.number().min(0).max(1),
  discountAmount: z.number().min(0),
});

const getReferralCodeSchema = {
  input: {
    querySchema: getReferralCodeQuerySchema,
    bodySchema: z.any().optional(),
  },
  outputSchema: getReferralCodeOutputSchema,
  frontend: getReferralCodeOutputSchema,
};

export { getReferralCodeSchema };
