import { APIName } from '@/constants/api_connection';
import { ISessionData } from '@/interfaces/session_data';
import { body, query } from '@/lib/utils/validator';
import { NextApiRequest } from 'next';

export interface IHandleRequest<T extends APIName, U> {
  (input: {
    query: query<T>;
    body: body<T>;
    session: ISessionData;
    req: NextApiRequest;
  }): Promise<{ statusMessage: string; payload: U | null }>;
}
