/* eslint-disable no-console */
import { APIName, APIConfig } from '@/constants/api_connection';
import { IAPIInput } from '@/interfaces/api_connection';
import { Response } from '@/interfaces/response';
import useAPIWorker from '../hooks/use_api_worker';
import useAPI from '../hooks/use_api';

function APIResponse<Data>(apiName: APIName, options: IAPIInput, cancel?: boolean): Response<Data> {
  const apiConfig = APIConfig[apiName];

  return apiConfig?.useWorker
    ? useAPIWorker<Data>(apiName, options, cancel)
    : useAPI<Data>(apiName, options, cancel);
}

export default APIResponse;
