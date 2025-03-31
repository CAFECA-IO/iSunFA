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

// ToDo: (20241120 - Liz) 把 APIHandler 改成自訂 Hook (https://github.com/CAFECA-IO/iSunFA/issues/3291)
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

  // Info: (20241120 - Liz) 呼叫兩個 Hook，確保它們的執行順序一致
  const workerResponse = useAPIWorker<Data>(apiConfig, options, triggerImmediately, cancel);
  const apiResponse = useAPI<Data>(apiConfig, options, triggerImmediately, cancel);

  // Info: (20241120 - Liz) 根據條件決定使用哪一個結果
  const response = apiConfig.useWorker ? workerResponse : apiResponse;

  const { code } = response;
  if (code === STATUS_CODE.UNAUTHORIZED_ACCESS) {
    eventManager.emit(STATUS_MESSAGE.UNAUTHORIZED_ACCESS);
  }

  return response;
}

export default APIHandler;
