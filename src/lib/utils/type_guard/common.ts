import { STATUS_MESSAGE } from '@/constants/status_code';
import { Prisma } from '@prisma/client';

export function isParamOrQueryString(data: string | string[] | undefined): data is string {
  return typeof data === 'string';
}

export function isParamOrQueryNumericString(data: string | string[] | undefined): data is string {
  return isParamOrQueryString(data) && !Number.isNaN(Number(data));
}

export function isPrismaJsonArray(data: Prisma.JsonValue): data is Prisma.JsonArray {
  const isArray = Array.isArray(data);
  return isArray;
}

export function assertIsPrismaJsonArray(data: Prisma.JsonValue): asserts data is Prisma.JsonArray {
  if (!isPrismaJsonArray(data)) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_TYPE);
  }
}
