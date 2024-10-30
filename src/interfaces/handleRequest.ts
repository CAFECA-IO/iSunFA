import { ZOD_SCHEMA_API } from '@/constants/zod_schema';
import { ISessionData } from '@/interfaces/session_data';
import { body, query } from '@/lib/utils/validator';

export interface IHandleRequest<T extends keyof typeof ZOD_SCHEMA_API, U> {
  (input: {
    query: query<T>;
    body: body<T>;
    session: ISessionData;
  }): Promise<{ statusMessage: string; payload: U | null }>;
}
