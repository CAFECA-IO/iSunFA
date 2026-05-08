import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { webAuthnRepo } from "@/repositories/webauthn.repo";
import { accountBookRepo } from "@/repositories/account_book.repo";
import { esgRepo } from "@/repositories/esg.repo";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { ICoefficientInput } from "@/interfaces/coefficient";

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
      return jsonFail(API_ERRORS.NF_USER);
    }

    // Info: (20260312 - Julian) 取得建立者
    const creator = await webAuthnRepo.findUserByAddress(sessionUser.address);

    if (!creator) {
      console.error("Creator not found");
      return jsonFail(API_ERRORS.NF_USER);
    }

    // Info: (20260312 - Julian) 取得帳簿
    const { account_book_id: accountBookId, coefficient_id: coefficientId } =
      await params;
    const accountBook = await accountBookRepo.getAccountBookById(accountBookId);

    if (!accountBook) {
      console.error("Accountbook not found");
      return jsonFail(API_ERRORS.NF_ACCOUNT_BOOK);
    }

    // Info: (20260414 - Julian) 取得係數
    const coefficient = await esgRepo.getEsgCoefficientById(coefficientId);

    if (!coefficient) {
      console.error("Coefficient not found");
      return jsonFail(API_ERRORS.NF_COEFFICIENT);
    }

    return jsonOk(coefficient);
  } catch (error) {
    console.error("Error fetching coefficient:", error);
    return jsonFail({
      code: "IN000099",
      message: "Failed to fetch coefficient",
      status: ApiCode.INTERNAL_SERVER_ERROR,
    });
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
      return jsonFail(API_ERRORS.NF_USER);
    }

    // Info: (20260312 - Julian) 取得帳簿
    const { account_book_id: accountBookId, coefficient_id: coefficientId } =
      await params;
    const accountBook = await accountBookRepo.getAccountBookById(accountBookId);

    if (!accountBook) {
      console.error("Accountbook not found");
      return jsonFail(API_ERRORS.NF_ACCOUNT_BOOK);
    }

    // Info: (20260414 - Julian) 取得 body
    const body = await request.json();
    const { input }: { input: ICoefficientInput } = body;

    // Info: (20260414 - Julian) 驗證 coefficient 參數
    if (!input || !input.name) {
      console.error("Missing coefficient or coefficient name");
      return jsonFail({
        code: "VA000099",
        message: "Coefficient is required",
        status: ApiCode.VALIDATION_ERROR,
      });
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
      return jsonFail(API_ERRORS.NF_COEFFICIENT);
    }

    return jsonOk({ updatedCoefficientId: updatedCoefficient.newId });
  } catch (error) {
    console.error("Error updating coefficient:", error);
    return jsonFail({
      code: "IN000099",
      message: "Failed to update coefficient",
      status: ApiCode.INTERNAL_SERVER_ERROR,
    });
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
      return jsonFail(API_ERRORS.NF_USER);
    }

    const deleter = await webAuthnRepo.findUserByAddress(sessionUser.address);

    if (!deleter) {
      console.error("Deleter not found");
      return jsonFail(API_ERRORS.NF_USER);
    }

    const { account_book_id: accountBookId, coefficient_id: coefficientId } =
      await params;
    const accountBook = await accountBookRepo.getAccountBookById(accountBookId);

    if (!accountBook) {
      console.error("Accountbook not found");
      return jsonFail(API_ERRORS.NF_ACCOUNT_BOOK);
    }

    const deletedCoefficient =
      await esgRepo.deleteEsgCoefficient(coefficientId);

    if (!deletedCoefficient) {
      console.error("Coefficient not found");
      return jsonFail(API_ERRORS.NF_COEFFICIENT);
    }

    return jsonOk({ deletedCoefficientId: deletedCoefficient.id });
  } catch (error) {
    console.error("Delete coefficient failed", error);
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
