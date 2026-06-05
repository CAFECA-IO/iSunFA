import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { pdfEditorDocumentRepo } from "@/repositories/pdf_editor_document.repo";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { jsonOk, jsonFail } from "@/lib/utils/response";

/**
 * Info: (20260604 - Julian) 分享 PDF
 * POST /api/v1/admin/pdf_editor/share
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const user = await getIdentityFromDeWT(authHeader);

    if (!user) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    let text = "";
    try {
      const bodyText = await request.text();
      if (bodyText) {
        const body = JSON.parse(bodyText);
        if (typeof body.text === "string") {
          text = body.text;
        }
      }
    } catch (e) {
      console.error("[API] /admin/pdf_editor/share POST parse body error:", e);
      return jsonFail(API_ERRORS.VA_INVALID_INPUT_DATA);
    }

    if (!text) {
      return jsonFail(API_ERRORS.VA_INVALID_INPUT_DATA);
    }

    const doc = await pdfEditorDocumentRepo.createDocument({
      data: {
        content: text,
        createdById: user.id,
      },
    });

    return jsonOk({ token: doc.token });
  } catch (error) {
    console.error("[API] /admin/pdf_editor/share POST error:", error);
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
