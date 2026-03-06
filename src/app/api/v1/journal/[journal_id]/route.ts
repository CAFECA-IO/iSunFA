import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { prisma } from "@/lib/prisma";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";

/**
 * Info: (20260304 - Julian) 取得日記帳
 * GET /api/v1/journal/:journal_id
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ journal_id: string }> },
) {
  try {
    // Info: (20260304 - Julian) Verify Token & Get User
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) {
      console.error("User not found");
      return jsonFail(ApiCode.NOT_FOUND, "User not found");
    }

    // ToDo: (20260305 - Julian) 補上取得帳簿 ID 的邏輯
    const accountbookId = "1";

    const accountbook = await prisma.accountbook.findUnique({
      where: { id: accountbookId },
    });

    if (!accountbook) {
      console.error("Accountbook not found");
      return jsonFail(ApiCode.NOT_FOUND, "Accountbook not found");
    }

    const { journal_id: journalId } = await params;
    if (!journalId) {
      console.error("Missing journalId");
      return jsonFail(ApiCode.VALIDATION_ERROR, "JournalId is required");
    }

    const journal = await prisma.journal.findUnique({
      where: { id: journalId },
    });

    if (!journal) {
      console.error("Journal not found");
      return jsonFail(ApiCode.NOT_FOUND, "Journal not found");
    }

    return jsonOk({ journal });
  } catch (error) {
    console.error("Get journal failed", error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Get journal failed");
  }
}

/**
 * Info: (20260304 - Julian) 編輯日記帳
 * PUT /api/v1/journal/:journal_id
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ journal_id: string }> },
) {
  try {
    // Info: (20260304 - Julian) Verify Token & Get User
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) {
      console.error("User not found");
      return jsonFail(ApiCode.NOT_FOUND, "User not found");
    }

    // ToDo: (20260305 - Julian) 補上取得帳簿 ID 的邏輯
    const accountbookId = "1";

    const accountbook = await prisma.accountbook.findUnique({
      where: { id: accountbookId },
    });

    if (!accountbook) {
      console.error("Accountbook not found");
      return jsonFail(ApiCode.NOT_FOUND, "Accountbook not found");
    }

    const { journal_id: journalId } = await params;
    if (!journalId) {
      console.error("Missing journalId");
      return jsonFail(ApiCode.VALIDATION_ERROR, "JournalId is required");
    }

    const body = await request.json();
    const { text } = body;

    // Info: (20260304 - Julian) Update journal
    const updatedJournal = await prisma.journal.update({
      where: { id: journalId },
      data: { text },
    });

    if (!updatedJournal) {
      console.error("Journal update failed");
      return jsonFail(ApiCode.NOT_FOUND, "Journal update failed");
    }

    return jsonOk({ journal: updatedJournal });
  } catch (error) {
    console.error("Put journal failed", error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Put journal failed");
  }
}

/**
 * Info: (20260304 - Julian) 刪除日記帳
 * DELETE /api/v1/journal/:journal_id
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ journal_id: string }> },
) {
  try {
    // Info: (20260304 - Julian) Verify Token & Get User
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) {
      console.error("User not found");
      return jsonFail(ApiCode.NOT_FOUND, "User not found");
    }

    const { journal_id: journalId } = await params;
    if (!journalId) {
      console.error("Missing journalId");
      return jsonFail(ApiCode.VALIDATION_ERROR, "JournalId is required");
    }

    // ToDo: (20260305 - Julian) 補上取得帳簿 ID 的邏輯
    const accountbookId = "1";

    const accountbook = await prisma.accountbook.findUnique({
      where: { id: accountbookId },
    });

    if (!accountbook) {
      console.error("Accountbook not found");
      return jsonFail(ApiCode.NOT_FOUND, "Accountbook not found");
    }

    // Info: (20260304 - Julian) Delete journal
    const deletedJournal = await prisma.journal.delete({
      where: { id: journalId },
    });

    if (!deletedJournal) {
      console.error("Journal delete failed");
      return jsonFail(ApiCode.NOT_FOUND, "Journal delete failed");
    }

    return jsonOk({ journal: deletedJournal });
  } catch (error) {
    console.error("Delete journal failed", error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Delete journal failed");
  }
}
