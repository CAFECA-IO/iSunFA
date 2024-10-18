import { z } from 'zod';
import { IZodValidator } from '@/interfaces/zod_validator';
import { CompanyTag, CompanyUpdateAction } from '@/constants/company';

// Info: (20241016 - Jacky) Company list validator
const companyListQueryValidator = z.object({
  searchQuery: z.string().optional(),
  targetPage: z.number().int().optional(),
  pageSize: z.number().int().optional(),
});

const companyListBodyValidator = z.undefined();

export const companyListValidator: IZodValidator<(typeof companyListQueryValidator)['shape']> = {
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

// Info: (20241016 - Jacky) Company get validator
const companyGetByIdQueryValidator = z.object({
  companyId: z.number().int(),
});
const companyGetByIdBodyValidator = z.undefined();

export const companyGetByIdValidator: IZodValidator<
  (typeof companyGetByIdQueryValidator)['shape']
> = {
  query: companyGetByIdQueryValidator,
  body: companyGetByIdBodyValidator,
};

// Info: (20241016 - Jacky) Company put validator
const companyPutQueryValidator = z.object({
  companyId: z.number().int(),
});
const companyPutBodyValidator = z.object({
  action: z.nativeEnum(CompanyUpdateAction),
  tag: z.nativeEnum(CompanyTag).optional(),
});

export const companyPutValidator: IZodValidator<
  (typeof companyPutQueryValidator)['shape'],
  (typeof companyPutBodyValidator)['shape']
> = {
  query: companyPutQueryValidator,
  body: companyPutBodyValidator,
};

// Info: (20241016 - Jacky) Company delete validator
const companyDeleteQueryValidator = z.object({
  companyId: z.number().int(),
});
const companyDeleteBodyValidator = z.object({});

export const companyDeleteValidator: IZodValidator<
  (typeof companyDeleteQueryValidator)['shape'],
  (typeof companyDeleteBodyValidator)['shape']
> = {
  query: companyDeleteQueryValidator,
  body: companyDeleteBodyValidator,
};

// Info: (20241015 - Jacky) Company select validator
const companySelectQueryValidator = z.object({
  companyId: z.number().int(),
});
const companySelectBodyValidator = z.undefined();

export const companySelectValidator: IZodValidator<(typeof companySelectQueryValidator)['shape']> =
  {
    query: companySelectQueryValidator,
    body: companySelectBodyValidator,
  };
