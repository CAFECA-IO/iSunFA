import APIName from '@/enums/api_name';
import API_CONFIG from '@/constants/api_config';
import { Response } from '@/interfaces/response';
import useAPIWorker from './use_api_worker';
import useAPI from './use_api';

function checkParams(apiName: APIName, params: { [key: string]: unknown }) {
  const apiConfig = API_CONFIG[apiName];
  if (!apiConfig) {
    throw new Error(`API configuration not found for ${apiName}`);
  }
  Object.keys(apiConfig?.params).forEach((param) => {
    if (!params[param]) {
      throw new Error(`Missing parameter ${param} for API ${apiName}`);
    }
    if (typeof params[param] !== apiConfig.params[param]) {
      throw new Error(`Invalid type for parameter ${param} for API ${apiName}`);
    }
  });
  return apiConfig;
}

function useAPIResponse<Data>(
  apiName: APIName,
  options: {
    params?: { [key: string]: string | number };
    query?: { [key: string]: string | number };
    body?: { [key: string]: unknown };
  },
  cancel?: boolean
): Response<Data> {
  const { params, query, body } = options;
  const apiConfig = checkParams(apiName, params || {});

  const queryString = query
    ? Object.keys(query)
        .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(String(query[key]))}`)
        .join('&')
    : '';

  // TODO: path replace :param with params[param] (20240504 - tzuhan)
  const path = `${apiConfig.path}?${queryString}`;

  const { isLoading, data, message, error } = apiConfig?.useWorker
    ? useAPIWorker<Data>(apiConfig, path, body || {}, cancel)
    : useAPI<Data>(apiConfig, path, body || {}, cancel);

  // TODO: check return data type (20240504 - tzuhan)

  return {
    isLoading,
    data,
    message,
    error,
  };
}

export default useAPIResponse;
