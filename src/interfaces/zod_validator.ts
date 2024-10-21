import { APIName } from '@/constants/api_connection';
import { z } from 'zod';
// Info: (20240909 - Murky) This interface is specifically for validator of api

// export interface IZodValidator<T extends z.ZodRawShape, U extends z.ZodRawShape> {
//     query: z.ZodObject<T> | z.ZodUndefined, // T 用于表示 query 的 Zod schema 类型
//     body: z.ZodObject<U> | z.ZodUndefined, // U 用于表示 body 的 Zod schema 类型
// }

export interface IZodValidator<
  T extends z.ZodRawShape | undefined = undefined,
  U extends z.ZodRawShape | undefined = undefined,
> {
  query: T extends z.ZodRawShape ? z.ZodObject<T> : z.ZodUndefined;
  body: U extends z.ZodRawShape ? z.ZodObject<U> : z.ZodUndefined;
}

/**
 * Info: (20241021 - Murky)
 * @description This interface is specifically for validator of api output,
 * can be used to validate the input from backend too
 */
export interface ZodValidateConfig<T extends z.ZodTypeAny> {
  /**
   * Info: (20241021 - Murky)
   * data that need to be validated
   */
  dto: unknown;
  /**
   * Info: (20241021 - Murky)
   * Zod Schema that used to validate the dto
   */
  schema: T;
  /**
   * Info: (20241021 - Murky)
   * API name that used to log the error message
   */
  apiName: APIName;
}
