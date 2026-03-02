import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { prisma } from "@/lib/prisma";

/**
 * Info: (20260226 - Julian) 取得檔案碎片
 * GET /api/v1/file/:file_id
 * 直接對接 STORAGE_DOMAIN
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ file_id: string }> },
) {
  try {
    const { file_id: fileId } = await params;
    const STORAGE_DOMAIN = process.env.STORAGE_DOMAIN;

    if (!STORAGE_DOMAIN) {
      return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "STORAGE_DOMAIN is not defined");
    }

    const targetUrl = `${STORAGE_DOMAIN}/api/v1/file/${fileId}`;

    const newHeaders = new Headers(request.headers);
    newHeaders.delete("host");

    const response = await fetch(targetUrl, {
      method: "GET",
      headers: newHeaders,
    });

    if (response.ok) {
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        // Info: (20260226 - Julian) Normalize if already an IApiResponse to avoid double-wrapping
        if (data && typeof data === 'object' && 'success' in data && 'payload' in data) {
          return jsonOk(data.payload, data.message);
        }
        return jsonOk(data);
      }

      // Info: (20260226 - Julian) For binary files/shards, return the raw response body
      return new Response(response.body, {
        status: response.status,
        headers: response.headers,
      });
    } else {
      let errorMessage = "Storage Error";
      let code = ApiCode.INTERNAL_SERVER_ERROR;
      try {
        const responseBody = await response.text();
        const errorData = JSON.parse(responseBody);
        errorMessage = errorData.message || errorMessage;
        if (errorData.code && Object.values(ApiCode).includes(errorData.code)) {
          code = errorData.code;
        }
      } catch (e) {
        console.error(`[API] Proxy /file/:file_id error:`, e);
      }

      return jsonFail(code, errorMessage, { status: response.status });
    }

  } catch (error) {
    console.error(`[API] Proxy /file/:file_id error:`, error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Internal Server Error");
  }
}

/**
 * Info: (20260213 - Julian) 刪除已上傳的檔案 (從資料庫正式移除)
 * 目前沒有使用，但保留
 * DELETE /api/v1/file/:file_id
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ file_id: string }> },
) {
  try {
    const { file_id: fileId } = await params;

    // Info: (20260213 - Julian) 檢查檔案是否存在
    const file = await prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      console.error(`File ${fileId} not found`);
      return jsonFail(ApiCode.NOT_FOUND, "File not found");
    }

    // Info: (20260213 - Julian) 從資料庫移除記錄
    await prisma.file.delete({
      where: { id: fileId },
    });

    // ToDo: (20260213 - Julian) 未來若需要，可在這裡同時清理 Laria 理體檔案

    return jsonOk({
      message: "File deleted successfully",
      id: fileId,
    });
  } catch (error) {
    console.error(`[API] /file/delete error:`, error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Internal Server Error");
  }
}
