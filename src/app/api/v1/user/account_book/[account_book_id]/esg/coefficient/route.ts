import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { webAuthnRepo } from "@/repositories/webauthn.repo";
import { accountBookRepo } from "@/repositories/account_book.repo";
import { esgRepo } from "@/repositories/esg.repo";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { CoefficientCategory, ICoefficient } from "@/interfaces/coefficient";

/**
 * Info: (20260413 - Julian) 新增自訂係數
 * POST /api/v1/user/account_book/:account_book_id/esg/coefficient
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

    // Info: (20260312 - Julian) 取得建立者
    const creator = await webAuthnRepo.findUserByAddress(sessionUser.address);

    if (!creator) {
      console.error("Creator not found");
      return jsonFail(ApiCode.NOT_FOUND, "Creator not found");
    }

    // Info: (20260312 - Julian) 取得帳簿
    const { account_book_id: accountBookId } = await params;
    const accountBook = await accountBookRepo.getAccountBookById(accountBookId);

    if (!accountBook) {
      console.error("Accountbook not found");
      return jsonFail(ApiCode.NOT_FOUND, "Accountbook not found");
    }

    // Info: (20260413 - Julian) 新增自訂公式
    const body = await request.json();
    const { coefficient } = body;

    // Info: (20260413 - Julian) 驗證 coefficient 參數
    if (!coefficient || !coefficient.name) {
      console.error("Missing coefficient or coefficient name");
      return jsonFail(ApiCode.VALIDATION_ERROR, "Coefficient is required");
    }

    // Info: (20260413 - Julian) 建立自訂公式
    const newCoefficient = await esgRepo.createEsgCoefficient({
      name: coefficient.name,
      description: coefficient.description,
      emissionFactor: coefficient.emissionFactor,
      unit: coefficient.unit,
      source: coefficient.source,
      accountBook: { connect: { id: accountBook.id } },
    });

    return jsonOk({ coefficientId: newCoefficient.id });
  } catch (error) {
    console.error("Error creating esg coefficient:", error);
    return jsonFail(
      ApiCode.INTERNAL_SERVER_ERROR,
      "Failed to create esg coefficient",
    );
  }
}

/**
 * Info: (20260312 - Julian) 取得全部或指定範圍的自訂公式
 * GET /api/v1/user/account_book/:account_book_id/esg/coefficient
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
      return jsonFail(ApiCode.NOT_FOUND, "User not found");
    }

    // Info: (20260312 - Julian) 取得帳簿
    const { account_book_id: accountBookId } = await params;
    const accountBook = await accountBookRepo.getAccountBookById(accountBookId);

    if (!accountBook) {
      console.error("Accountbook not found");
      return jsonFail(ApiCode.NOT_FOUND, "Accountbook not found");
    }

    // Info: (20260312 - Julian) 取得 ESG 紀錄
    const { searchParams } = new URL(request.url);
    const searchParam = searchParams.get("search");
    const page = searchParams.get("page")
      ? parseInt(searchParams.get("page")!)
      : undefined;
    const pageSize = searchParams.get("pageSize")
      ? parseInt(searchParams.get("pageSize")!)
      : undefined;

    const coefficients = await esgRepo.getEsgCoefficients({
      where: {
        accountBookId: accountBook.id,
        // Info: (20260413 - Julian) 排除已刪除的係數
        deletedAt: null,
        // Info: (20260413 - Julian) 搜尋字串過濾邏輯
        ...(searchParam
          ? {
              OR: [
                { name: { contains: searchParam, mode: "insensitive" } },
                { description: { contains: searchParam, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      // Info: (20260413 - Julian) 分頁邏輯
      ...(page && pageSize
        ? { skip: (page - 1) * pageSize, take: pageSize }
        : {}),
      // Info: (20260413 - Julian) 排序邏輯
      orderBy: { accountBook: { id: "asc" }, createdAt: "desc" },
    });

    const result: ICoefficient[] = coefficients.map((coefficient) => ({
      id: coefficient.id,
      name: coefficient.name,
      description: coefficient.description,
      emissionFactor: Number(coefficient.emissionFactor),
      unit: coefficient.unit,
      source: coefficient.source,
      category: !!accountBookId
        ? CoefficientCategory.CUSTOM
        : CoefficientCategory.STANDARD,
      createdAt: new Date(coefficient.createdAt).getTime() / 1000,
      updatedAt: new Date(coefficient.updatedAt).getTime() / 1000,
    }));

    return jsonOk(result);
  } catch (error) {
    console.error("Error fetching esg coefficients:", error);
    return jsonFail(
      ApiCode.INTERNAL_SERVER_ERROR,
      "Failed to fetch esg coefficients",
    );
  }
}
