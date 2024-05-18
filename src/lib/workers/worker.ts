import { Action } from '@/constants/action';
import { IAPIConfig, IAPIInput } from '@/interfaces/api_connection';
import { fetchData } from '@/lib/hooks/use_api';

interface FetchRequestData {
  apiConfig: IAPIConfig;
  options: IAPIInput;
  action?: Action.CANCEL;
}

let activeRequest: string | null = null;
let controller: AbortController | null = null;

const handleRequest = async (apiConfig: IAPIConfig, options: IAPIInput) => {
  if (controller) {
    controller.abort();
  }
  controller = new AbortController();
  activeRequest = apiConfig.name;

  try {
    const data = await fetchData(apiConfig, options, controller.signal);
    if (activeRequest !== apiConfig.name) {
      return;
    }
    postMessage({ data, requestId: apiConfig.name });
  } catch (error) {
    if (activeRequest !== apiConfig.name) {
      return;
    }
    postMessage({
      error: error instanceof Error ? error.message : 'Unknown error',
      requestId: apiConfig.name,
    });
  }
};

// eslint-disable-next-line no-restricted-globals
self.onmessage = async (event: MessageEvent<FetchRequestData>) => {
  const { apiConfig, options, action } = event.data;

  if (action === Action.CANCEL) {
    if (activeRequest === apiConfig.name && controller) {
      controller.abort();
      controller = null;
      setTimeout(() => {
        // eslint-disable-next-line no-restricted-globals
        self.close();
      }, 1000);
    }
    return;
  }

  await handleRequest(apiConfig, options);
};

export {};
