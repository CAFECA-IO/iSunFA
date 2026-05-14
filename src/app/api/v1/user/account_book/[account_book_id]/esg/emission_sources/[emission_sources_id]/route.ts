import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { accountBookRepo } from "@/repositories/account_book.repo";
import { esgRepo } from "@/repositories/esg.repo";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { IEmissionSourcesInput } from "@/interfaces/emission_sources";

/**
 * Info: (20260430 - Julian) 取得單一排放源
 * GET /api/v1/user/account_book/:account_book_id/esg/emission_sources/:emission_sources_id
 */
export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ account_book_id: string; emission_sources_id: string }>;
  },
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
    const {
      account_book_id: accountBookId,
      emission_sources_id: emissionSourcesId,
    } = await params;
    const accountBook = await accountBookRepo.getAccountBookById(accountBookId);

    if (!accountBook) {
      console.error("Accountbook not found");
      return jsonFail(API_ERRORS.NF_ACCOUNT_BOOK);
    }

    // Info: (20260430 - Julian) 取得排放源
    const emissionSources =
      await esgRepo.getEsgEmissionSourcesById(emissionSourcesId);

    if (!emissionSources) {
      console.error("Emission sources not found");
      return jsonFail(API_ERRORS.NF_ESG);
    }

    return jsonOk(emissionSources);
  } catch (error) {
    console.error("Error fetching emission sources:", error);
    return jsonFail(API_ERRORS.IN_FAILED_TO_FETCH_EMISSION_SOURC);
  }
}

/**
 * Info: (20260430 - Julian) 編輯單一排放源
 * PUT /api/v1/user/account_book/:account_book_id/esg/emission_sources/:emission_sources_id
 */
export async function PUT(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ account_book_id: string; emission_sources_id: string }>;
  },
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
    const {
      account_book_id: accountBookId,
      emission_sources_id: emissionSourcesId,
    } = await params;
    const accountBook = await accountBookRepo.getAccountBookById(accountBookId);

    if (!accountBook) {
      console.error("Accountbook not found");
      return jsonFail(API_ERRORS.NF_ACCOUNT_BOOK);
    }

    // Info: (20260430 - Julian) 取得 body
    const body = await request.json();
    const { input }: { input: IEmissionSourcesInput } = body;

    // Info: (20260430 - Julian) 驗證排放源參數
    if (!input || !input.name) {
      console.error("Missing emission sources or emission sources name");
      return jsonFail(API_ERRORS.VA_EMISSION_SOURCES_IS_REQUIRED);
    }

    // Info: (20260430 - Julian) 更新排放源
    const updatedEmissionSources = await esgRepo.updateEsgEmissionSources(
      emissionSourcesId,
      { name: input.name, address: input.address },
    );

    if (!updatedEmissionSources) {
      console.error("Emission sources not found");
      return jsonFail(API_ERRORS.NF_ESG);
    }

    return jsonOk({ updatedEmissionSourcesId: updatedEmissionSources.id });
  } catch (error) {
    console.error("Error updating emission sources:", error);
    return jsonFail(API_ERRORS.IN_FAILED_TO_UPDATE_EMISSION_SOUR);
  }
}

/**
 * Info: (20260430 - Julian) 刪除單一排放源
 * DELETE /api/v1/user/account_book/:account_book_id/esg/emission_sources/:emission_sources_id
 */
export async function DELETE(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ account_book_id: string; emission_sources_id: string }>;
  },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) {
      console.error("User not found");
      return jsonFail(API_ERRORS.NF_USER);
    }

    const {
      account_book_id: accountBookId,
      emission_sources_id: emissionSourcesId,
    } = await params;
    const accountBook = await accountBookRepo.getAccountBookById(accountBookId);

    if (!accountBook) {
      console.error("Accountbook not found");
      return jsonFail(API_ERRORS.NF_ACCOUNT_BOOK);
    }

    const deletedEmissionSources =
      await esgRepo.deleteEsgEmissionSources(emissionSourcesId);

    if (!deletedEmissionSources) {
      console.error("Emission sources not found");
      return jsonFail(API_ERRORS.NF_ESG);
    }

    return jsonOk({ deletedEmissionSourcesId: deletedEmissionSources.id });
  } catch (error) {
    console.error("Delete emission sources failed", error);
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
