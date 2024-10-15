import { API_ZOD_SCHEMA } from '@/constants/zod_schema';
import { BodyType, QueryType } from '@/lib/utils/request_validator';
import { ISessionData } from './session_data';

export interface IHandleRequest<T extends keyof typeof API_ZOD_SCHEMA, U> {
  (
    handleRequestInput: IHandlerRequestInput<T>
  ): Promise<{ statusMessage: string; payload: U | null }>;
}

interface IHandlerRequestInput<T extends keyof typeof API_ZOD_SCHEMA> {
  query: QueryType<T>;
  body: BodyType<T>;
  session: ISessionData;
}
