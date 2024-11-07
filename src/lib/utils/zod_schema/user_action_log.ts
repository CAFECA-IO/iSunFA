import { z } from 'zod';
import { UserActionLogActionType } from '@/constants/user_action_log';
import { zodStringToNumber, zodStringToNumberWithDefault } from '@/lib/utils/zod_schema/common';
import { DEFAULT_PAGE_START_AT, DEFAULT_PAGE_LIMIT } from '@/constants/config';
import { paginatedDataSchema } from '@/lib/utils/zod_schema/pagination';

// Info: (20241029 - Jacky) User action log null schema
const userActionLogNullSchema = z.union([z.object({}), z.string()]);

// Info: (20241015 - Jacky) User action log query schema
const userActionLogQuerySchema = z.object({
  userId: zodStringToNumber,
  actionType: z.string(),
  page: zodStringToNumberWithDefault(DEFAULT_PAGE_START_AT),
  pageSize: zodStringToNumberWithDefault(DEFAULT_PAGE_LIMIT),
  startDateInSecond: zodStringToNumber.optional(),
  endDateInSecond: zodStringToNumber.optional(),
});

// Info: (20241015 - Jacky) User action log output schema
const userActionLogOutputSchema = z.object({
  id: z.number().int(),
  sessionId: z.string(),
  userId: z.number().int(),
  actionType: z.nativeEnum(UserActionLogActionType),
  actionDescription: z.string(),
  actionTime: z.number().int(),
  ipAddress: z.string(),
  userAgent: z.string(),
  apiEndpoint: z.string(),
  httpMethod: z.string(),
  requestPayload: z.record(z.string(), z.string()),
  httpStatusCode: z.number().int(),
  statusMessage: z.string(),
});

// Info: (20241015 - Jacky) Paginated user action log schema
const paginatedUserActionLogSchema = paginatedDataSchema(userActionLogOutputSchema);

export const userActionLogListSchema = {
  input: {
    querySchema: userActionLogQuerySchema,
    bodySchema: userActionLogNullSchema,
  },
  outputSchema: paginatedUserActionLogSchema,
  frontend: userActionLogNullSchema,
};
