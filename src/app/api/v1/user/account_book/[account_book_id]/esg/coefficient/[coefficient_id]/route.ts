import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { webAuthnRepo } from "@/repositories/webauthn.repo";
import { accountBookRepo } from "@/repositories/account_book.repo";
import { esgRepo } from "@/repositories/esg.repo";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import {
  CoefficientCategory,
  ICoefficient,
  ICoefficientInput,
} from "@/interfaces/coefficient";

/**
 * Info: (20260414 - Julian) 取得單一係數
 * GET /api/v1/user/account_book/:account_book_id/esg/coefficient/:coefficient_id
 */
export async function GET(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ account_book_id: string; coefficient_id: string }> },
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
    const creator = await webAuthnRepo.findUserByAddress(sessionUser.address);

    if (!creator) {
      console.error("Creator not found");
      return jsonFail(ApiCode.NOT_FOUND, "Creator not found");
    }

    // Info: (20260312 - Julian) 取得帳簿
    const { account_book_id: accountBookId, coefficient_id: coefficientId } =
      await params;
    const accountBook = await accountBookRepo.getAccountBookById(accountBookId);

    if (!accountBook) {
      console.error("Accountbook not found");
      return jsonFail(ApiCode.NOT_FOUND, "Accountbook not found");
    }

    // Info: (20260414 - Julian) 取得係數
    const coefficient = await esgRepo.getEsgCoefficientById(coefficientId);

    if (!coefficient) {
      console.error("Coefficient not found");
      return jsonFail(ApiCode.NOT_FOUND, "Coefficient not found");
    }

    const formattedCoefficient: ICoefficient = {
      ...coefficient,
      category: !!coefficient.accountBookId
        ? CoefficientCategory.CUSTOM
        : CoefficientCategory.STANDARD,
      createdAt: coefficient.createdAt.getTime() / 1000,
      updatedAt: coefficient.updatedAt.getTime() / 1000,
      emissionFactor: Number(coefficient.emissionFactor),
    };

    return jsonOk(formattedCoefficient);
  } catch (error) {
    console.error("Error fetching coefficient:", error);
    return jsonFail(
      ApiCode.INTERNAL_SERVER_ERROR,
      "Failed to fetch coefficient",
    );
  }
}

/**
 * Info: (20260414 - Julian) 編輯單一係數
 * PUT /api/v1/user/account_book/:account_book_id/esg/coefficient/:coefficient_id
 */
export async function PUT(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ account_book_id: string; coefficient_id: string }> },
) {
  try {
    // Info: (20260304 - Julian) Verify Token & Get User
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) {
      console.error("User not found");
      return jsonFail(ApiCode.NOT_FOUND, "User not found");
    }

    // Info: (20260312 - Julian) 取得帳簿
    const { account_book_id: accountBookId, coefficient_id: coefficientId } =
      await params;
    const accountBook = await accountBookRepo.getAccountBookById(accountBookId);

    if (!accountBook) {
      console.error("Accountbook not found");
      return jsonFail(ApiCode.NOT_FOUND, "Accountbook not found");
    }

    // Info: (20260414 - Julian) 取得 body
    const body = await request.json();
    const { input }: { input: ICoefficientInput } = body;

    // Info: (20260414 - Julian) 驗證 coefficient 參數
    if (!input || !input.name) {
      console.error("Missing coefficient or coefficient name");
      return jsonFail(ApiCode.VALIDATION_ERROR, "Coefficient is required");
    }

    // Info: (20260414 - Julian) 更新係數
    const updatedCoefficient = await esgRepo.updateEsgCoefficient(
      coefficientId,
      {
        name: input.name,
        description: input.description,
        emissionFactor: input.emissionFactor,
        unit: input.unit,
      },
    );

    if (!updatedCoefficient) {
      console.error("Coefficient not found");
      return jsonFail(ApiCode.NOT_FOUND, "Coefficient not found");
    }

    return jsonOk({ updatedCoefficientId: updatedCoefficient.id });
  } catch (error) {
    console.error("Error updating coefficient:", error);
    return jsonFail(
      ApiCode.INTERNAL_SERVER_ERROR,
      "Failed to update coefficient",
    );
  }
}

/**
 * Info: (20260414 - Julian) 刪除單一係數
 * DELETE /api/v1/user/account_book/:account_book_id/esg/coefficient/:coefficient_id
 */
export async function DELETE(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ account_book_id: string; coefficient_id: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) {
      console.error("User not found");
      return jsonFail(ApiCode.NOT_FOUND, "User not found");
    }

    const deleter = await webAuthnRepo.findUserByAddress(sessionUser.address);

    if (!deleter) {
      console.error("Deleter not found");
      return jsonFail(ApiCode.NOT_FOUND, "Deleter not found");
    }

    const { account_book_id: accountBookId, coefficient_id: coefficientId } =
      await params;
    const accountBook = await accountBookRepo.getAccountBookById(accountBookId);

    if (!accountBook) {
      console.error("Accountbook not found");
      return jsonFail(ApiCode.NOT_FOUND, "Accountbook not found");
    }

    const deletedCoefficient = await esgRepo.deleteEsgCoefficient(coefficientId);

    if (!deletedCoefficient) {
      console.error("Coefficient not found");
      return jsonFail(ApiCode.NOT_FOUND, "Coefficient not found");
    }

    return jsonOk({ deletedCoefficientId: deletedCoefficient.id });
  } catch (error) {
    console.error("Delete coefficient failed", error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Delete coefficient failed");
  }
}
