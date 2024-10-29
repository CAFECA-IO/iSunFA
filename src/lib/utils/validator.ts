import { API_ZOD_SCHEMA, ZOD_SCHEMA_API } from '@/constants/zod_schema';
// import { NextApiRequest } from 'next';
import { z } from 'zod';
// import { loggerRequest } from '@/lib/utils/logger_back';
// import { APIPath } from '@/constants/api_connection';
import { ApiValidationError } from '@/lib/utils/error/api_validation_error';
import { NextApiRequest } from 'next';
import { APIPath } from '@/constants/api_connection';
import { loggerRequest } from './logger_back';
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

export type query<T extends keyof typeof ZOD_SCHEMA_API> = z.infer<
  (typeof ZOD_SCHEMA_API)[T]['input']['querySchema']
>;
export type body<T extends keyof typeof ZOD_SCHEMA_API> = z.infer<
  (typeof ZOD_SCHEMA_API)[T]['input']['bodySchema']
>;
export type output<T extends keyof typeof ZOD_SCHEMA_API> = z.infer<
  (typeof ZOD_SCHEMA_API)[T]['outputSchema']
>;

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
    // // Info: (20241023 - Jacky) No logger used here, since this function needs to be used in the frontend too
    throw new ApiValidationError(`Data validation failed`, {
      dto: rawData,
      zodErrorMessage,
      issues: error.issues,
    });
  }
}

export function validateRequestData<T extends keyof typeof ZOD_SCHEMA_API>(
  apiName: T,
  req: NextApiRequest
): { query: query<T> | null; body: body<T> | null } {
  const { input } = ZOD_SCHEMA_API[apiName];
  const { querySchema, bodySchema } = input;
  let query = null;
  let body = null;

  try {
    query = validateAndFormatData(querySchema, req.query);
    body = validateAndFormatData(bodySchema, req.body);
  } catch (error) {
    // Info: (20240909 - Murky) if validator is z.ZodOptional (which used when query or body is not needed), it will return null
    query = null;
    body = null;
  }

  return { query, body };
}

export function validateOutputData<T extends keyof typeof ZOD_SCHEMA_API>(
  apiName: T,
  data: unknown
): output<T> | null {
  let outputData = null;
  const { outputSchema } = ZOD_SCHEMA_API[apiName];

  try {
    outputData = validateAndFormatData(outputSchema, data);
  } catch (error) {
    // Info: (20240909 - Murky) if validator is z.ZodOptional (which used when query or body is not needed), it will return null
    outputData = null;
  }

  return outputData;
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
    // Info: (20240909 - Murky) Validate query and body
    payload.query = validateAndFormatData(queryValidator, query);
    payload.body = validateAndFormatData(bodyValidator, body);
  } catch (_error) {
    const error = _error as ApiValidationError;
    const logger = loggerRequest(
      userId,
      APIPath[apiName],
      req.method || 'unknown',
      400,
      error,
      req.headers['user-agent'] || 'unknown user-agent',
      req.socket.remoteAddress || 'unknown ip'
    );

    logger.error('Request validation failed');
    // Info: (20240909 - Murky) if validator is z.ZodOptional (which used when query or body is not needed), it will return null
    payload = {
      query: null,
      body: null,
    };
  }

  return payload;
}
