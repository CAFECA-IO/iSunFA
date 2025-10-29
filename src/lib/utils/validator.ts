import { API_ZOD_SCHEMA, ZOD_SCHEMA_API } from '@/constants/zod_schema';
import { z } from 'zod';
import { ApiValidationError } from '@/lib/utils/error/api_validation_error';
import { NextApiRequest } from 'next';
import { APIName } from '@/constants/api_connection';
import { loggerError } from '@/lib/utils/logger_back';
import { DefaultValue } from '@/constants/default_value';

/*
 * Info: (20240909 - Murky) Record need to implement all the keys of the enum,
 * it will cause error when not implement all the keys
 * use code below after all the keys are implemented
 */
// import { APIName } from "@/constants/api_connection";
// export function validateRequest(
//  apiName: APIName,
//  req: NextApiRequest,
//  res: NextApiResponse) {
export type API_ZodSchema = typeof API_ZOD_SCHEMA;
export type QueryType<T extends keyof API_ZodSchema> = z.infer<API_ZodSchema[T]['query']>;
export type BodyType<T extends keyof API_ZodSchema> = z.infer<API_ZodSchema[T]['body']>;

export type query<T extends APIName> = z.infer<(typeof ZOD_SCHEMA_API)[T]['input']['querySchema']>;
export type body<T extends APIName> = z.infer<(typeof ZOD_SCHEMA_API)[T]['input']['bodySchema']>;
export type output<T extends APIName> = z.infer<(typeof ZOD_SCHEMA_API)[T]['outputSchema']>;

/**
 * // Info: (20241023 - Jacky) Validates and formats data using a Zod schema.
 *
 * @template T - The Zod schema type.
 * @param {unknown} rawData - The raw data to validate.
 * @param {T} schema - The Zod schema to validate against.
 * @returns {z.infer<T>} - The validated and formatted data.
 * @throws {ApiValidationError} - If validation fails.
 *
 * @example
 * const schema = z.object({
 *   id: z.number()
 * });
 *
 * export type AccountDetailsResponse = z.infer<typeof schema>;
 *
 * function validate(dto: unknown): AccountDetailsResponse {
 *   return validateAndFormatData(dto, schema);
 * }
 *
 * export async function getAccountDetails(): Promise<AccountDetailsResponse> {
 *   const response = await apiClient.get("/api/v1/account/details");
 *   return validate(response.data);
 * }
 */
export function validateAndFormatData<T extends z.ZodTypeAny>(
  schema: T,
  rawData: unknown
): z.infer<T> {
  const { data, success, error } = schema.safeParse(rawData);
  if (success) {
    return data;
  } else {
    const zodErrorMessage = JSON.parse(JSON.stringify(error.message));
    const errorOption = {
      dto: rawData,
      zodErrorMessage,
      issues: error.issues,
    };
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'Validate and format data by zod failed',
      errorMessage: JSON.stringify(errorOption),
    });
    throw new ApiValidationError(`Data validation failed`, errorOption);
  }
}

export function validateRequestData<T extends APIName>(
  apiName: T,
  req: NextApiRequest
): { query: query<T>; body: body<T> } {
  const { input } = ZOD_SCHEMA_API[apiName];
  const { querySchema, bodySchema } = input;

  /**
   * ToDo: (20250925 - Luphia) Error Handling Issue
   * If query or body is invalid, ** JUST throw the error **
   * Parsing returns null instead of throwing an error, making it difficult for tests to catch failures
   */
  let query: query<T>;
  let body: body<T>;
  try {
    // ToDo: (20251028 - Luphia) reDesign validateAndFormatData function.
    query = validateAndFormatData(querySchema, req.query) as query<T>;
    body = validateAndFormatData(bodySchema, req.body) as body<T>;
  } catch (error) {
    query = null as unknown as query<T>;
    body = null as unknown as body<T>;
    (error as Error).message += ` | API Name: ${apiName} | Request Data Validation Failed`;
  }

  return { query, body };
}

export function validateOutputData<T extends keyof typeof ZOD_SCHEMA_API>(
  apiName: T,
  data: unknown
): { isOutputDataValid: boolean; outputData: output<T> | null } {
  let outputData = null;
  let isOutputDataValid = true;
  const { outputSchema } = ZOD_SCHEMA_API[apiName];

  try {
    outputData = validateAndFormatData(outputSchema, data);
  } catch (error) {
    isOutputDataValid = false;
    outputData = null;
    (error as Error).message += ` | API Name: ${apiName} | Output Data Validation Failed`;
  }

  return { isOutputDataValid, outputData };
}

export function validateRequest<T extends keyof typeof API_ZOD_SCHEMA>(
  apiName: T,
  req: NextApiRequest,
  userId: number = -1
): { query: QueryType<T> | null; body: BodyType<T> | null } {
  const { query: queryValidator, body: bodyValidator } = API_ZOD_SCHEMA[apiName];
  const { query, body } = req;

  // Info: (20240909 - Murky) If validation failed, it will return null, go to logger to check why it failed
  let payload: {
    query: QueryType<T> | null;
    body: BodyType<T> | null;
  } = {
    query: null,
    body: null,
  };

  try {
    // ToDo: (20251028 - Luphia) reDesign validateAndFormatData function.
    payload.query = validateAndFormatData(queryValidator, query) as QueryType<T>;
    payload.body = validateAndFormatData(bodyValidator, body) as BodyType<T>;
  } catch (_error) {
    const error = _error as ApiValidationError;
    loggerError({
      userId,
      errorType: 'Request validation failed',
      errorMessage: error,
    });

    // Info: (20240909 - Murky) if validator is z.ZodOptional (which used when query or body is not needed), it will return null
    payload = {
      query: null,
      body: null,
    };
  }

  return payload;
}
