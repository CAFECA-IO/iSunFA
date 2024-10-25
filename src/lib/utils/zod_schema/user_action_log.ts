import { z } from 'zod';
import { IZodValidator } from '@/interfaces/zod_validator';
import { UserActionLogActionType } from '@/constants/user_action_log';

// Info: (20241015 - Jacky) User action log validator
const userActionLogQueryValidator = z.object({
  userId: z.number().int(),
  actionType: z.string(),
  targetPage: z.number().int().optional(),
  pageSize: z.number().int().optional(),
  startDateInSecond: z.number().int().optional(),
  endDateInSecond: z.number().int().optional(),
});

const userActionLogBodyValidator = z.object({});

export const userActionLogListValidator: IZodValidator<
  (typeof userActionLogQueryValidator)['shape'],
  (typeof userActionLogBodyValidator)['shape']
> = {
  query: userActionLogQueryValidator,
  body: userActionLogBodyValidator,
};

export const userActionLogSchema = z.object({
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

export const paginatedUserActionLogSchema = z.object({
  data: z.array(userActionLogSchema),
  page: z.number().int(),
  totalPages: z.number().int(),
  totalCount: z.number().int(),
  pageSize: z.number().int(),
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean(),
  sort: z.array(
    z.object({
      sortBy: z.string(),
      sortOrder: z.string(),
    })
  ),
});
