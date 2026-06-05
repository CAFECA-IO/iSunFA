import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { pdfEditorDocumentRepo } from "@/repositories/pdf_editor_document.repo";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { jsonOk, jsonFail } from "@/lib/utils/response";

/**
 * Info: (20260604 - Julian) 撤銷 PDF 分享
 * PATCH /api/v1/admin/pdf_editor/share/:token/revoke
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const user = await getIdentityFromDeWT(authHeader);

    if (!user) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    const token = (await params).token;

    const doc = await pdfEditorDocumentRepo.findDocumentUnique({
      where: { token },
    });

    if (!doc) {
      return jsonFail(API_ERRORS.NF_DOCUMENT);
    }

    if (doc.createdById !== user.id) {
      return jsonFail(API_ERRORS.AUTH_PERMISSION_DENIED);
    }

    await pdfEditorDocumentRepo.updateDocument({
      where: { id: doc.id },
      data: { isActive: false },
    });

    return jsonOk(null);
  } catch (error) {
    console.error("[API] /admin/pdf_editor/share/revoke PATCH error:", error);
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
