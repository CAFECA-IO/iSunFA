import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { prisma } from "@/lib/prisma";
import { storageService } from "@/services/storage.service";

/**
 * Info: (20260213 - Julian) 取得檔案
 * 取得檔案分片清單，再拼起來
 * GET /api/v1/file/:file_id
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file_id: string }> },
) {
  try {
    const { file_id: fileId } = await params;

    // Info: (20260213 - Julian) 從資料庫撈取檔案記錄
    const file = await prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      console.error(`File ${fileId} not found`);
      return jsonFail(ApiCode.NOT_FOUND, "File not found");
    }

    /**
     * Info: (20260213 - Julian) 從 URL 提取 Metadata Hash (CID)
     * 假設 URL 格式為 https://storage.cafeca.io/api/v1/file/Qm...
     */
    const urlParts = file.url?.split("/");
    const metadataHash = urlParts?.[urlParts.length - 1];

    if (!metadataHash) {
      console.error(`Invalid metadata hash for file ${fileId}`);
      return jsonFail(ApiCode.VALIDATION_ERROR, "Invalid file URL");
    }

    // Info: (20260213 - Julian) 執行 Laria 恢復流程
    const buffer = await storageService.recoverLaria(metadataHash);

    // Info: (20260213 - Julian) 回傳原始二進位數據
    return new Response(Uint8Array.from(buffer), {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "public, max-age=31536000, immutable", // Info: (20260213 - Julian) 檔案是不變的，加速前端快取
      },
    });

  } catch (error) {
    console.error(`[API] /file/get error:`, error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Internal Server Error");
  }
}

/**
 * Info: (20260213 - Julian) 刪除已上傳的檔案 (從資料庫正式移除)
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
