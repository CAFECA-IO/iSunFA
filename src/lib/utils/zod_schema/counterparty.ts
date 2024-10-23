import { z } from 'zod';
import { IZodValidator } from '@/interfaces/zod_validator';

// Info: (20241022 - Jacky) Counterparty list validator
const counterpartyListQueryValidator = z.object({
  companyId: z.number().int(),
  type: z.string().optional(),
  searchQuery: z.string().optional(),
  targetPage: z.number().int().optional(),
  pageSize: z.number().int().optional(),
});

const counterpartyListBodyValidator = z.object({});

export const counterpartyListValidator: IZodValidator<
  (typeof counterpartyListQueryValidator)['shape'],
  (typeof counterpartyListBodyValidator)['shape']
> = {
  query: counterpartyListQueryValidator,
  body: counterpartyListBodyValidator,
};

// Info: (20241022 - Jacky) Counterparty post validator
const counterpartyPostQueryValidator = z.object({});
const counterpartyPostBodyValidator = z.object({
  companyId: z.number().int(),
  name: z.string(),
  taxId: z.string(),
  type: z.string(),
  note: z.string().optional(),
});

export const counterpartyPostValidator: IZodValidator<
  (typeof counterpartyPostQueryValidator)['shape'],
  (typeof counterpartyPostBodyValidator)['shape']
> = {
  query: counterpartyPostQueryValidator,
  body: counterpartyPostBodyValidator,
};

// Info: (20241022 - Jacky) Counterparty get validator
const counterpartyGetByIdQueryValidator = z.object({
  counterpartyId: z.number().int(),
});
const counterpartyGetByIdBodyValidator = z.object({});

export const counterpartyGetByIdValidator: IZodValidator<
  (typeof counterpartyGetByIdQueryValidator)['shape'],
  (typeof counterpartyGetByIdBodyValidator)['shape']
> = {
  query: counterpartyGetByIdQueryValidator,
  body: counterpartyGetByIdBodyValidator,
};

// Info: (20241022 - Jacky) Counterparty put validator
const counterpartyPutQueryValidator = z.object({
  counterpartyId: z.number().int(),
});
const counterpartyPutBodyValidator = z.object({
  name: z.string(),
  taxId: z.string(),
  type: z.string(),
  note: z.string(),
});

export const counterpartyPutValidator: IZodValidator<
  (typeof counterpartyPutQueryValidator)['shape'],
  (typeof counterpartyPutBodyValidator)['shape']
> = {
  query: counterpartyPutQueryValidator,
  body: counterpartyPutBodyValidator,
};

// Info: (20241022 - Jacky) Counterparty delete validator
const counterpartyDeleteQueryValidator = z.object({
  counterpartyId: z.number().int(),
});
const counterpartyDeleteBodyValidator = z.object({});

export const counterpartyDeleteValidator: IZodValidator<
  (typeof counterpartyDeleteQueryValidator)['shape'],
  (typeof counterpartyDeleteBodyValidator)['shape']
> = {
  query: counterpartyDeleteQueryValidator,
  body: counterpartyDeleteBodyValidator,
};
