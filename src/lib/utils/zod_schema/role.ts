import { z } from 'zod';
import { IZodValidator } from '@/interfaces/zod_validator';

// Info: (20241015 - Jacky) Role list validator
const roleListQueryValidator = z.object({
  userId: z.number().int(),
});
const roleListBodyValidator = z.object({});

export const roleListValidator: IZodValidator<
  (typeof roleListQueryValidator)['shape'],
  (typeof roleListBodyValidator)['shape']
> = {
  query: roleListQueryValidator,
  body: roleListBodyValidator,
};

// Info: (20241015 - Jacky) Role post validator
const rolePostQueryValidator = z.object({});
const rolePostBodyValidator = z.object({
  userId: z.number().int(),
  roleId: z.number().int(),
});

export const rolePostValidator: IZodValidator<
  (typeof rolePostQueryValidator)['shape'],
  (typeof rolePostBodyValidator)['shape']
> = {
  query: rolePostQueryValidator,
  body: rolePostBodyValidator,
};

// Info: (20241015 - Jacky) Role select validator
const roleSelectQueryValidator = z.object({
  userId: z.number().int(),
  roleId: z.number().int(),
});
const roleSelectBodyValidator = z.object({});

export const roleSelectValidator: IZodValidator<
  (typeof roleSelectQueryValidator)['shape'],
  (typeof roleSelectBodyValidator)['shape']
> = {
  query: roleSelectQueryValidator,
  body: roleSelectBodyValidator,
};
