import { API_ZOD_SCHEMA } from '@/constants/zod_schema';
import { NextApiRequest } from 'next';
import { z } from 'zod';
import { loggerRequest } from '@/lib/utils/logger_back';
import { APIPath } from '@/constants/api_connection';
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
    /* eslint-disable no-console */
    console.error('Request validation failed');
    console.log('Query:', query, 'Query type:', typeof query);
    console.log(`Body:', ${JSON.stringify(body)}, 'Body type:', ${typeof body}`);
    /* eslint-enable no-console */
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
