import APIName from '@/enums/api_name';
import API_CONFIG from '@/constants/api_config';
import { Response } from '@/interfaces/response';
import useAPIWorker from './use_api_worker';
import useAPI from './use_api';

function useAPIResponse<Data>(
  apiName: APIName,
  params?: Record<string, string | number> | null,
  query?: Record<string, string | number> | null,
  body?: Record<string, string | number | Record<string, string | number>> | null,
  cancel?: boolean
): Response<Data> {
  const apiConfig = API_CONFIG[apiName];
  if (!apiConfig) {
    throw new Error(`API configuration not found for ${apiName}`);
  }

  const { pathConstructor, useWorker } = apiConfig;

  const { isLoading, data, message, error } = useWorker
    ? useAPIWorker<Data>(apiConfig, pathConstructor(params), body || {}, cancel)
    : useAPI<Data>(apiName, params, query, body, cancel);

  return {
    isLoading,
    data,
    message,
    error,
  };
}

export default useAPIResponse;
