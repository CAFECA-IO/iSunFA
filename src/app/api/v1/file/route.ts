import { jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/v1/file
 * Info: (20260226 - Julian) 上傳檔案
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
    newFormData.append("file", file);

    const targetUrl = `${STORAGE_DOMAIN}/api/v1/file/`;

    const newHeaders = new Headers(request.headers);
    newHeaders.delete("host");
    newHeaders.delete("content-type");
    newHeaders.delete("content-length");

    const response = await fetch(targetUrl, {
      method: "POST",
      headers: newHeaders,
      body: newFormData,
    });

    const responseBody = await response.text();

    if (response.ok) {
      let json: { payload?: { hash?: string } } | undefined;
      try {
        json = JSON.parse(responseBody);
      } catch (e) {
        console.error("[API] Proxy /file/ POST error:", e);
      }

      // Info: (20260226 - Julian) 將檔案的 metadata file id 保存於資料庫
      if (json?.payload?.hash && file.name.endsWith(".meta.json")) {
        const hash = json.payload.hash;
        
        await prisma.file.create({
          data: {
            id: hash,
            fileName: file.name,
            hash: hash,
            mimeType: file.type || "application/json",
            fileSize: file.size,
            url: `/api/v1/file/${hash}`,
          },
        });
      }
    }

    return new Response(responseBody, {
      status: response.status,
      headers: response.headers,
      statusText: response.statusText,
    });
  } catch (error) {
    console.error("[API] Proxy /file/ POST error:", error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Internal Server Error");
  }
}
