import { APIName, APIConfig } from '@/constants/api_connection';
import { IAPIInput, IAPIConfig } from '@/interfaces/api_connection';
import { Response } from '@/interfaces/response';
import useAPIWorker from './use_api_worker';
import useAPI from './use_api';

function checkInput(apiConfig: IAPIConfig, input: IAPIInput) {
  // TODO: check if params match the input schema (20240504 - Luphia)
  if (!input) {
    throw new Error('Input is required');
  }

  return true;
}

function getAPIPath(apiConfig: IAPIConfig, input: IAPIInput) {
  // replace :param with input.params[param]
  const originalPath = apiConfig.path;
  const path = originalPath.replace(/:([^/]+)/g, (match: string, key: string): string => {
    const value = input.params?.[key] as string;

    return value;
  });
  const queryString = input.query
    ? Object.keys(input.query)
        .map(
          (key) => `${encodeURIComponent(key)}=${encodeURIComponent(String(input.query?.[key]))}`
        )
        .join('&')
    : '';
  const result = queryString ? `${path}?${queryString}` : path;

  return result;
}

function useAPIResponse<Data>(
  apiName: APIName,
  options: IAPIInput,
  cancel?: boolean
): Response<Data> {
  const apiConfig = APIConfig[apiName];
  const { body } = options;
  checkInput(apiConfig, options);

  // TODO: path replace :param with params[param] (20240504 - tzuhan)
  const path = getAPIPath(apiConfig, options);

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
