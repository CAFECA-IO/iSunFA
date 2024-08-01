import { APIConfig } from '@/constants/api_connection';
import { IAPIName, IAPIConfig, IAPIInput, IAPIResponse } from '@/interfaces/api_connection';
import useAPIWorker from '@/lib/hooks/use_api_worker';
import useAPI from '@/lib/hooks/use_api';

function checkInput(apiConfig: IAPIConfig, input?: IAPIInput) {
  // TODO: check if params match the input schema (20240504 - Luphia)
  if (!input) {
    throw new Error('Input is required');
  }

  return true;
}

function APIHandler<Data>(
  apiName: IAPIName,
  options?: IAPIInput,
  triggerImmediately: boolean = false,
  cancel: boolean = false,
): IAPIResponse<Data> {
  const apiConfig = APIConfig[apiName];
  if (!apiConfig) throw new Error(`API ${apiName} is not defined`);
  checkInput(apiConfig, options);

  if (apiConfig.useWorker) {
    return useAPIWorker<Data>(apiConfig, options ?? {}, cancel, triggerImmediately);
  } else return useAPI<Data>(apiConfig, options ?? {}, cancel, triggerImmediately);
}

export default APIHandler;
