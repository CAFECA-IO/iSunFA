/*
 * Info: (20240909 - Murky) This file is to demonstrate how to use Zod schema to validate data.
 * check more validator function in:https://www.npmjs.com/package/zod#primitives
 */
import { IZodValidator } from '@/interfaces/zod_validator';
import { z } from 'zod';
import { zodStringToNumber } from '@/lib/utils/zod_schema/common';

enum testEnum {
  A = 'A',
  B = 'B',
  C = 'C',
}

const queryValidator = z.object({
  name: z.string().min(3),
  /**
   * Info: (20240909 - Murky)
   * There is plenty of ways to validate numeric string,
   * Check: https://github.com/colinhacks/zod/discussions/330
   */
  age: zodStringToNumber,
  email: z.string().email(),
  password: z.string().min(6),
  testEnum: z.nativeEnum(testEnum),
});

// Info: (20240909 - Murky) If you want to validate body, you can add bodyValidator
// const bodyValidator = z.object({
//     bodyName: z.string().min(3),
// });

// export const zodExampleValidator: IZodValidator<
//     typeof queryValidator['shape'],
//     typeof bodyValidator['shape']
// > = {
//     query: queryValidator,
//     body: bodyValidator,
// };

// Info: (20241017 - Jacky) If you don't want to validate body, you can use z.undefined()
const bodyValidator = z.object({});

export const zodExampleValidator: IZodValidator<
  (typeof queryValidator)['shape'],
  (typeof bodyValidator)['shape']
> = {
  query: queryValidator,
  body: bodyValidator,
};

export const zodExampleValidators: {
  [method: string]: IZodValidator<z.ZodRawShape, z.ZodRawShape>;
} = {
  GET_ONE: zodExampleValidator,
  POST: zodExampleValidator,
  PUT: zodExampleValidator,
  DELETE: zodExampleValidator,
};
