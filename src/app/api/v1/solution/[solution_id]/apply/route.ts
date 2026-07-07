import { NextRequest } from "next/server";
import { applySolution } from "@/services/solution.service";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS } from "@/lib/utils/error_dictionary";

/**
 * Info: (20260706 - Luphia) 方案申請 API
 * POST /api/v1/solution/[solution_id]/apply
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ solution_id: string }> },
) {
  try {
    const { solution_id: solutionId } = await params;
    const body = await req.json();

    const {
      taxId,
      companyName,
      address,
      contactPerson,
      phone,
      email,
      message,
    } = body;

    // Info: (20260706 - Luphia) 透過 Service 進行申請，Service 會呼叫 Repo 操作 DB
    const application = await applySolution(solutionId, {
      taxId,
      companyName,
      address,
      contactPerson,
      phone,
      email,
      message,
    });

    return jsonOk(application);
  } catch (error) {
    console.error("[Solution Apply API Error]:", error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
