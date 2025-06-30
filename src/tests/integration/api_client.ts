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

  constructor(baseUrl: string = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
  }

  // Info: (20250619 - Shirley) Make HTTP request with cookie management
  private async makeRequest<T>(
    method: string,
    endpoint: string,
    body?: unknown,
    headers?: Record<string, string>
  ): Promise<ApiResponse<T> | ApiErrorResponse> {
    const url = `${this.baseUrl}${endpoint}`;

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    // Info: (20250619 - Shirley) Debug logging if enabled
    if (process.env.DEBUG_TESTS || process.env.DEBUG_API) {
      // Deprecated: (20250620 - Luphia) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log(`🔥 API Request [${method} ${endpoint}]: ${url}`);
      if (body) {
        // Deprecated: (20250620 - Luphia) remove eslint-disable
        // eslint-disable-next-line no-console
        console.log('📦 Request Body:', JSON.stringify(body, null, 2));
      }
      if (this.cookies.length > 0) {
        // Deprecated: (20250620 - Luphia) remove eslint-disable
        // eslint-disable-next-line no-console
        console.log('🍪 Cookies:', this.cookies);
      }
    }

    // Info: (20250620 - Shirley) Add cookies if available
    if (this.cookies.length > 0) {
      requestHeaders.Cookie = this.cookies.join('; ');
    }

    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    // Info: (20250630 - Shirley) Store cookies from response
    const setCookieHeaders = response.headers.getSetCookie?.() || [];
    if (setCookieHeaders.length > 0) {
      // Info: (20250630 - Shirley) Parse cookies and store them
      const newCookies = setCookieHeaders.map((cookie) => cookie.trim().split(';')[0]);
      this.cookies.push(...newCookies);
    } else {
      // Info: (20250630 - Shirley) Fallback for older browsers
      const setCookieHeader = response.headers.get('set-cookie');
      if (setCookieHeader) {
        const cookies = setCookieHeader.split(',').map((cookie) => cookie.trim().split(';')[0]);
        this.cookies.push(...cookies);
      }
    }

    const responseData = await response.json();

    // Info: (20250620 - Shirley) Debug logging for response if enabled
    if (process.env.DEBUG_TESTS || process.env.DEBUG_API) {
      // Deprecated: (20250620 - Luphia) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log(
        `📨 API Response [${method} ${endpoint}]: ${response.status} ${response.statusText}, \n📋 Response Data: ${JSON.stringify(
          responseData,
          null,
          2
        )}`
      );
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
    headers?: Record<string, string>
  ): Promise<ApiResponse<T> | ApiErrorResponse> {
    return this.makeRequest<T>('DELETE', endpoint, undefined, headers);
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
