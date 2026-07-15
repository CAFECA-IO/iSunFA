// Info: (20260714 - Emily) 報告草稿端點(E2EE 密文):GET 取回、PUT 保存(version 樂觀鎖)
// Info: (20260714 - Emily) 純端口:授權 → 頻道所有權 → 驗證 → Service;明文只存在於前端

import { NextRequest } from "next/server";
import { logger } from "@/lib/utils/logger";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { CarbonReportDraftPutSchema } from "@/validators";
import { CarbonReportDraftService } from "@/services/carbon_report_draft.service";
import { isCarbonChatChannelOwnedBy } from "@/constants/carbon_chatbot";

export async function GET(request: NextRequest) {
  try {
    const sessionUser = await getIdentityFromDeWT(
      request.headers.get("Authorization"),
    );
    if (!sessionUser) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    const channel = request.nextUrl.searchParams.get("channel");
    if (!channel) {
      return jsonFail(API_ERRORS.VL_MISSING_PARAMS);
    }
    if (!isCarbonChatChannelOwnedBy(channel, sessionUser.address)) {
      return jsonFail(API_ERRORS.AUTH_PERMISSION_DENIED);
    }

    const service = new CarbonReportDraftService();
    const draft = await service.getDraft(channel);
    return jsonOk({ draft });
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonFail({
        code: error.code,
        message: error.message,
        status: error.status,
      });
    }
    logger.error(
      `[API] /chat/carbon/report GET error: ${JSON.stringify(error)}`,
    );
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const sessionUser = await getIdentityFromDeWT(
      request.headers.get("Authorization"),
    );
    if (!sessionUser) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return jsonFail(API_ERRORS.VL_INVALID_JSON);
    }

    const parsed = CarbonReportDraftPutSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonFail(API_ERRORS.VL_SCHEMA_ERROR);
    }
    if (!isCarbonChatChannelOwnedBy(parsed.data.channel, sessionUser.address)) {
      return jsonFail(API_ERRORS.AUTH_PERMISSION_DENIED);
    }

    const service = new CarbonReportDraftService();
    const result = await service.saveDraft(parsed.data);
    return jsonOk(result);
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonFail({
        code: error.code,
        message: error.message,
        status: error.status,
      });
    }
    logger.error(
      `[API] /chat/carbon/report PUT error: ${JSON.stringify(error)}`,
    );
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
