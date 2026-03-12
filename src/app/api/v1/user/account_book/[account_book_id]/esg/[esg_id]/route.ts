import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { prisma } from "@/lib/prisma";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { EsgScope, EsgIntensity, EsgStatus } from "@/generated/client";
import { IEsgRecord, ESGScope } from "@/interfaces/esg";

/**
 * Info: (20260312 - Julian) 取得單一 ESG 紀錄
 * GET /api/v1/user/account_book/:account_book_id/esg/:esg_id
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ account_book_id: string; esg_id: string }> },
) {
  try {
    // Info: (20260304 - Julian) Verify Token & Get User
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) {
      console.error("User not found");
      return jsonFail(ApiCode.NOT_FOUND, "User not found");
    }

    // Info: (20260312 - Julian) 取得建立者
    const creator = await prisma.user.findUnique({
      where: { address: sessionUser.address },
    });

    if (!creator) {
      console.error("Creator not found");
      return jsonFail(ApiCode.NOT_FOUND, "Creator not found");
    }

    // Info: (20260312 - Julian) 取得帳簿
    const { account_book_id: accountBookId, esg_id: esgId } = await params;
    const accountBook = await prisma.accountBook.findUnique({
      where: { id: accountBookId },
    });

    if (!accountBook) {
      console.error("Accountbook not found");
      return jsonFail(ApiCode.NOT_FOUND, "Accountbook not found");
    }

    // Info: (20260312 - Julian) 取得 ESG 紀錄
    const esgRecord = await prisma.esgRecord.findUnique({
      where: { id: esgId },
    });

    if (!esgRecord) {
      console.error("Esg record not found");
      return jsonFail(ApiCode.NOT_FOUND, "Esg record not found");
    }

    const formattedRecord: IEsgRecord = {
      id: esgRecord.id,
      dateTimestamp: esgRecord.dateTimestamp,
      fileId: esgRecord.fileId ?? "",
      scope: esgRecord.scope.toLowerCase() as ESGScope,
      activityType: esgRecord.activityType,
      vendor: esgRecord.vendor,
      rawActivityData: esgRecord.rawActivityData,
      unit: esgRecord.unit,
      emissions: esgRecord.emissions.toString(),
      intensity: esgRecord.intensity.toLowerCase(),
      confidence: esgRecord.confidence,
      status: esgRecord.status.toLowerCase(),
    };

    return jsonOk(formattedRecord);
  } catch (error) {
    console.error("Error fetching esg record:", error);
    return jsonFail(
      ApiCode.INTERNAL_SERVER_ERROR,
      "Failed to fetch esg record",
    );
  }
}

/**
 * Info: (20260312 - Julian) 編輯單一 ESG 紀錄
 * PUT /api/v1/user/account_book/:account_book_id/esg/:esg_id
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ account_book_id: string; esg_id: string }> },
) {
  try {
    // Info: (20260304 - Julian) Verify Token & Get User
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) {
      console.error("User not found");
      return jsonFail(ApiCode.NOT_FOUND, "User not found");
    }

    // Info: (20260312 - Julian) 取得更新人員
    const updater = await prisma.user.findUnique({
      where: { address: sessionUser.address },
    });

    if (!updater) {
      console.error("Creator not found");
      return jsonFail(ApiCode.NOT_FOUND, "Creator not found");
    }

    // Info: (20260312 - Julian) 取得帳簿
    const { account_book_id: accountBookId, esg_id: esgId } = await params;
    const accountBook = await prisma.accountBook.findUnique({
      where: { id: accountBookId },
    });

    if (!accountBook) {
      console.error("Accountbook not found");
      return jsonFail(ApiCode.NOT_FOUND, "Accountbook not found");
    }

    // Info: (20260312 - Julian) 取得 ESG 紀錄
    const esgRecord = await prisma.esgRecord.findUnique({
      where: { id: esgId },
    });

    if (!esgRecord) {
      console.error("Esg record not found");
      return jsonFail(ApiCode.NOT_FOUND, "Esg record not found");
    }

    const reqBody: Partial<IEsgRecord> = await request.json();

    // Info: (20260312 - Julian) 更新 ESG 紀錄
    const updatedRecord = await prisma.esgRecord.update({
      where: { id: esgId },
      data: {
        ...(reqBody.dateTimestamp && { dateTimestamp: reqBody.dateTimestamp }),
        ...(reqBody.scope && {
          scope: reqBody.scope.toUpperCase() as EsgScope,
        }),
        ...(reqBody.activityType && { activityType: reqBody.activityType }),
        ...(reqBody.vendor && { vendor: reqBody.vendor }),
        ...(reqBody.rawActivityData && {
          rawActivityData: reqBody.rawActivityData,
        }),
        ...(reqBody.unit && { unit: reqBody.unit }),
        ...(reqBody.emissions && { emissions: reqBody.emissions }),
        ...(reqBody.intensity && {
          intensity: reqBody.intensity.toUpperCase() as EsgIntensity,
        }),
        ...(reqBody.confidence !== undefined && {
          confidence: reqBody.confidence,
        }),
        ...(reqBody.status && {
          status: reqBody.status.toUpperCase() as EsgStatus,
        }),
      },
    });

    const formattedRecord: IEsgRecord = {
      id: updatedRecord.id,
      dateTimestamp: updatedRecord.dateTimestamp,
      fileId: updatedRecord.fileId ?? "",
      scope: updatedRecord.scope.toLowerCase() as ESGScope,
      activityType: updatedRecord.activityType,
      vendor: updatedRecord.vendor,
      rawActivityData: updatedRecord.rawActivityData,
      unit: updatedRecord.unit,
      emissions: updatedRecord.emissions.toString(),
      intensity: updatedRecord.intensity.toLowerCase(),
      confidence: updatedRecord.confidence,
      status: updatedRecord.status.toLowerCase(),
    };

    if (!formattedRecord) {
      console.error("Record update failed");
      return jsonFail(ApiCode.NOT_FOUND, "Record update failed");
    }

    // Info: (20260312 - Julian) 新增 log
    await prisma.auditLog.create({
      data: {
        userId: updater.id,
        dataType: "ESG_RECORD",
        dataId: formattedRecord.id,
        accountBookId: accountBook.id,
        action: "UPDATE",
      },
    });

    return jsonOk(formattedRecord);
  } catch (error) {
    console.error("Error updating esg record:", error);
    return jsonFail(
      ApiCode.INTERNAL_SERVER_ERROR,
      "Failed to update esg record",
    );
  }
}
