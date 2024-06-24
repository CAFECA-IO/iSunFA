import { STATUS_MESSAGE } from '@/constants/status_code';

// Info (20240620 - Murky): Type Guard can input any type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isNumber(number: any): number is number {
  return typeof number === 'number';
}

// Info (20240620 - Murky): Type Guard can input any type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isString(string: any): string is string {
  return typeof string === 'string';
}

// Info (20240620 - Murky): This function wrap throw error part so that is easier to use
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function assertIsNumber(number: any): asserts number is number {
  if (!isNumber(number)) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_TYPE);
  }
}

// Info (20240620 - Murky): This function wrap throw error part so that is easier to use
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function assertIsString(string: any): asserts string is string {
  if (!isString(string)) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_TYPE);
  }
}

export function isParamOrQueryString(data: string | string[] | undefined): data is string {
  return typeof data === 'string';
}

export function isParamOrQueryNumericString(data: string | string[] | undefined): data is string {
  return isParamOrQueryString(data) && !Number.isNaN(Number(data));
}
