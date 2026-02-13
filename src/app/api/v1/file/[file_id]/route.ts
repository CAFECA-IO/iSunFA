import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { prisma } from "@/lib/prisma";

/**
 * 刪除已上傳的檔案 (從資料庫正式移除)
 * DELETE /api/v1/file/:file_id
 */
export async function DELETE(
  request: Request,
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
