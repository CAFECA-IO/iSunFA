import { IntegrationTestSetup } from '@/tests/integration/setup';

export interface ApiResponse<T = unknown> {
  success: boolean;
  code: string;
  message: string;
  data?: T;
  payload?: T;
  powerby?: string;
}

export interface ApiErrorResponse {
  success: false;
  code: string;
  message: string;
  payload?: unknown;
  powerby?: string;
}

export class ApiClient {
  private baseUrl: string;

  private cookies: string[] = [];

  constructor() {
    this.baseUrl = IntegrationTestSetup.getApiBaseUrl();
  }

  // Info: (20250619 - Shirley) Make HTTP request with cookie management
  private async makeRequest<T>(
    method: string,
    endpoint: string,
    body?: unknown,
    headers?: Record<string, string>
  ): Promise<ApiResponse<T> | ApiErrorResponse> {
    const url = `${this.baseUrl}${endpoint}`;

    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

    const requestHeaders: Record<string, string> = {
      ...headers,
    };

    // Info: (20250703 - Tzuhan) 僅當不是 FormData 時才指定 json header
    if (!isFormData) {
      requestHeaders['Content-Type'] = 'application/json';
    }

    if (this.cookies.length > 0) {
      requestHeaders.Cookie = this.cookies.join('; ');
    }

    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: isFormData ? (body as FormData) : body ? JSON.stringify(body) : undefined,
    });

    // Info: (20250620 - Shirley) Store cookies from response
    const setCookieHeader = response.headers.get('set-cookie');
    if (setCookieHeader) {
      // Info: (20250620 - Shirley) Parse cookies and store them
      const cookies = setCookieHeader.split(',').map((cookie) => cookie.trim().split(';')[0]);
      this.cookies.push(...cookies);
    }

    const responseData = await response.json();

    // Info: (20250620 - Shirley) Debug logging for response if enabled
    if (process.env.DEBUG_TESTS || process.env.DEBUG_API) {
      // Deprecated: (20250703 - Tzuhan) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('🔍 Request Headers:', headers);
      // Deprecated: (20250703 - Tzuhan) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('🔍 Request Body:', body instanceof FormData ? '[FormData]' : body);
      // Deprecated: (20250620 - Luphia) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log(`📨 API Response: ${response.status} ${response.statusText}`);
      // Deprecated: (20250620 - Luphia) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('📋 Response Data:', JSON.stringify(responseData, null, 2));
    }

    return responseData;
  }

  // Info: (20250619 - Shirley) GET request
  async get<T>(
    endpoint: string,
    headers?: Record<string, string>
  ): Promise<ApiResponse<T> | ApiErrorResponse> {
    return this.makeRequest<T>('GET', endpoint, undefined, headers);
  }

  // Info: (20250619 - Shirley) POST request
  async post<T>(
    endpoint: string,
    body?: unknown,
    headers?: Record<string, string>
  ): Promise<ApiResponse<T> | ApiErrorResponse> {
    return this.makeRequest<T>('POST', endpoint, body, headers);
  }

  // Info: (20250619 - Shirley) PUT request
  async put<T>(
    endpoint: string,
    body?: unknown,
    headers?: Record<string, string>
  ): Promise<ApiResponse<T> | ApiErrorResponse> {
    return this.makeRequest<T>('PUT', endpoint, body, headers);
  }

  // Info: (20250619 - Shirley) DELETE request
  async delete<T>(
    endpoint: string,
    body?: unknown,
    headers?: Record<string, string>
  ): Promise<ApiResponse<T> | ApiErrorResponse> {
    return this.makeRequest<T>('DELETE', endpoint, body, headers);
  }

  // Info: (20250619 - Shirley) Clear session cookies
  clearSession(): void {
    this.cookies = [];
  }

  // Info: (20250619 - Shirley) Get current cookies for debugging
  getCookies(): string[] {
    return [...this.cookies];
  }
}
