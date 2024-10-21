import { API_ZOD_SCHEMA } from '@/constants/zod_schema';
import { NextApiRequest } from 'next';
import { z } from 'zod';
import { loggerRequest } from '@/lib/utils/logger_back';
import { APIPath } from '@/constants/api_connection';
import { ZodValidateConfig } from '@/interfaces/zod_validator';
import { ApiValidationError } from '@/lib/utils/error/api_validation_error';
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

export function validateRequest<T extends keyof typeof API_ZOD_SCHEMA>(
  apiName: T,
  req: NextApiRequest,
  userId: number = -1
): { query: QueryType<T> | null; body: BodyType<T> | null } {
  const { query: queryValidator, body: bodyValidator } = API_ZOD_SCHEMA[apiName];

  const { query, body } = req;

  // Info: (20240909 - Murky) Validate query and body
  const queryResult = queryValidator.safeParse(query);
  const bodyResult = bodyValidator.safeParse(body);

  // Info: (20240909 - Murky) If validation failed, it will return null, go to logger to check why it failed
  let payload: {
    query: QueryType<T> | null;
    body: BodyType<T> | null;
  } = {
    query: null,
    body: null,
  };

  if (!queryResult.success || !bodyResult.success) {
    // Info: (20240909 - Murky) It will return why error is caused, or what is the data if success
    const errorFormat = {
      query: queryResult.error ? queryResult.error.format() : query.data,
      body: bodyResult.error ? bodyResult.error.format() : body.data,
    };

    const logger = loggerRequest(
      userId,
      APIPath[apiName],
      req.method || 'unknown',
      400,
      errorFormat,
      req.headers['user-agent'] || 'unknown user-agent',
      req.socket.remoteAddress || 'unknown ip'
    );

    logger.error('Request validation failed');
  } else {
    // Info: (20240909 - Murky) if validator is z.ZodOptional (which used when query or body is not needed), it will return null
    payload = {
      query: queryValidator instanceof z.ZodOptional ? null : queryResult.data,
      body: bodyValidator instanceof z.ZodOptional ? null : bodyResult.data,
    };
  }

  return payload;
}

/**
 * Info: (20241021 - Murky)
 * @description This function is used to validate the response sending from the backend
 * @note Reference https://laniewski.me/blog/2023-11-19-api-response-validation-with-zod/
 * @example
 * const schema = z.object({
 *  id: z.number()
 * })
 *
 * export type AccountDetailsResponse = z.infer<typeof schema>;
 *
 * function validate(dto: unknown): AccountDetailsResponse {
    return validateSchema({ dto, schema, apiName: 'APIName.GET_ACCOUNT' });
  }
 *
 * export async function getAccountDetails(): Promise<AccountDetailsResponse> {
 *    const response = await apiClient.get("/api/v1/account/details");
 *    return validate(response.data);
 * }
 */
export function validateApiResponse<T extends z.ZodTypeAny>(
  config: ZodValidateConfig<T>
): z.infer<T> {
  const { data, success, error } = config.schema.safeParse(config.dto);

  if (success) {
    return data;
  } else {
    // ToDo: (20241021 - Murky) No logger used here, since this function need to be used in the frontend too
    throw new ApiValidationError(`API response validation failed for API: ${config.apiName}`, {
      dto: config.dto,
      zodErrorMessage: error.message,
      issues: error.issues,
    });
  }
}
