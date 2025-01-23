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

export interface ZodAPISchema {
  input: {
    querySchema: z.ZodTypeAny;
    bodySchema: z.ZodTypeAny;
  };
  outputSchema: z.ZodTypeAny;
  frontend: z.ZodTypeAny;
}
