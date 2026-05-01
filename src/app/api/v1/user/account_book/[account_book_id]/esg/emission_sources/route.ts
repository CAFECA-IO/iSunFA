import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { accountBookRepo } from "@/repositories/account_book.repo";
import { esgRepo } from "@/repositories/esg.repo";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";

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
    const keyword = searchParams.get("keyword")?.toLowerCase() || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);

    // Info: (20260421 - Julian) 取得排放源清單
    const { data, meta } = await esgRepo.getEsgEmissionSources(
      accountBookId,
      keyword,
      page,
      pageSize,
    );
    const { total, totalPages } = meta;

    return jsonOk({ data, total, totalPages });
  } catch (error) {
    console.error("Error fetching esg emission sources:", error);
    return jsonFail({
      code: "IN000099",
      message: "Failed to fetch esg emission sources",
      status: ApiCode.INTERNAL_SERVER_ERROR,
    });
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
      return jsonFail(API_ERRORS.NF_USER);
    }

    // Info: (20260312 - Julian) 取得帳簿
    const { account_book_id: accountBookId } = await params;
    const accountBook = await accountBookRepo.getAccountBookById(accountBookId);

    if (!accountBook) {
      console.error("Accountbook not found");
      return jsonFail(API_ERRORS.NF_ACCOUNT_BOOK);
    }

    // Info: (20260424 - Julian) 解析 Request Body
    const body = await request.json();
    const { name, address } = body;

    if (!name) {
      return jsonFail({
        code: "VA000099",
        message: "Name is required",
        status: ApiCode.VALIDATION_ERROR,
      });
    }

    // Info: (20260424 - Julian) 建立排放源
    const result = await esgRepo.createEsgEmissionSources(
      accountBookId,
      name,
      address,
    );

    return jsonOk(result);
  } catch (error) {
    console.error("Error creating esg emission source:", error);
    return jsonFail({
      code: "IN000099",
      message: "Failed to create esg emission source",
      status: ApiCode.INTERNAL_SERVER_ERROR,
    });
  }
}
