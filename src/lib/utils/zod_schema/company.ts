import { z } from 'zod';
import { IZodValidator } from '@/interfaces/zod_validator';
import { CompanyTag } from '@/constants/company';

// Info: (20241016 - Jacky) Company list validator
const companyListQueryValidator = z.object({
  searchQuery: z.string().optional(),
  targetPage: z.number().int().optional(),
  pageSize: z.number().int().optional(),
});

const companyListBodyValidator = z.object({});

export const companyListValidator: IZodValidator<
  (typeof companyListQueryValidator)['shape'],
  (typeof companyListBodyValidator)['shape']
> = {
  query: companyListQueryValidator,
  body: companyListBodyValidator,
};

// Info: (20241016 - Jacky) Company post validator
const companyPostQueryValidator = z.object({});
const companyPostBodyValidator = z.object({
  name: z.string(),
  taxId: z.string(),
  tag: z.nativeEnum(CompanyTag),
});

export const companyPostValidator: IZodValidator<
  (typeof companyPostQueryValidator)['shape'],
  (typeof companyPostBodyValidator)['shape']
> = {
  query: companyPostQueryValidator,
  body: companyPostBodyValidator,
};

// Info: (20241015 - Jacky) Company select validator
const companySelectQueryValidator = z.object({
  companyId: z.number().int(),
});
const companySelectBodyValidator = z.object({});

export const companySelectValidator: IZodValidator<
  (typeof companySelectQueryValidator)['shape'],
  (typeof companySelectBodyValidator)['shape']
> = {
  query: companySelectQueryValidator,
  body: companySelectBodyValidator,
};
