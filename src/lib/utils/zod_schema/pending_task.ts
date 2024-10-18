import { z } from 'zod';
import { IZodValidator } from '@/interfaces/zod_validator';

// Info: (20241015 - Jacky) User pending task validator
const userPendingTaskQueryValidator = z.object({
  userId: z.number().int(),
});

const userPendingTaskBodyValidator = z.object({});

export const userPendingTaskValidator: IZodValidator<
  (typeof userPendingTaskQueryValidator)['shape'],
  (typeof userPendingTaskBodyValidator)['shape']
> = {
  query: userPendingTaskQueryValidator,
  body: userPendingTaskBodyValidator,
};

// Info: (20241015 - Jacky) Company pending task validator
const companyPendingTaskQueryValidator = z.object({
  companyId: z.number().int(),
  status: z.string().optional(),
  dueDate: z.number().int().optional(),
});

const companyPendingTaskBodyValidator = z.object({});

export const companyPendingTaskValidator: IZodValidator<
  (typeof companyPendingTaskQueryValidator)['shape'],
  (typeof companyPendingTaskBodyValidator)['shape']
> = {
  query: companyPendingTaskQueryValidator,
  body: companyPendingTaskBodyValidator,
};
