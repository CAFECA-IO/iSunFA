import { z } from 'zod';
import { IZodValidator } from '@/interfaces/zod_validator';

// Info: (20241015 - Jacky) User pending task validator
const userPendingTaskQueryValidator = z.object({
  userId: z.number().int(),
});

const userPendingTaskBodyValidator = z.undefined();

export const userPendingTaskValidator: IZodValidator<
  (typeof userPendingTaskQueryValidator)['shape']
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

const companyPendingTaskBodyValidator = z.undefined();

export const companyPendingTaskValidator: IZodValidator<
  (typeof companyPendingTaskQueryValidator)['shape']
> = {
  query: companyPendingTaskQueryValidator,
  body: companyPendingTaskBodyValidator,
};
