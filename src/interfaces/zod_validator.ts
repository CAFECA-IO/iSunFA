import { z } from 'zod';
// Info: (20240909 - Murky) This interface is specifically for validator of api

// export interface IZodValidator<T extends z.ZodRawShape, U extends z.ZodRawShape> {
//     query: z.ZodObject<T> | z.ZodUndefined, // T 用于表示 query 的 Zod schema 类型
//     body: z.ZodObject<U> | z.ZodUndefined, // U 用于表示 body 的 Zod schema 类型
// }

export interface IZodValidator<
  T extends z.ZodRawShape | z.ZodOptional<z.ZodNullable<z.ZodString>>,
  U extends z.ZodRawShape | z.ZodOptional<z.ZodNullable<z.ZodString>>,
> {
  // Info: (20240909 - Murky) If T is undefined, query is z.ZodUndefined, otherwise it is z.ZodObject<T>
  query: T extends z.ZodRawShape ? z.ZodObject<T> : z.ZodOptional<z.ZodNullable<z.ZodString>>;

  // Info: (20240909 - Murky) If U is undefined, body is z.ZodUndefined, otherwise it is z.ZodObject<U>
  body: U extends z.ZodRawShape ? z.ZodObject<U> : z.ZodOptional<z.ZodNullable<z.ZodString>>;
}
