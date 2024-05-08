import { APIName, APIConfig } from '@/constants/api_connection';
import { IAPIConfig, IAPIInput, IAPIResponse } from '@/interfaces/api_connection';
import useAPIWorker from '../hooks/use_api_worker';
import useAPI from '../hooks/use_api';

function checkInput(apiConfig: IAPIConfig, input: IAPIInput) {
  // TODO: check if params match the input schema (20240504 - Luphia)
  if (!input) {
    throw new Error('Input is required');
  }

  return true;
}

function getAPIPath(apiConfig: IAPIConfig, input: IAPIInput) {
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

function APIHandler<Data>(
  apiName: APIName,
  options: IAPIInput,
  cancel?: boolean,
  triggerImmediately: boolean = true
): IAPIResponse<Data> {
  const apiConfig = APIConfig[apiName];
  if (!apiConfig) throw new Error(`API ${apiName} is not defined`);
  checkInput(apiConfig, options);

  const path = getAPIPath(apiConfig, options);

  if (apiConfig.useWorker) {
    return useAPIWorker<Data>(apiName, apiConfig.method, path, options, cancel, triggerImmediately);
  } else return useAPI<Data>(apiConfig.method, path, options, cancel, triggerImmediately);
}

export default APIHandler;
