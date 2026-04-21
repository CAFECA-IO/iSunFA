import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { accountBookRepo } from "@/repositories/account_book.repo";
import { esgRepo } from "@/repositories/esg.repo";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { EsgScope } from "@/interfaces/esg";

/**
 * Info: (20260420 - Julian) 取得排放源清單
 * GET /api/v1/user/account_book/:account_book_id/esg/emission_sources
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ account_book_id: string }> },
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
    const { account_book_id: accountBookId } = await params;
    const accountBook = await accountBookRepo.getAccountBookById(accountBookId);

    if (!accountBook) {
      console.error("Accountbook not found");
      return jsonFail(API_ERRORS.NF_ACCOUNT_BOOK);
    }

    // Info: (20260420 - Julian) 解析 Query Parameters
    const { searchParams } = new URL(request.url);
    const scopeParam = searchParams.get("scope") as EsgScope | null;
    const keyword = searchParams.get("keyword")?.toLowerCase() || "";

    // Info: (20260421 - Julian) 預設取得 Scope 1
    const activeScope = scopeParam || EsgScope.SCOPE_1;

    // Info: (20260421 - Julian) 取得排放源清單
    const result = await esgRepo.getEsgEmissionSources(accountBookId, activeScope, keyword);

    return jsonOk(result);
  } catch (error) {
    console.error("Error fetching esg emission sources:", error);
    return jsonFail({ code: "IN000099", message: "Failed to fetch esg emissio...", status: ApiCode.INTERNAL_SERVER_ERROR },  );
  }
}

/**
 * Info: (20260421 - Julian) 建立排放源
 * POST /api/v1/user/account_book/:account_book_id/esg/emission_sources
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ account_book_id: string }> },
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
    const { account_book_id: accountBookId } = await params;
    const accountBook = await accountBookRepo.getAccountBookById(accountBookId);

    if (!accountBook) {
      console.error("Accountbook not found");
      return jsonFail(ApiCode.NOT_FOUND, "Accountbook not found");
    }

    // Info: (20260421 - Julian) 解析 Request Body
    const body = await request.json();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { name, source, ef } = body;

    // Info: (20260421 - Julian) 建立排放源
    const result = null
    // await esgRepo.createEsgEmissionSource(accountBookId, name, source, ef);

    return jsonOk(result);
  } catch (error) {
    console.error("Error creating esg emission source:", error);
    return jsonFail(
      ApiCode.INTERNAL_SERVER_ERROR,
      "Failed to create esg emission source",
    );
  }
}