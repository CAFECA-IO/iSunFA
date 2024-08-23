import { STATUS_MESSAGE } from '@/constants/status_code';
import { Prisma } from '@prisma/client';

/**
 * Info (20240821 - Murky): Usage example:
 * export function isEventType(data: unknown): data is EventType {
 *   const isValid = isEnumValue(EventType, data);
 *   return isValid;
 * }
 * @param enumObj - The enum object to check against (Enum {...})
 * @param data - The data(string) to check if it is a value of the enum
 * @returns boolean
 */
export function isEnumValue<T extends { [s: string]: unknown | ArrayLike<unknown> }>(
  enumObj: T,
  data: unknown
): data is T[keyof T] {
  return Object.values(enumObj).includes(data as T[keyof T]);
}

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
