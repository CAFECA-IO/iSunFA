/* eslint-disable no-console */
import { HttpMethod } from '@/constants/api_connection';
import { Action } from '@/constants/action';
import { IAPIInput, IHttpMethod } from '@/interfaces/api_connection';
import { IResponseData } from '@/interfaces/response_data';

interface FetchRequestData {
  requestId: string;
  method: HttpMethod;
  path: string;
  options: IAPIInput;
  action?: Action.CANCEL;
}

const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
};

export async function fetchData<Data>(
  path: string,
  method: IHttpMethod,
  options: IAPIInput,
  signal?: AbortSignal
): Promise<IResponseData<Data>> {
  const fetchOptions: RequestInit = {
    method,
    signal,
  };

  console.log('fetchData, path:', path, `options:`, options);

  if (method !== HttpMethod.GET && options.body) {
    if (options.body instanceof FormData) {
      fetchOptions.body = options.body;
    } else {
      fetchOptions.body = JSON.stringify(options.body);
      fetchOptions.headers = {
        ...DEFAULT_HEADERS,
        ...(options.header || {}),
      };
    }
  }

  console.log('fetchData, fetchOptions:', fetchOptions);

  const response = await fetch(path, fetchOptions);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const result = (await response.json()) as IResponseData<Data>;
  return result;
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
