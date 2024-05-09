/* eslint-disable no-console */
import { HttpMethod } from '@/constants/api_connection';
import { Action } from '@/constants/action';
import { IAPIInput } from '@/interfaces/api_connection';
import { fetchData } from '../hooks/use_api';

interface FetchRequestData {
  requestId: string;
  method: HttpMethod;
  path: string;
  options: IAPIInput;
  action?: Action.CANCEL;
}

let activeRequest: string | null = null;
let controller: AbortController | null = null;

const handleRequest = async (
  requestId: string,
  path: string,
  method: HttpMethod,
  options: IAPIInput
) => {
  if (controller) {
    controller.abort();
  }
  controller = new AbortController();
  activeRequest = requestId;

  try {
    const data = await fetchData(path, method, options, controller.signal);
    if (activeRequest !== requestId) {
      return;
    }
    postMessage({ data, requestId });
  } catch (error) {
    if (activeRequest !== requestId) {
      return;
    }
    postMessage({ error: error instanceof Error ? error.message : 'Unknown error', requestId });
  }
};

// eslint-disable-next-line no-restricted-globals
self.onmessage = async (event: MessageEvent<FetchRequestData>) => {
  const { requestId, method, path, options, action } = event.data;

  if (action === Action.CANCEL) {
    if (activeRequest === requestId && controller) {
      controller.abort();
      controller = null;
      setTimeout(() => {
        // eslint-disable-next-line no-restricted-globals
        self.close();
      }, 1000);
    }
    return;
  }

  await handleRequest(requestId, path, method, options);
};

export {};
