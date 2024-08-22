import { APIConfig } from '@/constants/api_connection';
import { IAPIName, IAPIConfig, IAPIInput, IAPIResponse } from '@/interfaces/api_connection';
import useAPIWorker from '@/lib/hooks/use_api_worker';
import useAPI from '@/lib/hooks/use_api';
import eventManager from '@/lib/utils/event_manager';
import { STATUS_CODE, STATUS_MESSAGE } from '@/constants/status_code';

function checkInput(apiConfig: IAPIConfig, input?: IAPIInput) {
  // TODO: (20240504 - Luphia) check if params match the input schema
  if (!input) {
    throw new Error('Input is required');
  }

  return true;
}

function APIHandler<Data>(
  apiName: IAPIName,
  options: IAPIInput = {
    header: {},
    body: {},
    params: {},
    query: {},
  },
  triggerImmediately: boolean = false,
  cancel: boolean = false
): IAPIResponse<Data> {
  const apiConfig = APIConfig[apiName];
  if (!apiConfig) throw new Error(`API ${apiName} is not defined`);
  checkInput(apiConfig, options);

  let response = {} as IAPIResponse<Data>;
  if (apiConfig.useWorker) {
    response = useAPIWorker<Data>(apiConfig, options, triggerImmediately, cancel);
  } else response = useAPI<Data>(apiConfig, options, triggerImmediately, cancel);
  const { code } = response;
  if (code === STATUS_CODE[STATUS_MESSAGE.UNAUTHORIZED_ACCESS]) {
    eventManager.emit(STATUS_MESSAGE.UNAUTHORIZED_ACCESS);
  }

  return response;
}

export default APIHandler;
