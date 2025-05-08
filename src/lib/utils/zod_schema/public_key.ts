import { z } from 'zod';
import { nullSchema, zodStringToNumber } from '@/lib/utils/zod_schema/common';
import { JsonWebKeySchema } from '@/lib/utils/zod_schema/json_web_key';

/**
 * Info: (20250505 - Shirley) PUBLIC_KEY_GET API query schema
 * Defines the query parameters required for retrieving a public key
 */
const publicKeyGetQuerySchema = z.object({
  accountBookId: zodStringToNumber,
});

/**
 * Info: (20250505 - Shirley) PUBLIC_KEY_GET API body schema
 * No body is required for the GET request
 */
const publicKeyGetBodySchema = nullSchema;

/**
 * Info: (20250505 - Shirley) PUBLIC_KEY_GET API output schema
 * Defines the response schema for the public key
 */
const publicKeyGetOutputSchema = JsonWebKeySchema.nullable();

/**
 * Info: (20250505 - Shirley) PUBLIC_KEY_GET API schema
 * Combines query, body, and output schemas for the PUBLIC_KEY_GET API
 */
export const publicKeyGetSchema = {
  input: {
    querySchema: publicKeyGetQuerySchema,
    bodySchema: publicKeyGetBodySchema,
  },
  outputSchema: publicKeyGetOutputSchema,
  frontend: nullSchema,
};
