import { z } from 'zod';
import { IZodValidator } from '@/interfaces/zod_validator';

// Info: (20241015 - Jacky) Todo list validator
const todoListQueryValidator = z.object({
  userId: z.number().int(),
});
const todoListBodyValidator = z.object({});

export const todoListValidator: IZodValidator<
  (typeof todoListQueryValidator)['shape'],
  (typeof todoListBodyValidator)['shape']
> = {
  query: todoListQueryValidator,
  body: todoListBodyValidator,
};

// Info: (20241015 - Jacky) Todo post validator
const todoPostQueryValidator = z.object({
  userId: z.number().int(),
});
const todoPostBodyValidator = z.object({
  title: z.string(),
  content: z.string(),
  type: z.string(),
  time: z.number().int(),
  status: z.string(),
});

export const todoPostValidator: IZodValidator<
  (typeof todoPostQueryValidator)['shape'],
  (typeof todoPostBodyValidator)['shape']
> = {
  query: todoPostQueryValidator,
  body: todoPostBodyValidator,
};
