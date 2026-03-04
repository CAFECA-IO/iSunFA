import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";

/**
 * Info: (20260226 - Julian) 上傳檔案
 * POST /api/v1/file
 * 直接對接 STORAGE_DOMAIN
 */
export async function POST(request: Request) {
  const STORAGE_DOMAIN = process.env.STORAGE_DOMAIN;

  if (!STORAGE_DOMAIN) {
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "STORAGE_DOMAIN is not defined");
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return jsonFail(ApiCode.VALIDATION_ERROR, "No file uploaded");
    }

    const newFormData = new FormData();
    newFormData.append("file", file, file.name);

    const targetUrl = `${STORAGE_DOMAIN}/api/v1/file`;

    // Info: (20260226 - Julian) 僅保留必要的 headers 轉發，避免干擾 fetch 的 Content-Type 處理
    const newHeaders = new Headers();
    const headersToForward = ['authorization', 'cookie', 'user-agent', 'accept'];
    headersToForward.forEach(h => {
      const val = request.headers.get(h);
      if (val) newHeaders.set(h, val);
    });

    console.log(`[API] Proxying POST to ${targetUrl}, file: ${file.name}`);

    const response = await fetch(targetUrl, {
      method: "POST",
      headers: newHeaders,
      body: newFormData,
    });

    const responseBody = await response.text();
    console.log(`[API] Storage response status: ${response.status}`);

    if (response.ok) {
      let data;
      try {
        data = JSON.parse(responseBody);
        // Info: (20260226 - Julian) Normalize if already an IApiResponse to avoid double-wrapping
        if (data && typeof data === 'object' && 'success' in data && 'payload' in data) {
          return jsonOk(data.payload, data.message);
        }
      } catch (e) {
        console.error(`[API] Proxy /file POST error:`, e);
        data = responseBody;
      }
      return jsonOk(data);
    } else {
      let errorMessage = "Storage Error";
      let code = ApiCode.INTERNAL_SERVER_ERROR;
      try {
        const errorData = JSON.parse(responseBody);
        errorMessage = errorData.message || errorMessage;
        if (errorData.code && Object.values(ApiCode).includes(errorData.code)) {
          code = errorData.code;
        }
      } catch (e) {
        console.error(`[API] Proxy /file POST error:`, e);
      }
      
      return jsonFail(code, errorMessage, { status: response.status });
    }
  } catch (error) {
    console.error(`[API] Proxy /file/ POST error:`, error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, `Internal Server Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}
