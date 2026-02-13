import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
// import { IAttachment } from '@/interfaces/ai_talk';

/**
 * 刪除已上傳但尚未送出的圖片
 */
export async function DELETE({
  params,
}: {
  params: Promise<{ attachment_id: string }>;
}) {
  try {
    // const { attachment_id: attachmentId } = await params;
    // const attachment = mockAttachments.find((attachment) => attachment.id === Number(attachmentId));

    // if (!attachment) {
    //   console.error('Attachment not found');
    //   return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, 'Attachment not found');
    // }

    return jsonOk({
      message: "Attachment deleted successfully",
    });
  } catch (error) {
    console.error(
      `[API] /attachment/${(await params).attachment_id} error:`,
      error,
    );
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Internal Server Error");
  }
}
